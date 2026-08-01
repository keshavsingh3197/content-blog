using System.Text;
using System.Threading.RateLimiting;
using Blog.Admin.Api.Auth;
using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Services;
using KeshavSingh.Auth;
using KeshavSingh.Auth.Abstractions;
using KeshavSingh.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Hosting platforms (Render, Railway, Heroku…) inject the listen port via $PORT.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ---- Configuration (secrets come from user-secrets / env / Key Vault, never appsettings) ----
builder.Services.AddKeshavMongo(builder.Configuration);
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<EncryptionOptions>(builder.Configuration.GetSection(EncryptionOptions.Section));
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.Section));
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection(SmsOptions.Section));
builder.Services.Configure<SecurityOptions>(builder.Configuration.GetSection(SecurityOptions.Section));
builder.Services.Configure<MediaOptions>(builder.Configuration.GetSection(MediaOptions.Section));
builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection(SeedOptions.Section));

var jwtOptions = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();

// ---- Services ----
builder.Services.AddSingleton<MongoContext>();
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<TotpService>();
builder.Services.AddSingleton<DataProtector>();
builder.Services.AddSingleton<SettingsService>();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ISmsSender, TwilioSmsSender>();
builder.Services.AddScoped<AdminSeeder>();
builder.Services.AddHttpContextAccessor();

// ---- Shared auth engine (KeshavSingh.Auth) + this app's storage adapters ----
// MongoRefreshTokenStore/MongoAuditSink come from KeshavSingh.Core (shared with admin). This
// app doesn't enforce single-session-per-user, so the default (false) is used.
builder.Services.AddScoped<IAuthUserStore, MongoAuthUserStore>();
builder.Services.AddScoped<IRefreshTokenStore, MongoRefreshTokenStore>();
builder.Services.AddScoped<IAuthAuditSink, MongoAuditSink>();
builder.Services.AddSingleton<IAuthSettings>(sp => sp.GetRequiredService<SettingsService>());
builder.Services.AddKeshavAuthEngine();

// Behind Render's TLS-terminating proxy: honour X-Forwarded-* so the app sees the
// real client IP (rate limiting & audit) and the original https scheme (so the
// HTTPS redirect below doesn't loop).
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

builder.Services
    .AddControllers()
    // No local /api/auth controller: this app is a RESOURCE server. Authentication is centralized
    // at the identity provider (admin.keshavsingh.in). We only VALIDATE its tokens below.
    .AddJsonOptions(options =>
        // Accept/emit enums as their string names (e.g. "Totp") to match the UI.
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();

// ---- CORS: allow the SSO family — any keshavsingh.in subdomain (blog, git, admin, id, …)
// over https, plus localhost in dev. Credentialed, so this is a scoped predicate allowlist
// (never AllowAnyOrigin). New sibling apps work without touching this. ----
const string CorsPolicy = "AdminUi";
builder.Services.AddKeshavSsoCors(CorsPolicy);

// ---- Authentication: OAuth2 bearer (JWT) validated on every request ----
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // Keep "sub"/role claims verbatim.
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(string.IsNullOrWhiteSpace(jwtOptions.SigningKey)
                    ? new string('0', 32) // Placeholder; JwtService throws at startup if unset.
                    : jwtOptions.SigningKey)),
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });
builder.Services.AddAuthorization();

// ---- Rate limiting: stricter window on auth endpoints to blunt brute force ----
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

// ---- Swagger (dev only) with bearer support ----
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Blog Admin API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the JWT access token.",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference
            { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = Array.Empty<string>()
    });
});

var app = builder.Build();

// ---- Pipeline ----
app.UseForwardedHeaders(); // Must run before anything that reads scheme / client IP.
app.UseKeshavAuthExceptionHandling();

// Baseline security headers.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["Cross-Origin-Resource-Policy"] = "same-site";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // TLS is terminated at Render's edge (which also redirects http->https), so an
    // in-container HTTPS redirect is redundant and just warns about a missing port.
    // We still emit HSTS on responses.
    app.UseHsts();
}

app.UseCors(CorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ---- Startup init ----
using (var scope = app.Services.CreateScope())
{
    // Load/seed settings before anything that reads them. Identity is centralized at the IdP
    // (admin.keshavsingh.in), so this app no longer seeds or stores its own login users.
    await scope.ServiceProvider.GetRequiredService<SettingsService>().InitAsync();
}

app.Run();

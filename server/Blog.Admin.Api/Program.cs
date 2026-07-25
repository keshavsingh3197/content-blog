using System.Text;
using System.Threading.RateLimiting;
using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Middleware;
using Blog.Admin.Api.Security;
using Blog.Admin.Api.Services;
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
builder.Services.Configure<MongoOptions>(builder.Configuration.GetSection(MongoOptions.Section));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<EncryptionOptions>(builder.Configuration.GetSection(EncryptionOptions.Section));
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.Section));
builder.Services.Configure<SecurityOptions>(builder.Configuration.GetSection(SecurityOptions.Section));
builder.Services.Configure<MediaOptions>(builder.Configuration.GetSection(MediaOptions.Section));
builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection(SeedOptions.Section));

var corsOptions = builder.Configuration.GetSection(CorsOptions.Section).Get<CorsOptions>() ?? new CorsOptions();
var jwtOptions = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();

// ---- Services ----
builder.Services.AddSingleton<MongoContext>();
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<TotpService>();
builder.Services.AddSingleton<DataProtector>();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<AuditLogger>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AdminSeeder>();
builder.Services.AddHttpContextAccessor();

// Behind Render's TLS-terminating proxy: honour X-Forwarded-* so the app sees the
// real client IP (rate limiting & audit) and the original https scheme (so the
// HTTPS redirect below doesn't loop).
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ---- CORS: only the configured admin origins may call the API ----
const string CorsPolicy = "AdminUi";
builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
{
    if (corsOptions.AllowedOrigins.Length > 0)
        policy.WithOrigins(corsOptions.AllowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

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
app.UseMiddleware<ExceptionMiddleware>();

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

// ---- First-run admin seed ----
using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<AdminSeeder>().SeedAsync();
}

app.Run();

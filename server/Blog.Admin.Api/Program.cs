using System.Text;
using System.Threading.RateLimiting;
using Blog.Admin.Api.Configuration;
using Blog.Admin.Api.Data;
using Blog.Admin.Api.Routing;
using Blog.Admin.Api.Services;
using KeshavSingh.Auth;
using KeshavSingh.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Hosting platforms (Render, Railway, Heroku…) inject the listen port via $PORT.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ---- Configuration (secrets come from user-secrets / env / Key Vault, never appsettings) ----
builder.Services.AddKeshavMongo(builder.Configuration);
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<EncryptionOptions>(builder.Configuration.GetSection(EncryptionOptions.Section));
builder.Services.Configure<MediaOptions>(builder.Configuration.GetSection(MediaOptions.Section));

var jwtOptions = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();

// Fail fast: this API validates tokens signed by the identity provider, so a missing or defaulted
// signing key would let someone forge valid tokens (roles come straight from the token). Never fall
// back to a placeholder key — the app must not boot in that state.
if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey))
    throw new InvalidOperationException(
        "Jwt:SigningKey is not configured. It must match the identity provider's signing key. " +
        "Provide it via user-secrets, the Jwt__SigningKey environment variable, or Key Vault.");

// ---- Services ----
// Deliberately short. Identity is centralized at the provider, so there is no login engine, no
// user store, no password hasher, no token minting and no OTP delivery here — this app validates
// bearer tokens (below) and serves content.
builder.Services.AddSingleton<MongoContext>();
// Keyed digest of IP + user agent, used to count a reader once per page rather than once per refresh.
builder.Services.AddSingleton<VisitorKeyService>();

// Behind Render's TLS-terminating proxy: honour X-Forwarded-* so the app sees the real client IP
// (rate limiting and the visitor digest both key off it) and the original https scheme.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Accept only a single hop from Render's edge proxy. Render's proxy addresses are not a static,
    // enumerable range so we cannot pin KnownProxies; instead we limit the chain length so a client
    // cannot prepend an arbitrary list of "hops" to spoof its address past rate limiting / dedup.
    // NOTE: running with >1 upstream proxy would need KnownProxies set explicitly.
    o.ForwardLimit = 1;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

// Entity ids are Mongo ObjectIds, so `{id:objectid}` routes reject a malformed id at routing time
// (a clean 404) instead of letting it reach the driver and throw a FormatException.
builder.Services.Configure<RouteOptions>(o =>
    o.ConstraintMap["objectid"] = typeof(ObjectIdRouteConstraint));

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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            // The IdP mints a plain "role" claim ("sub"/"role" kept verbatim via MapInboundClaims=false),
            // so map role checks onto that claim. Without this, [Authorize(Roles = …)] and
            // User.IsInRole(…) default to the legacy ClaimTypes.Role URI that the IdP never emits.
            RoleClaimType = "role",
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

    // Posting a comment is a signed-in action, so partition by user rather than by address: one
    // approved account cannot flood a thread even from many addresses.
    options.AddPolicy("comments", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirst("sub")?.Value ?? context.User.Identity.Name ?? "authenticated"
            : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(5),
            QueueLimit = 0,
        }));

    // View tracking is anonymous and fires on every navigation, so the limit is generous — it is
    // there to blunt a script, not to ration ordinary reading.
    options.AddPolicy("page-views", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120,
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
    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document, null)] = []
    });
});

var app = builder.Build();

// ---- Pipeline ----
app.UseForwardedHeaders(); // Must run before anything that reads scheme / client IP.

// Unified error handling: map expected failures to clean JSON status codes instead of leaking
// bare 500s / stack traces, and wrap the rest into a generic 500 (fail closed, no internals).
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (MongoDB.Driver.MongoWriteException ex)
        when (ex.WriteError?.Category == MongoDB.Driver.ServerErrorCategory.DuplicateKey)
    {
        // A concurrent create raced the pre-check (or a reuse slipped through): surface as a
        // clean conflict rather than an unhandled duplicate-key 500.
        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(new { error = "That value is already in use." });
    }
    catch (InvalidOperationException) when (!app.Environment.IsDevelopment())
    {
        // e.g. malformed settings import. In development rethrow so the stack is visible.
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { error = "The request was not valid." });
    }
    catch (System.Text.Json.JsonException)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { error = "The request was not valid JSON." });
    }
    catch (FormatException)
    {
        // Safety net for a malformed identifier that reached a Mongo filter: ObjectId serialisation
        // throws FormatException. Controllers validate ids at the boundary and return 404, so this
        // only catches a path that forgot to — a bad request, not a server fault.
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new { error = "The request was not valid." });
    }
});

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

// ---- Liveness probe (anonymous): what the container platform's health check points at. It pings
// Mongo so a green check means this instance can reach its data store, not just that it is
// listening; an unreachable database reports 503 rather than a misleading OK. ----
app.MapGet("/health", async (MongoContext mongo, CancellationToken ct) =>
{
    try
    {
        await mongo.PingAsync(ct);
        return Results.Ok(new { status = "ok" });
    }
    catch (Exception)
    {
        return Results.Json(new { status = "degraded" },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}).AllowAnonymous();

app.Run();

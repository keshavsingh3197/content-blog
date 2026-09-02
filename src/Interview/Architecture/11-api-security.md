---
title: API Security
summary: Basic, client-credentials and JWT, authorization code with PKCE, OIDC, IAM, and API gateway policies.
tags: [Architecture, Security, OAuth, JWT, Interview]
updated: 2026-09-02
---

# API Security

> AuthN vs AuthZ, OAuth 2.0 grants, JWT/OIDC, IAM providers, ASP.NET Core setup, and API gateway security — protecting APIs in service-to-service and interactive scenarios.

## Authentication vs Authorization

- **Authentication (AuthN)**: *who are you?* — verifying identity (credentials, token, certificate).
- **Authorization (AuthZ)**: *what may you do?* — checking permissions (roles, scopes, policies, claims).
- AuthN comes first and produces a **principal** with claims; AuthZ evaluates it.

## Basic Auth (and why it's weak)

- Sends `Authorization: Basic base64(user:password)` on **every** request.
- **Base64 is encoding, not encryption** — trivially reversible; safe only over TLS.
- No expiry, no scopes, no revocation; credentials replayed constantly. Fine for internal/dev tooling, not public APIs. Prefer token-based auth.

## OAuth 2.0 Grant Types

OAuth 2.0 is a **delegated authorization** framework issuing **access tokens**. Key roles: resource owner, client, authorization server, resource server.

| Grant | Use | Notes |
|-------|-----|-------|
| **Authorization Code + PKCE** | interactive (web/SPA/mobile) | The standard flow for users; PKCE mandatory |
| **Client Credentials** | service-to-service (no user) | App authenticates as itself |
| Refresh Token | renew access token silently | Long-lived, revocable |
| Device Code | input-constrained (TVs, CLI) | User approves on another device |
| ~~Implicit~~ / ~~ROPC~~ | **deprecated** | Removed in OAuth 2.1 — don't use |

### Client Credentials (service-to-service)

```http
POST /token
grant_type=client_credentials
&client_id=svc-orders
&client_secret=...            (or client_assertion = signed JWT)
&scope=inventory.read
```

- No user context; the client is the identity. Prefer certificate/managed-identity over shared secrets.

### Authorization Code + PKCE (interactive)

1. Client redirects user to authorization server with `code_challenge` (hash of a random `code_verifier`).
2. User authenticates/consents; server returns a short-lived **authorization code**.
3. Client exchanges code **+ `code_verifier`** for tokens at the token endpoint.

**PKCE** (Proof Key for Code Exchange) stops intercepted-code attacks — now required for all clients, not just public ones. Never put tokens in the URL/implicit flow.

## JWT (JSON Web Token)

Three base64url parts separated by dots: `header.payload.signature`.

```json
// header                // payload (claims)
{ "alg":"RS256",         { "iss":"https://login.acme.com",
  "typ":"JWT",             "aud":"orders-api",
  "kid":"abc" }            "sub":"user-123",
                           "scope":"orders.read",
                           "exp":1730000000, "iat":1729996400 }
```

- **Signature** = sign(header + payload) with a secret (**HS256**) or private key (**RS256/ES256**). The API verifies with the shared secret or the issuer's public key (fetched from JWKS via `kid`).
- **Validation** — always check **signature, `iss` (issuer), `aud` (audience), `exp`/`nbf` (lifetime)**, and algorithm.
- **Expiry/refresh**: keep access tokens short-lived (minutes); use a **refresh token** to get new ones. JWTs are self-contained and hard to revoke early — use short expiry + a revocation/deny list or reference tokens.
- **Common pitfalls**:
  - **`alg: none`** — accepting unsigned tokens (classic bypass). Pin allowed algorithms.
  - Not validating **audience/issuer** → tokens from another app/tenant accepted.
  - Trusting `alg` from the token to pick the key (HS/RS confusion attack).
  - Storing sensitive data in the (readable) payload; putting JWTs in `localStorage` (XSS).

## OpenID Connect (OIDC)

- **OIDC = authentication layer on top of OAuth 2.0**. OAuth authorizes; OIDC adds **identity**.
- Adds the **ID token** (a JWT about *who the user is*) and the `/userinfo` endpoint, discovery (`.well-known/openid-configuration`).

| Token | Purpose | Audience |
|-------|---------|----------|
| **ID token** | prove user identity to the **client** | the client app |
| **Access token** | authorize calls to an **API** | the resource server |

- Don't send ID tokens to APIs; don't use access tokens to identify the end user in the client.

## IAM Integration

- **Microsoft Entra ID** (formerly Azure AD) — enterprise IdP; managed identities for Azure service-to-service.
- **Auth0**, **Okta** — SaaS identity platforms.
- **Keycloak** — open-source, self-hosted OAuth/OIDC server.
- All expose standard OIDC discovery + JWKS, so ASP.NET Core integration is largely config (authority + audience).

## ASP.NET Core Setup

```c#
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = "https://login.microsoftonline.com/<tenant>/v2.0"; // gets JWKS/metadata
        o.Audience  = "api://orders";
        o.TokenValidationParameters = new()
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidAlgorithms = ["RS256"]   // never allow "none"
        };
    });

builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("CanReadOrders", p => p.RequireClaim("scope", "orders.read"));
    o.AddPolicy("Admin", p => p.RequireRole("admin"));
});

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/orders", () => Results.Ok())
   .RequireAuthorization("CanReadOrders");
```

- Prefer **policy-based** authorization (claims/requirements) over scattered role strings.

## API Gateway Security

A gateway centralizes cross-cutting security so services stay focused:

- **Auth offload**: validate JWT/keys at the edge; pass a trimmed identity downstream (auth "termination").
- **mTLS**: mutual TLS between clients/gateway/services — both sides present certificates (zero-trust, service mesh).
- **Throttling / quota**: rate limits per client/subscription; **429** with `Retry-After`.
- **IP allow/deny lists** and geo-filtering.
- **WAF** (Web Application Firewall): blocks OWASP Top 10 (SQLi, XSS) at the edge.
- **Traffic policies**: request/response transforms, header injection, caching, circuit breaking, canary routing.
- **Developer portal**: self-service API keys, docs (OpenAPI), subscription plans, usage analytics.

### Commercial Gateways

| Gateway | Notes |
|---------|-------|
| **Azure API Management (APIM)** | Policies as XML (inbound/outbound/backend), products/subscriptions, dev portal, `validate-jwt` policy |
| **AWS API Gateway** | Lambda/JWT/Cognito authorizers, usage plans + API keys, WAF integration |
| **Apigee** (Google) | Policy-rich, analytics, monetization |
| **Kong** | Plugin-based (OSS + enterprise), OIDC/rate-limit/mTLS plugins |

```xml
<!-- Azure APIM inbound policy: validate JWT, then rate-limit -->
<inbound>
  <validate-jwt header-name="Authorization" require-scheme="Bearer">
    <openid-config url="https://login.microsoftonline.com/<tenant>/v2.0/.well-known/openid-configuration" />
    <audiences><audience>api://orders</audience></audiences>
  </validate-jwt>
  <rate-limit-by-key calls="100" renewal-period="60" counter-key="@(context.Subscription.Id)" />
</inbound>
```

## Interview Q&A

**Q: Authentication vs authorization?**
A: Authentication verifies identity (who you are); authorization decides what that identity is permitted to do. AuthN produces claims; AuthZ evaluates them.

**Q: Why is Basic Auth considered weak?**
A: It sends base64-encoded (not encrypted) credentials on every request with no expiry, scopes, or revocation, so it depends entirely on TLS and is highly replayable.

**Q: When Client Credentials vs Authorization Code + PKCE?**
A: Client Credentials for service-to-service where no user is present (the app is the identity); Authorization Code + PKCE for interactive user sign-in on web/SPA/mobile.

**Q: What does PKCE protect against?**
A: Interception of the authorization code — the client proves possession of the original `code_verifier` matching the `code_challenge`, so a stolen code alone is useless.

**Q: How do you validate a JWT and what are common pitfalls?**
A: Verify signature and check issuer, audience, and expiry with a pinned algorithm. Pitfalls: accepting `alg:none`, skipping audience/issuer checks, HS/RS key-confusion, and long-lived tokens with no revocation.

**Q: ID token vs access token in OIDC?**
A: The ID token proves the user's identity to the client app; the access token authorizes calls to an API. Don't send ID tokens to APIs or use access tokens to identify the user in the UI.

**Q: What security responsibilities belong at the API gateway?**
A: Auth/JWT validation offload, mTLS, rate limiting/quotas, IP allow-lists, WAF, and traffic policies (transforms, caching, circuit breaking) — plus a developer portal for keys and docs.

**Q: How is authorization best expressed in ASP.NET Core?**
A: Policy-based authorization with requirements/claims/scopes registered via `AddAuthorization` and applied with `RequireAuthorization`, rather than scattering role string checks.

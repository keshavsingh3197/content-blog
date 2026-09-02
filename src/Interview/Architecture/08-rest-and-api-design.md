# REST & API Design

> REST constraints, correct verbs/status codes, versioning, pagination, OpenAPI, contract-first, mocking and error handling — designing HTTP APIs that scale and last.

## REST Constraints

REST is an architectural style; a truly RESTful API satisfies:

- **Client–server**: separation of concerns.
- **Statelessness**: each request carries all context (e.g. a token); no server-side session. Enables horizontal scale.
- **Cacheability**: responses declare themselves cacheable (`Cache-Control`, `ETag`, `Last-Modified`).
- **Uniform interface**: resources identified by URIs, manipulated via representations, self-descriptive messages.
- **Layered system**: proxies/gateways/LBs are transparent.
- **HATEOAS** (Hypermedia As The Engine Of Application State): responses embed links to next actions. The highest, least-adopted maturity level (Richardson Level 3).

## Resource Modelling, Verbs & Status Codes

- Model **nouns**, not verbs: `/orders/42/lines`, not `/getOrderLines`.
- Use plural collections; nest for containment; avoid deep nesting (> 2 levels).

| Verb | Purpose | Safe | Idempotent | Typical success |
|------|---------|------|-----------|-----------------|
| GET | read | yes | yes | 200 |
| POST | create / action | no | no | 201 (+`Location`), 200 |
| PUT | full replace/upsert | no | yes | 200 / 204 |
| PATCH | partial update | no | no* | 200 / 204 |
| DELETE | remove | no | yes | 204 |

**Key status codes**: 200 OK, 201 Created, 202 Accepted (async), 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 412 Precondition Failed, 422 Unprocessable Entity, 429 Too Many Requests, 500, 503.

## Idempotency & Safety

- **Safe** = no state change (GET, HEAD, OPTIONS).
- **Idempotent** = same effect if repeated (GET, PUT, DELETE). POST is not — protect create endpoints with an **`Idempotency-Key`** header so retries don't duplicate.
- Use **`ETag` + `If-Match`** for optimistic concurrency (avoids lost updates → 412).

## Versioning

| Strategy | Example | Trade-off |
|----------|---------|-----------|
| **URL path** | `/v2/orders` | Simplest, visible, cache-friendly; "un-RESTful" (URI changes for same resource) |
| **Query string** | `/orders?api-version=2` | Easy; easy to forget/default |
| **Header** | `Api-Version: 2` | Clean URLs; harder to test/discover |
| **Media type** | `Accept: application/vnd.acme.v2+json` | Purest (content negotiation); most complex |

- Prefer additive, backward-compatible changes; version only on breaking changes. `Asp.Versioning.*` packages support all of the above.

## Pagination

- **Offset/limit**: `?page=3&size=20` (or `OFFSET/FETCH`). Simple, jumpable, but slow on deep pages and unstable when data shifts.
- **Cursor / keyset**: `?after=<opaque-cursor>&size=20` — filter on the last seen sorted key. Stable and fast for infinite scroll / large sets.

```sql
-- Keyset: rows after the last seen (Id, CreatedAt)
SELECT TOP (20) * FROM Orders
WHERE (CreatedAt, Id) < (@lastCreatedAt, @lastId)
ORDER BY CreatedAt DESC, Id DESC;
```

## OpenAPI (OAS) & Contract-First vs Code-First

- **OpenAPI Specification (OAS 3.x)** — machine-readable YAML/JSON contract; **Swagger** is the tooling ecosystem (UI, editor, codegen) around it.
- **.NET 10 / ASP.NET Core** ships built-in OpenAPI generation via `AddOpenApi()` / `MapOpenApi()` (the `Microsoft.AspNetCore.OpenApi` package). Swashbuckle is no longer the default template.

**Code-first**: write C#, generate the spec. Fast; risk of the contract being an afterthought.
**Contract-first**: author the OAS document first, agree it with consumers, then generate/implement. Better for parallel teams, stable public APIs, and governance.

**Code generation** from a spec:
- **NSwag** — generates C# clients and TypeScript.
- **Kiota** (Microsoft) — polyglot, spec-first API clients.
- **Swagger Codegen / OpenAPI Generator** — many server stubs and client languages.

## Mocking / Stubbing APIs

- **Prism** (Stoplight) — spins up a mock server directly from an OpenAPI file (contract-based).
- **WireMock.NET** — programmable in-process HTTP stub for integration tests (request matching, fault/latency injection).
- **`Microsoft.AspNetCore.Mvc.Testing`** (`WebApplicationFactory<T>`) — in-memory host to test your own API end-to-end without a network.

## Error Handling — ProblemDetails (RFC 9457)

Return machine-readable errors as `application/problem+json` (RFC 9457 obsoletes RFC 7807):

```json
{
  "type": "https://acme.com/errors/out-of-stock",
  "title": "Out of stock",
  "status": 409,
  "detail": "SKU-123 has 0 units available.",
  "instance": "/orders/42"
}
```

```c#
builder.Services.AddProblemDetails();
app.UseExceptionHandler();   // unhandled -> ProblemDetails
```

## Rate Limiting

ASP.NET Core has built-in rate limiting middleware (fixed/sliding window, token bucket, concurrency):

```c#
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddFixedWindowLimiter("api", w => { w.PermitLimit = 100; w.Window = TimeSpan.FromMinutes(1); });
});
app.UseRateLimiter();
```

- Signal limits with `Retry-After` and (optionally) `RateLimit-*` headers.

## Minimal API Example (ASP.NET Core 10)

```c#
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
var app = builder.Build();

app.MapOpenApi();                       // /openapi/v1.json
app.UseExceptionHandler();
app.UseRateLimiter();

var orders = app.MapGroup("/v1/orders");

orders.MapGet("/{id:int}", (int id, IOrderStore s) =>
    s.Find(id) is { } o ? Results.Ok(o) : Results.NotFound())
    .WithName("GetOrder");

orders.MapPost("/", (CreateOrder cmd, IOrderStore s) =>
{
    var o = s.Add(cmd);
    return Results.CreatedAtRoute("GetOrder", new { id = o.Id }, o);  // 201 + Location
}).RequireRateLimiting("api");

app.Run();
```

## Interview Q&A

**Q: What makes an API "stateless" and why does it matter?**
A: Each request carries all context (auth token, params) and the server keeps no session; any node can serve any request, enabling horizontal scale and simpler failover.

**Q: PUT vs PATCH vs POST?**
A: PUT fully replaces a resource and is idempotent; PATCH applies a partial change (not inherently idempotent); POST creates or triggers actions and is neither safe nor idempotent.

**Q: How do you make a POST create endpoint safe to retry?**
A: Accept an `Idempotency-Key`; store the key with the created resource and return the same result on repeat, so retries don't create duplicates.

**Q: Offset vs cursor pagination?**
A: Offset is simple and allows jumping to a page but degrades on deep pages and is unstable when rows are inserted/deleted; cursor/keyset paginates from the last seen sorted key — stable and fast, but no random page access.

**Q: Contract-first vs code-first — when contract-first?**
A: When multiple teams build against the API in parallel, for public/governed APIs, or when you want the OpenAPI document to be the reviewed source of truth before code exists.

**Q: Which versioning strategy and why?**
A: URL path versioning is most common (visible, cache-friendly, easy to test); media-type versioning is purest but complex. Version only on breaking changes and keep changes additive.

**Q: How do you return standardized errors?**
A: Use ProblemDetails (RFC 9457) `application/problem+json` with `type/title/status/detail/instance`; enable `AddProblemDetails()` + `UseExceptionHandler()`.

**Q: How would you mock a dependency API for testing?**
A: Prism for contract-based mocks from an OpenAPI file, WireMock.NET for programmable stubs with fault injection, and `WebApplicationFactory` for in-memory testing of your own service.

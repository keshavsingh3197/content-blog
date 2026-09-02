# Code Review — content-blog

Date: 2026-09-02 · Branch: `FIX_DEP_ISSUE`

**Scope:** the whole repository, read file by file — the Angular public blog (`ng-src/`), the Angular
admin console (`ng-src/app/admin/`), the .NET 10 resource API (`server/Blog.Admin.Api/`), the content
pipeline (`generate_structure.py`, `structure.json`), build/CI/deploy (`angular.json`,
`.github/workflows/deploy.yml`, `server/Dockerfile`), the seed scripts (`server/scripts/`) and the
repo's own documentation.

**Out of scope:** the private `KeshavSingh.*` / `@keshavsingh3197/*` packages — they are external
dependencies with their own repos. Where this repo *relies* on a guarantee that lives in a package
(SSO cookie handling, `AddKeshavSsoCors`, `PasswordHasher`), the reliance is noted but the package
code is not reviewed. The teaching samples in `code/` are article material, not production code, and
are reviewed only for repo hygiene.

**Severity guide:** **Critical** (exploitable now / data loss) · **High** (real security gap, or a
feature that does not do what it says) · **Medium** (should fix) · **Low** (polish, hygiene, drift).
Each finding is also tagged by kind — *Security · Correctness · Data · Ops · Quality* — because
several of the biggest items here are structural rather than exploitable.

---

## Verdict

The security *thinking* in this codebase is well above average for a personal project, and it shows
in specifics rather than slogans: a single anchored allowlist for every caller-supplied content path,
view de-duplication enforced by a unique index instead of by trusting the browser, an access token
that never touches `localStorage`, partial unique indexes so a soft delete does not permanently burn
an email address, magic-byte verification behind the upload MIME allowlist, `\r\n` stripped from
everything that reaches a log line, and a fail-fast on a missing JWT signing key. There is **not one
`innerHTML`, `bypassSecurityTrust*`, `eval`, or `document.write` in the entire frontend** — every
piece of user or remote text is bound through interpolation or through ngx-markdown's default
DOMPurify sanitisation. That is the hard part, and it is done.

The problems are almost all consequences of **one incomplete migration**. Identity moved out to
`admin.keshavsingh.in`, and roughly a third of the backend was left behind: a second user store with
password hashes, a login engine with no endpoints, three OTP senders nothing can call, and a
dashboard tile that counts rows in the abandoned collection. Alongside it sits a second, older
split — the admin console edits content in MongoDB while the public site reads markdown from `src/`
— which means the console's "Published — visible on the blog" switch does nothing at all.

Two things are worth fixing this week: the unvalidated `?path=` parameter (H-1) and the
client-controlled visitor key (H-3). Everything else is debt, drift, or documentation.

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 4 |
| Medium | 10 |
| Low | 21 |

---

## Remediation status

Updated 2026-09-02, after the first pass of fixes on `FIX_DEP_ISSUE`. The findings below are left
as written — this table is the only place that records what has since changed.

| # | Status | What was done |
| --- | --- | --- |
| H-1 | **Fixed** | `ng-src/app/services/content-path.ts` mirrors the API's `ContentPath` predicate; applied in `content-view` (document) and `folder-view` (folder), and again inside `ContentService.getFile` as defence in depth |
| H-2 | **Fixed in code** | The whole stack is deleted: `UsersController`, `SettingsController`, `MongoAuthUserStore`, the three senders, `Models/User.cs`, `Models/AppSettings.cs`, `SettingsService`, `SettingsRefreshService`, `SettingsDtos`, `server/scripts/`, the `users`/`audit`/`refresh_tokens`/`settings` collections, the `Email`/`Sms`/`Security`/`SettingsRefresh` options and appsettings sections, the `QRCoder` and `KeshavSingh.Realtime` package references, and the dead `AdminApiService` / `AuthService` / `admin.models.ts` surface. **Not yet done: dropping those four collections in MongoDB** — the code no longer reads them, but the password hashes, phone numbers and TOTP secrets stay in the database until they are deleted there |
| H-3 | **Fixed** | `VisitorKeyService` uses `Connection.RemoteIpAddress` only; the `X-Forwarded-For` read is gone |
| H-4 | **Fixed** | `GET /health` added, pings Mongo via `MongoContext.PingAsync` and answers 503 when it cannot; `AGENTS.md` now states there is no `render.yaml` |
| M-1 | **Fixed** | Public `/api/links` projects to `LinkDto`; the management branch (`?all=true`, role-gated) still returns the full document |
| M-2 | **Fixed** | `UserId` dropped from `CommentDto` and from the TS `Comment` model; `ModeratedCommentDto` keeps it |
| M-3 | **Fixed** | `{id:objectid}` route constraint (`Routing/ObjectIdRouteConstraint.cs`) on every entity route, plus a `FormatException` safety net in the error middleware |
| M-4 | **Fixed** | `deploy.yml` gained an `api` job running `dotnet build -c Release` with the same private-feed token fallback |
| M-5 | **Partly fixed** | The toggle no longer claims to publish to the blog. The underlying two-store split is unchanged — that is still a decision to make |
| M-6 | **Fixed** | `Security/SmsSender.cs` is deleted, so nothing logs a provider body any more |
| M-7 | **Fixed** | SVG off the upload allowlist (`appsettings.json`, `MediaOptions`, `MediaController.ExtByType`), magic-byte check now has no exemption, admin copy updated, and the CSP line is annotated as the control for already-stored SVGs |
| M-8 | **Fixed** | `ThemeService` reads and writes `localStorage` in try/catch |
| M-9 | **Fixed** | `SettingsService` is deleted — no clobbering race and no secret-ciphertext export left to fix |
| M-10 | **Fixed** | `ContentPath.TryNormalizeFilter` + `ToFilterPattern` accept a folder and match it with an escaped, anchored regex; placeholder updated |
| L-1 | **Fixed** | Both components inject `ADMIN_APP_URL` |
| L-3 | **Fixed** | Dead `Cors` section removed from `appsettings.json` |
| L-5 | **Fixed** | Both `nuget.config` copies cross-reference each other |
| L-6, L-7 | **Fixed** | `rewriteImagePaths` routes through `mapOutsideCode`, which now tracks the opening fence delimiter and its length |
| L-8 | **Fixed** | `generate_structure.py` derives the emitted prefix from the scanned directory |
| L-9 | **Fixed** | Watch-mode change detection uses `blake2b` |
| L-10 | **Fixed** | CI fails when the committed `structure.json` is stale |
| L-12 | **Fixed** | `I18nService` applies `dir` and `lang` to `<html>` in an effect |
| L-13 | **Fixed** | Signing out lands on `/`, not the login route that bounces to the IdP |
| L-14 | **Fixed** | `getStructure()` shares one request; a failure drops the handle so the next caller retries |
| L-16 | **Fixed** | `topRole()` picks by precedence, not insertion order |
| L-17 | **Not a defect** | The theme effect already returns early unless `mermaidReady`, which is reset per document |
| L-19 | **Fixed** | `App_Data/` is git-ignored |
| L-11, L-18, L-21 | **Open** | Each needs a decision or a value this pass could not produce: whether to run markdownlint in CI, what a Pages-safe CSP should allow, and the actual commit SHAs to pin the five actions to |
| §7 | **Fixed** | `readme.md`, `server/README.md`, `AGENTS.md`, `STRUCTURE_UPDATE.md` and the dashboard diagram now match the code. `server/README.md` was rewritten — it had documented a login flow this service does not implement |
| §8 | **Open** | Still no tests |

---

## 1 · Architecture as it actually is

```
                    ┌──────────────────────────────────────────┐
  reader ──────────▶│  GitHub Pages (git.keshavsingh.in)       │
                    │  one Angular 22 bundle, hash routing     │
                    │  ├── public blog   → src/*.md + structure.json (static assets)
                    │  └── /#/admin/*    → lazy ADMIN_ROUTES
                    └───────┬──────────────────────┬───────────┘
                            │ bearer               │ credentialed
                            ▼                      ▼
        ┌───────────────────────────┐   ┌──────────────────────────────┐
        │ Blog Admin API (Render)   │   │ Identity provider (id.…)     │
        │ net10.0 · validates only  │   │ mints tokens, owns accounts, │
        │ comments · page-stats ·   │   │ serves runtime config + i18n │
        │ media · links · content   │   └──────────────────────────────┘
        └───────────┬───────────────┘
                    ▼
             MongoDB (blog_admin)
```

Three facts about this shape are load-bearing and none of them is obvious from any single file:

**a. The public site is fully static, and the admin console does not feed it.** `ContentService`
fetches `structure.json` and then the raw markdown file as a build asset
(`angular.json` copies `src/` verbatim). `ContentController` writes `ContentTopic` documents into
Mongo. Nothing bridges them. Editing content in the console changes a database row that no reader
will ever see — see M-7.

**b. The API is a resource server with no authentication of its own.** `Program.cs` configures
`AddJwtBearer` only; there is no auth controller, and `AddKeshavAuthControllers()` — the package
method that would expose the shared `/api/auth` surface — is deliberately not called. Roles arrive in
the token's plain `role` claim (`MapInboundClaims = false`, `RoleClaimType = "role"`), so the role
strings and the signing key are cross-repo contracts: drift breaks authorization silently.

**c. Copy, branding and configuration are database rows, not build output.** `RuntimeConfigService`
and `I18nService` pull `GET {IDP}/api/config` and `/api/i18n/bundle/{locale}` at load. Both fail soft
with fallbacks, so the site renders when the IdP is down. This is a genuinely good decision and it is
applied consistently on the public side — and not at all on the admin side (L-1, L-2).

---

## 2 · Security design review

Mapped against the organisation's security baseline. This is what the code does, not what the
READMEs claim.

| Baseline concern | State | Evidence |
| --- | --- | --- |
| Secrets in source | **Pass** | `appsettings.json` ships empty `ConnectionString` / `SigningKey` / `DataKey` with `//` notes; tokens come from user-secrets, `Mongo__*` env vars or a Render secret file. `.npmrc` / `nuget.config` reference `%PACKAGES_READ_TOKEN%`. Nothing committed. |
| Fail-closed on missing secret | **Pass** | `Program.cs:34-41` throws rather than defaulting the signing key — the single most important line in the backend. `VisitorKeyService.cs:23-25` does the same for the data key. |
| Parameterised queries | **Pass** | Every query is a typed `Builders<T>` filter; the one regex search escapes its input (`ContentController.cs:37`). No string-concatenated queries anywhere. |
| Input validation at the boundary | **Mostly** | DataAnnotations on every request DTO; `ContentPath.TryNormalize` is a proper anchored allowlist with a length cap and an explicit traversal reject. **Gap:** no route id is validated as an ObjectId (M-3), and the browser's `?path=` is not validated at all (H-1). |
| Output encoding | **Pass** | No `innerHTML` in the codebase. Markdown goes through ngx-markdown's default `SecurityContext.HTML` (DOMPurify); comments are stored and rendered as plain text; `[href]`/`[style]` bindings are Angular-sanitised. |
| Default deny | **Pass** | Controllers are `[Authorize]` at class level with role gates on top; the four anonymous endpoints opt out explicitly and are individually justified in comments. |
| Record ownership (IDOR) | **Pass** | Comment edit/delete filter on `c.UserId == userId` *in the query*, not just in a pre-check, and return one indistinguishable 404 for "missing" and "not yours" (`CommentsController.cs:122`). |
| Authentication | **Pass, by delegation** | HS256 validation with issuer/audience/lifetime/30s skew. Token in memory only; single-flight silent refresh; one retry then fail closed to the IdP (`auth.interceptor.ts`). |
| Transport | **Pass** | HSTS in production, TLS terminated at Render's edge, `ForwardLimit = 1` so a client cannot prepend hops. |
| Error handling | **Pass** | Central middleware maps duplicate-key → 409, malformed JSON → 400, and swallows internals in production; `UseKeshavAuthExceptionHandling` layered behind it. No stack traces escape. |
| Logging hygiene | **Mostly** | Security events (ban refusals, moderator actions) logged with actor + timestamp, `\r`/`\n` stripped to prevent log injection, no comment text and no addresses. **Gap:** the Twilio error path logs a provider response body that echoes phone numbers (M-6). |
| Personal data minimisation | **Mixed** | The visitor key is a keyed HMAC with a 12-hour TTL — exemplary. Against that, the abandoned `users` collection retains password hashes and phone numbers for a login flow that no longer exists (H-2). |
| Rate limiting | **Pass** | Comment posting partitioned by `sub` (so one account cannot flood from many addresses), view tracking by IP at a deliberately generous 120/min. |
| Dependency pinning | **Mostly** | Exact NuGet versions; npm uses carets with a committed lockfile. GitHub Actions are floating major tags (L-16). |
| Crypto choices | **Pass** | AES-256-GCM for secrets at rest via the shared `DataProtector`; HMAC-SHA256 for the visitor digest; PBKDF2-HMAC-SHA256 at 210k iterations in the seed script. No MD5/SHA1/DES/RC4/ECB in application code — see L-11 for the one non-security MD5. |

### What the design gets right that is easy to get wrong

- **De-duplication by unique index, not by trust.** `PageViewHits` has a unique `(Path, VisitorKey)`
  index; the counter increments only when the insert succeeds, and a `DuplicateKey` is caught and
  treated as "already counted" (`PageStatsController.cs:59-78`). Two tabs opened at once cannot both
  increment. A TTL index then expires the rows, which bounds both the collection size and the
  retention of anything derived from personal data.
- **Partial unique indexes.** `ux_user_email` and `ux_user_username` are filtered on
  `IsDeleted == false`, with `DropIndexIfExists` first so an existing deployment can be migrated to
  the new shape. A soft-deleted user does not permanently block reuse of their address — a subtle
  problem that most codebases discover in production.
- **Thread tail ordering.** `CommentsController.cs:54-63` sorts descending, limits, then reverses,
  because an ascending sort with a limit would silently drop the *newest* comments from a long
  thread. The reasoning is in the comment, which is why it will survive the next edit.
- **Orphan cleanup on the failure path.** A failed media metadata insert deletes the file it just
  wrote (`MediaController.cs:91-100`); a delete removes the authoritative row *before* the file, on
  the stated grounds that an orphan file is harmless and a dangling row is not.
- **Explicit secret semantics.** In `SettingsService.ApplyAsync`, `null` keeps a secret, `""` clears
  it, non-empty replaces it — stated at each of the three call sites. `ImportJsonAsync` then clamps
  every security-sensitive value, because an import bypasses the DTO's `[Range]` attributes. That is
  exactly the right instinct.

---

## 3 · High

### H-1 · The blog renders markdown from any URL the visitor's link supplies
*Security · Correctness*

`ng-src/app/components/content-view/content-view.component.ts:286` takes `path` straight from the
query string and hands it to `ContentService.getFile()`
(`ng-src/app/services/content.service.ts:36`), which passes it unmodified to `HttpClient.get()`.
Nothing checks that it names a document inside `src/`.

```
https://git.keshavsingh.in/#/file?path=https://evil.example/pwn.md
https://git.keshavsingh.in/#/file?path=//evil.example/pwn.md
```

Both fetch remote markdown and render it inside the real site — breadcrumbs, reading time, tag chips,
print masthead and all. The reader sees attacker-authored prose, links and images on the domain they
trust, at a URL that starts with the blog's own origin.

DOMPurify means this is **not** XSS: no script runs, no HTML is injected. It is content spoofing, and
for a technical blog that is enough to matter — a convincing "update your credentials at this link"
page hosted on your own domain, indexable and shareable.

The server side already has the correct predicate. `ContentPath.TryNormalize` (anchored
`^src/…\.(md|markdown|txt|html?|json)$`, 300-char cap, explicit `..` and `\` rejection) is what the
API applies to the same value. Mirror it in the client before `getFile`, or — stricter and cheaper —
require that the path resolves to a node in `structure.json` via the already-existing
`findNodeByPath`, and show the normal "could not load" error otherwise. Apply the same guard in
`folder-view.component.ts:112`, which reads the same parameter.

### H-2 · An abandoned second identity store, still holding password hashes
*Security · Data · Correctness*

Identity moved to the IdP, but the local implementation was never removed. What remains:

- `UsersController` (185 lines) creates, updates, soft-deletes and resets passwords on a local
  `users` collection, hashing with `PasswordHasher` (`UsersController.cs:19-24, 58-84, 135-151`).
- `MongoAuthUserStore`, `AddKeshavAuthEngine()`, `JwtService`, `TotpService`, `SmtpEmailSender`,
  `TwilioSmsSender`, `WhatsAppOtpSender` and the `IAuthSettings` slice are all registered
  (`Program.cs:44-71`) and **nothing resolves any of them**. `AuthEngine` has no consumer, because
  `AddKeshavAuthControllers()` is never called — there is no login endpoint in this app.
- `server/scripts/seed-admin.mjs` still seeds an admin into that collection, and even creates a
  non-partial `ux_user_email` index that `MongoContext.EnsureIndexes` then drops and recreates.

Three concrete consequences:

1. **`GET /api/users/me` cannot succeed.** It looks up `User.GetUserId()` — the *IdP's* `sub` — in
   the *local* collection (`UsersController.cs:31`), finds nothing, and returns 401 for every real
   caller. Nothing in the frontend calls it, which is the only reason this is invisible.
2. **The dashboard shows a number from the dead store.** `dashboard.component.ts:152` calls
   `listUsers()` → `GET /api/users`, and renders the row count as "Users" to an Admin. It counts
   rows in an abandoned collection.
3. **Credential material is retained with no owner.** Password hashes, phone numbers and TOTP
   secrets sit in a collection that no authentication path reads. Under the baseline's data
   minimisation rule this is exactly the data that should not be kept.

Additionally, the app still constructs `JwtService` — a token *minting* capability — with the shared
family signing key, in a service that only needs to validate. Deleting it shrinks the blast radius of
that key.

The fix is deletion, not repair: drop `UsersController`, `Auth/MongoAuthUserStore.cs`, the three
sender classes, the `Users`/`RefreshTokens` collections from `MongoContext`, the auth-engine
registrations in `Program.cs:44-71`, the `Email`/`Sms`/`Security` option classes and appsettings
sections, and both seed scripts. Then remove `listUsers`/`createUser`/`updateUser`/`resetPassword`/
`deleteUser`/`listRoles` from `AdminApiService` and replace the dashboard tile with a link to the
IdP (which the same page already renders two of). The `KeshavSingh.Auth` / `KeshavSingh.Realtime`
package references may fall out of the csproj entirely.

### H-3 · Page-view de-duplication is defeated by a request header
*Security · Data*

`VisitorKeyService.For()` reads the raw `X-Forwarded-For` header and takes its **left-most** entry:

```csharp
// server/Blog.Admin.Api/Services/VisitorKeyService.cs:35-38
var ip = request.Headers.TryGetValue("X-Forwarded-For", out var forwarded) && …
    ? forwarded.ToString().Split(',')[0].Trim()
    : request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
```

The left-most entry is the one furthest from the server — i.e. whatever the *client* sent. Render's
proxy appends the address it actually observed at the right-hand end, and `UseForwardedHeaders`
(`Program.cs:179`, `ForwardLimit = 1`) has already consumed that trusted entry into
`Connection.RemoteIpAddress`. So the code deliberately prefers the untrusted half of the header over
the value the middleware just validated for it. The comment — "UseForwardedHeaders has already run,
but read the header defensively" — has the polarity backwards.

Effect: a client that varies `X-Forwarded-For` gets a fresh visitor key on every request, so the
unique `(Path, VisitorKey)` index never trips and each POST increments the counter. The public view
counts on every article are inflatable with a shell loop, bounded only by the 120/min IP rate limit.
Secondary effect: the stored digests are then derived from attacker-chosen input rather than from
observed connection data.

Fix: delete the header read and use `request.HttpContext.Connection.RemoteIpAddress` — which is
already the real client address, precisely because `UseForwardedHeaders` ran first.

### H-4 · No `/health` endpoint, though the deploy assumes one
*Ops*

There is no `MapHealthChecks`, no health controller, and no route matching `/health` anywhere in
`server/`. `AGENTS.md` states the backend runs on "Render Docker, `render.yaml`, `/health`" — and
there is no `render.yaml` in this repository either. A Render service configured with a `/health`
check against this image will fail every check (404) and roll back or restart in a loop; with no
check configured, a wedged process keeps serving.

Fix: one line before `app.Run()` —
`app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();` — ideally with a
`MongoContext` ping so the check means something. Then either commit the `render.yaml` that the docs
reference, or correct the docs to say the service is configured in the dashboard.

---

## 4 · Medium

### M-1 · The public `/api/links` endpoint returns internal user ids — for no consumer
*Security · Quality*

`LinksController.List` is `[AllowAnonymous]` and returns the raw `Link` **model**
(`LinksController.cs:28-39`), including `CreatedByUserId`, `UpdatedByUserId`, `CreatedAt` and
`UpdatedAt`. Every other controller in the app projects to a DTO for exactly this reason. Anonymous
callers get IdP user ids they have no use for.

Worse, nothing consumes it: `listLinks()` is called only from the admin page, and with `?all=true`.
No public component fetches links at all. The anonymous branch is pure attack surface for a feature
that is not wired up. Either project a `LinkDto` (title, url, category, description, icon, order) or
drop `[AllowAnonymous]` until the public side actually renders links.

### M-2 · Public comment threads expose each commenter's identity-provider id
*Security · Data*

`CommentDto` carries `UserId` (`Dtos/CommunityDtos.cs:8-17`, populated at
`CommentsController.cs:328-330`) and the thread read is anonymous. Any visitor can harvest a stable
internal identifier for every person who has ever commented, paired with their display name.

The client needs it for nothing — the DTO already carries `IsMine`, computed server-side, which is
what the UI actually uses (`comments.component.ts:52`). Drop `UserId` from `CommentDto` and keep it
in `ModeratedCommentDto`, which is Admin-only and does need it for the ban flow.

### M-3 · A malformed id in any route returns 500 instead of 404
*Correctness*

Every entity id is a `string` carrying `[BsonRepresentation(BsonType.ObjectId)]`. Building a filter
with a value that is not a 24-hex ObjectId throws `FormatException` during serialisation — and the
error middleware (`Program.cs:183-207`) catches only `MongoWriteException`,
`InvalidOperationException` and `JsonException`. So `GET /api/content/abc`,
`DELETE /api/comments/xyz`, `GET /api/media/nope/raw` and their siblings across
Content · Links · Media · Users · Comments all produce an unhandled 500.

No information leaks (production returns an empty 500 body), but the status code is wrong, the logs
fill with noise, and a scanner walking ids will look like a server fault. Validate at the boundary —
`ObjectId.TryParse(id, out _)` → `NotFound()` — or add a route constraint, or catch `FormatException`
in the middleware alongside the others.

### M-4 · The backend is never built by CI
*Ops*

`.github/workflows/deploy.yml` regenerates `structure.json`, runs `npm ci`, runs `ng build` and
publishes to Pages. There is no `dotnet build`, no `dotnet publish`, no Docker build — nothing that
compiles `server/`. The only thing that ever compiles the API is a Render deploy, which happens after
the merge. A C# compile error can sit in `master` indefinitely and is discovered by a failed
production deploy.

Fix: add a job running `dotnet build server/Blog.Admin.Api/Blog.Admin.Api.csproj -c Release` with
`PACKAGES_READ_TOKEN: ${{ secrets.PACKAGES_READ_TOKEN || github.token }}` (the same fallback the npm
step already uses). Building the Dockerfile is stronger still, since that is what Render actually
runs.

### M-5 · The console's "Published — visible on the blog" switch does nothing
*Correctness*

`content-edit.component.ts:59` labels the toggle "Published — *visible on the blog*". It sets
`ContentTopic.Published` on a Mongo document. The blog reads `structure.json` and `src/*.md` and never
queries `/api/content`. Publishing in the console changes nothing a reader can see, and unpublishing
does not take anything down.

This is the most user-visible symptom of the two-store split (§1a), and it is a promise the software
does not keep. Pick a direction and commit:

- **Static wins** — reduce the console's content section to read-only, or remove it, and treat `src/`
  + `generate_structure.py` as the only authoring path (which is what actually happens today).
- **Database wins** — have the API serve content, or have a publish action write markdown back into
  `src/` and commit it.

Until one is chosen, at minimum relabel the toggle so it stops asserting something false.

### M-6 · A provider error path logs phone numbers
*Security · Data*

`TwilioSmsSender` logs the raw Twilio response body on failure
(`server/Blog.Admin.Api/Security/SmsSender.cs:62-63`). Twilio's error payloads echo the `To` and
`From` numbers, so a send failure writes personal data into the log stream — and the code comment
even cites error 21606, which is one of the messages that does. The baseline says never log personal
data; observability data goes to New Relic in open formats, where it will be retained.

Log `response.StatusCode` and Twilio's numeric `code` field only. Note that this class is unreachable
today (H-2) — if the senders are deleted, this finding goes with them.

### M-7 · SVG uploads are accepted, and the mitigation is one header away from failing
*Security*

`image/svg+xml` is on the upload allowlist (`appsettings.json:57`, `MediaController.cs:29`) and SVG
is explicitly exempted from the magic-byte check (`MediaController.cs:77`, correctly — SVG has no
fixed signature). An uploaded SVG can carry `<script>`.

The mitigation is real and well chosen: `Raw` sets
`Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`
(`MediaController.cs:127`), and the global middleware adds `X-Content-Type-Options: nosniff`. Script
inside the SVG will not run. But the whole defence is one response header on one action, and the
threat model behind it is quietly dependent on where the API lives: today it is
`content-blog-nms8.onrender.com`, a different site from `*.keshavsingh.in`, so the shared SSO cookie
is out of scope. Move the API to `api.keshavsingh.in` — a natural thing to want — and a stored-XSS
primitive suddenly sits on an origin the family cookie is scoped to.

Upload is Editor/Admin-only, so this is not open to the public; that is why it is Medium and not
High. Recommendation: drop SVG from the allowlist (the admin UI advertises "PNG, JPG, GIF, WebP or
SVG", so this is a one-line copy change too), or sanitise the XML server-side, or serve raw media
from a separate origin. If SVG stays, add a regression note next to the CSP line saying the header
*is* the control.

### M-8 · `localStorage` is touched unguarded during app bootstrap
*Correctness*

`ThemeService` reads `localStorage` in a field initialiser and writes it in an effect
(`ng-src/app/services/theme.service.ts:6, 13`). In a browser configured to block site data — Safari
private browsing, Firefox strict mode, enterprise policy — the accessor itself throws. The service is
`providedIn: 'root'` and injected by `AppComponent`, so the throw happens during bootstrap and the
**entire site fails to render**, blog and console alike, for a purely cosmetic preference.

Wrap both in try/catch and fall back to `'light'`. This is the only browser-storage use in the
codebase, so it is a five-line fix with no wider consequence.

### M-9 · Concurrent settings edits silently clobber each other; export ships secret ciphertext
*Correctness · Security*

Two smaller issues in `SettingsService`:

- `ApplyAsync` (`SettingsService.cs:135-178`) clones the cached document, mutates the fields the
  request mentions, and replaces the whole singleton. Two admins saving different sections at once
  produce a last-writer-wins result in which the earlier edit disappears with no error. A targeted
  `$set` update, or a `Version`/`UpdatedAt` precondition on the replace, fixes it.
- `ExportJson` (`SettingsService.cs:181-182`) serialises the whole `AppSettings`, including
  `EmailPasswordEncrypted`, `SmsAuthTokenEncrypted` and `WhatsAppAccessTokenEncrypted`. This is a
  documented choice and the values stay AES-encrypted, but the resulting download is a file of
  secret ciphertext that leaves the trust boundary and will end up in a Downloads folder or a chat
  thread. Either strip the three fields from the export (a restore then re-enters them, which is the
  safer flow anyway) or state the handling requirement in the response — `SettingsView` is already
  careful to return only `…Set` booleans, and the export undercuts that care.

### M-10 · Comment moderation cannot filter by a partial path
*Correctness*

The moderation screen's filter box sends whatever is typed to `GET /api/comments/moderation?path=…`,
which runs it through `ContentPath.TryNormalize` and returns 400 for anything that is not a complete,
valid document path (`CommentsController.cs:188-192`). Typing `CSharp` — the obvious thing to try —
produces "Unknown document path." rather than the comments on that folder's documents. Either accept
a prefix (validated with the same character allowlist, then matched with an anchored, escaped regex)
or change the input to a picker over known paths.

---

## 5 · Low

**Configuration & DI**

- **L-1** `dashboard.component.ts:135` and `admin-layout.component.ts:112` both hardcode
  `https://admin.keshavsingh.in` instead of injecting `ADMIN_APP_URL`, which exists in
  `api.config.ts` for exactly this and is overridable via `window.__ADMIN_APP_URL__`. A local
  console links a developer to production.
- **L-2** The admin console hardcodes every English string while the public site takes all copy from
  the i18n catalogue. Defensible (the console has one audience) but worth stating as a decision
  somewhere, because the two halves of one bundle now follow opposite rules.
- **L-3** `appsettings.json:9-11` still defines `Cors:AllowedOrigins`. CORS comes from
  `AddKeshavSsoCors` (`Program.cs:102`) and nothing binds that section. Dead config invites someone
  to "fix" CORS by editing it.
- **L-4** `"AllowedHosts": "*"` disables host filtering. Harmless behind Render's proxy; pin it if
  the service ever gets a second hostname.
- **L-5** `nuget.config` is duplicated verbatim at the repo root and in `server/` (needed, because
  the Docker build context is `server/`). Add a comment cross-reference so the two do not drift, or
  generate one from the other.

**Content pipeline**

- **L-6** `ContentService.rewriteImagePaths` (`content.service.ts:337`) rewrites the whole document,
  unlike `rewriteDocumentLinks`, which routes through `mapOutsideCode` to protect fenced blocks. An
  `![alt](path)` example inside a ```markdown fence gets rewritten as if it were a real image.
  Route it through `mapOutsideCode` too.
- **L-7** `mapOutsideCode` (`content.service.ts:313-333`) toggles a single boolean on any line
  starting with ``` or `~~~`, so a ``` fence "closed" by `~~~` (or a fence inside a fence) desyncs
  the parser for the rest of the file. Track the opening delimiter and require a match.
- **L-8** `generate_structure.py` hardcodes the `src/` prefix in the emitted `path`
  (lines 186, 209, 231) while `--src` is configurable, so any non-default `--src` produces paths the
  app cannot resolve. Derive the prefix from the argument or drop the flag.
- **L-9** The watch-mode change detector uses `hashlib.md5()` (`generate_structure.py:294`). The use
  is non-cryptographic, but the baseline bans MD5 without qualification and Snyk/Bandit will flag it.
  `hashlib.md5(usedforsecurity=False)` or `blake2b` costs nothing and keeps the scan clean.
- **L-10** CI regenerates `structure.json` before building but never checks whether the committed
  copy matched. A stale commit is invisible. Add `git diff --exit-code structure.json` after the
  regenerate step so drift fails the build — `AGENTS.md` already treats keeping it in sync as a rule.
- **L-11** `.markdownlint.yaml` exists and nothing runs it — not `package.json`, not the workflow.
  Either wire `markdownlint-cli` into CI for `src/**/*.md` or delete the config.

**Frontend**

- **L-12** `I18nService.direction` (`i18n.service.ts:34`) is computed and never consumed: no `dir`
  attribute is set on `<html>` anywhere. Enabling an RTL locale in the config will render RTL text
  left-to-right. Apply it in an effect alongside `ThemeService`'s `data-theme`.
- **L-13** Signing out navigates to `/admin/login` (`admin-layout.component.ts:135`), whose component
  immediately redirects to the IdP's login page (`login.component.ts:32`). There is no signed-out
  resting state — you cannot log out and stay on the site. Navigate to `/` instead.
- **L-14** `ContentService.getStructure()` has no `shareReplay`, so components subscribing before the
  first response lands (navbar, home, search, content-view all do) each issue their own
  `structure.json` request. One `shareReplay(1)` on the HTTP pipeline removes the duplicates.
- **L-15** `ContentService.fileCache` grows without bound for the session. Fine at 87 documents;
  worth a cap if the corpus grows.
- **L-16** `topRole()` (`admin-layout.component.ts:124`) displays `roles[0]`, which is insertion
  order, not precedence — an `['Editor','Admin']` user is labelled "Editor". Sort by privilege.
- **L-17** `content-view.component.ts:238-250` blanks `content` and restores it via `setTimeout` on
  every theme flip, to force Mermaid to re-render. It works, but it clears the article for a frame on
  documents that have no diagram at all. Gate it on `mermaidReady`, which the effect already reads.
- **L-18** `index.html` loads Font Awesome from cdnjs and fonts from Google with no `integrity`
  attribute, and the static site has no CSP (GitHub Pages cannot set headers, but a
  `<meta http-equiv="Content-Security-Policy">` is available). Both are cheap hardening for a site
  that renders remote-configured hrefs and remote markdown.

**Hygiene & docs**

- **L-19** `App_Data/` is not in `.gitignore` (it is in `.dockerignore`), so local media uploads show
  up as untracked noise in `git status`.
- **L-20** Stale `server/Blog.Admin.Api/bin/Debug/net8.0/` artifacts remain on disk from before the
  net10 move — ignored by git, but a misleading thing to find when debugging a framework question.
- **L-21** GitHub Actions are pinned to floating major tags (`actions/checkout@v4`,
  `deploy-pages@v4`). The baseline asks for pinned versions in production configs; SHA-pinning these
  five uses is the standard answer.

---

## 6 · Dead code and drift inventory

Removing this list would delete roughly a third of the backend and a quarter of the admin
frontend's surface, with no behaviour change.

| Item | Why it is dead |
| --- | --- |
| `Controllers/UsersController.cs` | Local user store; `/me` can never resolve an IdP `sub` |
| `Auth/MongoAuthUserStore.cs` | Only consumed by `AuthEngine`, which has no endpoint |
| `Security/EmailSender.cs`, `SmsSender.cs`, `WhatsAppOtpSender.cs` | OTP delivery for a 2FA flow that lives at the IdP |
| `Program.cs:44-71` — `PasswordHasher`¹, `TotpService`, `JwtService`, `IAuthUserStore`, `IRefreshTokenStore`, `IAuthAuditSink`, `IEmailSender`, `ISmsSender`, `IWhatsAppSender`, `WhatsAppNotifier`, `AddKeshavAuthEngine` | Registered; nothing resolves them |
| `MongoContext.Users`, `.RefreshTokens`, `.Audit` + their indexes | Written only by the dead paths above |
| `Models/User.cs` — 2FA, OTP, lockout, backup-code fields | Managed at the IdP |
| `Configuration/AppOptions.cs` — `EmailOptions`, `SmsOptions`, `SecurityOptions` + their appsettings sections | Only read to seed settings for the dead engine |
| `AppSettings` — 2FA/email/SMS/WhatsApp/token-lifetime fields, and `SettingsController` entirely | No UI calls `/api/settings`; `getSettings`/`updateSettings`/`exportSettings`/`importSettings` are unused |
| `server/scripts/*` (`seed-admin.mjs`, `.sh`, `.ps1`) | Seeds a login that no endpoint accepts; also fights `EnsureIndexes` over `ux_user_email` |
| `AuthService.enrollStart/enrollConfirm/disableTwoFactor/changePassword` | No component calls them |
| `admin.models.ts` — `AuthTokens`, `LoginResponse`, `TwoFactorMethod`, `EnrollStartResponse`, `UserListItem`, `SettingsView`, `UpdateSettings` | Types for the removed pages |
| `AdminApiService` — all user, role and settings methods | Only `listUsers` is called, and only to render a wrong number |
| `LinksController.List` anonymous branch | No public consumer (M-1) |

¹ `PasswordHasher` is currently reachable through `UsersController`; it becomes dead with it.

---

## 7 · Documentation accuracy

The code is more trustworthy than the prose. Corrected in `CLAUDE.md`; still wrong at the source:

| Claim | Where | Reality |
| --- | --- | --- |
| ".NET 8" | `readme.md:3, 21`, `server/README.md:3, 100` | `net10.0` in the csproj; `sdk:10.0`/`aspnet:10.0` in the Dockerfile |
| "Angular 21" | `readme.md:3` | `@angular/core ^22.1.1` |
| `AuthController`, `POST /auth/login`, `/auth/2fa/*`, sign-in sequence diagram | `server/README.md:24-70` | No auth controller in this app; `AddKeshavAuthControllers()` is not called |
| Admin console manages "Users & Roles" and "Security / 2FA" | `server/README.md:8-9` | Those routes were removed; the console links out to the IdP |
| "Render Docker, `render.yaml`, `/health`" | `AGENTS.md` | No `render.yaml` in the repo; no `/health` route (H-4) |
| `https://blog.keshavsingh.in/#/tags` | `readme.md:69` | `CNAME` is `git.keshavsingh.in` |
| Dashboard diagram: "Auth + 2FA · TOTP · email · backup" inside the .NET API | `dashboard.component.ts:69-73` | That tier is the IdP now |
| "Node 18+" | `AGENTS.md`, `readme.md:20` | CI uses Node 22; Angular 22 requires ≥20 |
| Media dropzone: "PNG, JPG, GIF, WebP or SVG" | `media.component.ts:27` | Accurate today, but should change with M-7 |

`STRUCTURE_UPDATE.md`'s "Method 3: Browser-based Monitoring — checks for changes every 30 seconds …
click the 🔄 Refresh button" describes a polling refresh feature with no counterpart in `ng-src/`.

---

## 8 · Testing

There are **no tests in this repository** — no `*.spec.ts`, no test project, no test script, no test
job. There is also no lint or typecheck script; `ng build` (with `strict`, `strictTemplates` and
`noPropertyAccessFromIndexSignature`, which is a meaningful bar) and `dotnet build` are the only
verification, and per M-4 the second one never runs in CI.

The strict compiler settings and the absence of DOM sinks do a lot of work here, so this is not as
alarming as a bare count suggests. But several things in this review are exactly what a test would
have caught, and they are all cheap to cover:

1. `ContentPath.TryNormalize` — the security boundary. Table-test the allowed shapes plus `..`,
   backslashes, absolute URLs, protocol-relative URLs, over-length input, and the extension
   allowlist. Then reuse the same table for the client-side guard from H-1.
2. `VisitorKeyService.For` — assert the key does **not** change when `X-Forwarded-For` changes
   (H-3), and does change with the connection address.
3. `PageStatsController.TrackView` — two calls with the same visitor increment once.
4. Comment authorisation — another user's id cannot edit or delete; the edit window expires; a
   banned account is refused on create, update and delete.
5. `ContentService.parseFrontMatter` / `rewriteDocumentLinks` — the trickiest pure functions in the
   frontend, with the code-fence cases from L-6 and L-7.
6. `generate_structure.py` — front-matter parsing, folder-derived tag fallback, and the
   case-insensitive tag de-duplication.

An `xunit` project under `server/tests/` and `@angular/build:unit-test` (which the sibling family
apps already use, so the pattern exists next door) would cover all six.

---

## 9 · Suggested order of work

**This week**

1. H-1 — validate `?path=` against `^src/…` + extension allowlist, or against `structure.json`.
   *(one guard, two call sites)*
2. H-3 — delete the `X-Forwarded-For` read in `VisitorKeyService`. *(three lines)*
3. H-4 — add `/health`, and reconcile `render.yaml`. *(one line + docs)*
4. M-8 — try/catch around `localStorage`. *(five lines)*
5. M-2, M-1 — stop returning IdP user ids from the two anonymous endpoints.

**Next**

6. H-2 — delete the abandoned identity store and the auth-engine wiring, per §6. This is the single
   highest-value change in the repository: it removes credential retention, a broken endpoint, a
   wrong dashboard number and about a third of the backend's composition root.
7. M-4 — add a `dotnet build` (or Docker build) job to CI.
8. M-5 — decide the content-store question and make the console tell the truth.
9. M-3 — validate route ids; M-6 — stop logging provider bodies; M-7 — drop SVG.
10. Testing items 1–4 above, alongside the fixes they cover.

**Then**

11. M-9, M-10, and the Low list — L-1, L-9, L-10 and L-12 are each a few minutes and remove real
    foot-guns.
12. Correct the documentation (§7). `server/README.md` describing a login flow this service does not
    implement is the most misleading artefact in the repo.

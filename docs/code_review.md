# Code Review — content-blog

Date: 2026-08-28

Scope: full project — Angular 22 public blog (`ng-src/`), Angular admin console (`ng-src/app/admin/`),
.NET Web API backend (`server/Blog.Admin.Api/`), build/config/CI, and content scripts
(`generate_structure.py`, `server/scripts/`).

The shared `KeshavSingh.*` / `@keshavsingh3197/*` packages are external private dependencies and are
not reviewed here; findings focus on how this repo behaves on its own.

Severity guide: **Critical** (exploitable / data loss) · High (real bug or security gap) · Medium
(should fix) · Low (polish / robustness).

---

## Critical

### C-1 · JWT signing key silently falls back to an all-zero placeholder when `Jwt:SigningKey` is unset
`server/Blog.Admin.Api/Program.cs:99-102`

```csharp
IssuerSigningKey = new SymmetricSecurityKey(
    Encoding.UTF8.GetBytes(string.IsNullOrWhiteSpace(jwtOptions.SigningKey)
        ? new string('0', 32) // Placeholder; JwtService throws at startup if unset.
        : jwtOptions.SigningKey)),
```

The comment claims `JwtService` throws at startup when the key is missing, and the intent of the
zero-pad is a harmless placeholder. But `JwtService` is only *registered* (`Program.cs:40`) and is
**never resolved** anywhere in this repo — the startup scope (`Program.cs:205-210`) resolves only
`SettingsService`. So the guard can never run, and if a deployment forgets `Jwt:SigningKey`, tokens
signed with the well-known all-zero key are **accepted** (with `ValidateIssuerSigningKey = true`).
Because role claims come straight from the token, that is full-forgery → full Admin.

**Fix:** throw at startup when the key is missing instead of padding, e.g. `jwtOptions.SigningKey` is
resolved and validated before `AddJwtBearer`, or register a startup self-check that resolves and
exercises the signing key. Never accept an all-zero key.

---

## High

### H-1 · Concurrent 401s each run their own SSO refresh — a race can wipe a valid session
`ng-src/app/admin/interceptors/auth.interceptor.ts:31-40`

When several in-flight requests return 401 together, every one calls `auth.refresh()` (a
`POST /sso/session`) and each mutates the shared `accessToken`/`user` signals via `setSession`.
There is no single-flight de-duplication. If one refresh succeeds and a parallel one then fails, the
failing path (`auth.forceClear(); auth.loginRedirect();`, lines 36-37) clears the good session and
redirects an authenticated user to sign-in.

**Fix:** share one in-flight refresh observable (e.g. a stored `lastRefresh$` with `shareReplay`) so
concurrent 401s await the same exchange.

### H-2 · `MapInboundClaims = false` with no `RoleClaimType` — role checks may silently fail closed
`server/Blog.Admin.Api/Program.cs:93-108`

`MapInboundClaims = false` keeps the IdP's claims verbatim (`sub`, `role`). Nothing sets
`TokenValidationParameters.RoleClaimType`, so `[Authorize(Roles = …)]` and `User.IsInRole(…)` match
the legacy `ClaimTypes.Role` URI by default. If the IdP mints a plain `role` claim, every role check
in the app fails closed and the whole admin console 403s for admins. **Verify the IdP's claim names
against what this app consumes** (grep the external packages / IdP docs); if it mints `role`, set
`RoleClaimType = "role"`.

### H-3 · Forwarded headers trusted from any client — rate-limit bypass and IP spoofing
`server/Blog.Admin.Api/Program.cs:66-71` (`.KnownIPNetworks.Clear(); .KnownProxies.Clear();`) with
`Program.cs:117,141` and `Services/VisitorKeyService.cs:35-38`

Clearing the known-proxy list makes the app trust a client-supplied `X-Forwarded-For`. The
`page-views` rate limit (120/min per “IP”) and the visitor de-dup key both derive from that value, so
a scripted client can rotate the header to inflate view counts and defeat the unique
`ux_page_view_hit` index. Audit IPs are likewise spoofable.

**Fix:** restrict `KnownProxies` to Render's egress ranges (or document the trade-off), and partition
rate limits on a value the caller cannot choose.

---

## Medium

### M-1 · Bare `[Authorize]` on reads exposes hidden/draft data to any SSO-family account
`ContentController.cs:23-47`, `LinksController.cs:24-43`, `MediaController.cs:41-47`

The audience is the shared family (`keshavsingh-apps`), so any account with a valid token *for any
sibling app* counts as “authenticated” here. `Content.List/Get` return unpublished drafts,
`Links.Get` returns hidden links, and `Media.List` returns the full inventory — without requiring the
`Viewer` role the README describes. Consider `[Authorize(Roles = Roles.Viewer)]` on these, and/or
filter drafts to `Published = true` for non-Editors.

### M-2 · `navigator.clipboard?.writeText(...).then(...)` throws when the API is unavailable
`ng-src/app/admin/pages/media.component.ts:112`

Optional chaining short-circuits to `undefined` when `navigator.clipboard` is missing (insecure
context / older browsers), then `.then(...)` throws inside the click handler. Note the public
`content-view.component.ts:553` correctly guards the same API with `!navigator.clipboard`. Mirror
that guard.

### M-3 · Load failure lets a user overwrite existing content with a blank form
`ng-src/app/admin/pages/content-edit.component.ts:104-113`

On the `content/:id` route, a `getContent` failure only shows a toast; `busy` is never set during
load and the form stays blank but valid, and `save()` (`id ? update : create`, line 136) will `PUT`
a blank body over the topic. Set `busy` during load and disable save until content is present (or
until load succeeds).

### M-4 · OTP codes written to logs when the channel is disabled — no environment guard
`Security/EmailSender.cs:27-31`, `Security/SmsSender.cs:30-33`

When email/SMS is disabled the one-time code is `LogWarning("… OTP … is {Code} …")`. There is no
`IsDevelopment()` guard; `appsettings.json` ships the channels disabled, so a misconfigured
production would leak codes to logs. Gate the log fallback behind `app.Environment.IsDevelopment()`.

### M-5 · Comment thread returns the OLDEST 500 comments; the newest are unreachable
`Controllers/CommentsController.cs:54-62`

`SortBy(c => c.CreatedAt).Limit(MaxThreadSize)` returns the *oldest* 500 in an ascending sort, so in
a thread over 500 the newest replies are silently dropped, and `dtos.Count` reports the truncated
size rather than the real total. If a cap is required, return the newest tail
(`SortByDescending(CreatedAt)`) with an honest count, or paginate with `skip`/`after`.

### M-6 · Soft-deleted users permanently block reuse of their email / username
`Data/MongoContext.cs:42-54` vs `Controllers/UsersController.cs:64-67,97-99`

The app's uniqueness pre-checks filter `!IsDeleted`, but the unique indexes cover **all** rows
including soft-deleted ones. Re-creating a user with the email or username of a soft-deleted user
passes the pre-check and then throws an unhandled duplicate-key `MongoWriteException` → 500. Make
the indexes partial on `!IsDeleted`, or make the pre-checks consider deleted rows and return 409.

### M-7 · Content slug/folder conflict on update → unhandled 500
`Controllers/ContentController.cs:75-94`

`Update` performs no conflict check at all; changing a slug/folder to one already taken hits the
unique `ux_content_folder_slug` index and throws a raw 500. `Create`'s pre-check (line 56) is also a
TOCTOU race for concurrent creates. Return 409 (catch the write exception / re-check).

### M-8 · Settings import bypasses every DTO validation constraint
`Services/SettingsService.cs:165-172` with `Controllers/SettingsController.cs:33-38`

`JsonSerializer.Deserialize<AppSettings>` ignores the `[Range]`/`[MaxLength]` guards on
`UpdateSettingsRequest`. A crafted export can set `MaxFailedLoginAttempts = 0`, negative ports, etc.,
which flow straight into `IAuthSettings` and change lockout behaviour with no warning. Validate the
imported object against the same constraints (or clamp to sane ranges) before saving.

### M-9 · Markdown admin preview renders without explicit sanitization configuration
`ng-src/app/admin/pages/content-edit.component.ts:77`, `ng-src/app/app.config.ts:15`

`provideMarkdown({ loader: HttpClient })` sets no `sanitize` option, and the preview binds the raw
body via `[data]`. Body content is authored by Editors, so this is guarded by role, but an Editor
(importing or pasting hostile content) could inject markup into an authenticated session. Explicitly
configure sanitization or whitelist, and confirm the production posture of `ngx-markdown`.

### M-10 · Banned users can still edit/delete existing comments
`Controllers/CommentsController.cs:102-157`

`IsBannedAsync` is enforced only in `Create` (line 77). `Update` and `Delete` check ownership but
never the ban, so a banned account keeps editing its comments within the 30-minute window. If a ban
means “no further activity”, enforce it there too (or document the intent).

---

## Low

### L-1 · Unbounded result sets / missing indexes
- `ContentController.cs:37-39` and `MediaController.cs:44-45` — full un-paginated collection,
  sorted with no supporting index → in-memory sort as the collection grows.
- `CommentsController.cs:227-228` — `Bans()` returns the whole ever-growing ban list with no limit.
- `CommentsController.cs:244-247` — ban display-name lookup queries comments by `UserId`; no index
  on `UserId` → per-ban scan.

Add `.Limit(...)`/pagination where collections grow, and index the comment-by-user query.

### L-2 · `ResetPassword` doesn't force a change on next login
`Controllers/UsersController.cs:132-134`

`Create` sets `MustChangePassword = true` for admin-issued temp passwords (line 79), but
`ResetPassword` updates only `PasswordHash`/`UpdatedAt`. An admin-chosen password stays valid
indefinitely. Consider setting `MustChangePassword = true` to match the `Create` intent.

### L-3 · `AdminSeeder` registered but never invoked; README promise is broken
`Program.cs:44`, `Services/AdminSeeder.cs:31` (`SeedAsync()` never called)

`Program.cs:207-208` states the app “no longer seeds or stores its own login users,” yet
`server/README.md:127` still claims “On first run it seeds an Admin user,” and `AdminSeeder` is
registered dead code. Wire `SeedAsync()` into the startup scope, or delete it and fix the README.

### L-4 · Password-reset / deactivate doesn't kill in-flight JWTs
`Controllers/UsersController.cs:114-124,128-141`

Only refresh tokens are revoked; access tokens live up to `AccessTokenMinutes` (15). Mostly
acceptable, but worth documenting that a deactivated user keeps a usable token for up to the access
lifetime.

### L-5 · Subscriptions not managed with `takeUntil` / `takeUntilDestroyed` in admin components
`comments.component.ts`, `content-list.component.ts`, `content-edit.component.ts`,
`dashboard.component.ts`, `links.component.ts`, `media.component.ts`

The public components consistently use `takeUntil(this.destroy$)` /
`takeUntilDestroyed(this.destroyRef)`; the admin pages `.subscribe()` directly on single-shot
HttpClient observables. Mostly benign with signals, but a response landing after destroy still
mutates state (and `content-list`'s `setTimeout` debounce, lines 76/90-93, is never cleared). Align
the admin side with the established convention.

### L-6 · Dashboards swallow errors to empty arrays — partial outage looks like “0”
`dashboard.component.ts:133-135`

Each `forkJoin` source uses `catchError(() => of([]))`, so if one API is down the tile shows a
plausible 0. Track a per-source error flag or show “unavailable”.

### L-7 · Inconsistent error-surfacing across admin pages
`comments.component.ts` uses hard-coded `toast.error('…')`; `content-list` / `media` / `links` use
`toast.fromError(e)`. Standardise on `toast.fromError` (which has a safe fallback).

### L-8 · Dead / misleading code
- `auth.service.ts:47-49` — `hasStoredSession()` always returns `true` and is never called.
- `Configuration/AppOptions.cs:53-56` — `CorsOptions`/`Cors` section is bound nowhere; CORS comes
  from external `AddKeshavSsoCors`. Reconcile/remove.
- `Program.cs:116-123` — the `"auth"` rate-limit policy is configured but no endpoint uses it.
- `auth.service.ts` + `Program.cs` — OTP/logout fallbacks: verify `User.GetUserId()` (external)
  reads the same claim (`sub`) used elsewhere (`CommentsController.cs:281-285`).

### L-9 · Media handling robustness
- `MediaController.cs:66-77` — file written to disk *before* `InsertOneAsync`; a failed insert leaks
  an orphan file. Consider cleanup.
- `MediaController.cs:115-117` — delete removes the file then the row; a failure between leaves an
  orphan or a dangling row.
- Uploads trust client `ContentType` with no magic-byte verification (`MediaController.cs:55-67`);
  no image-bomb dimension checks. The `image/svg+xml` case leans on the CSP header
  (`MediaController.cs:101`) as the only protection.
- `MediaController.cs:94-98` — path containment uses `StartsWith` (sibling-prefix false positive);
  use `Path.GetRelativePath` unless the generated filename guarantees it (it does today).

### L-10 · Settings cache is stale across instances; secrets can never be cleared
`Services/SettingsService.cs:174-179` — `_current` updates only on the writing instance (no
pub/sub). `SettingsService.cs:139,143,152` — empty string is treated as “no change”, so there is no
way to remove a stored secret via the UI. Minor on a single Render instance.

### L-11 · Misc small items
- `Program.cs:95` — `RequireHttpsMetadata = !IsDevelopment()` is fine, but combined with the
  placeholder key (C-1) the whole auth posture needs the startup guard.
- `MongoContext.cs:37` — index creation runs synchronously in the constructor; a Mongo blip at boot
  fails the whole app. Operational note.
- `settings` / `users` / `content` / `media` / `comments` all return raw framework 500s on the
  duplicate-key / import failure paths with no structured error (see M-6, M-7, M-8). A global
  exception handler mapping to 400/409/500 JSON would tighten these.
- `ResetPassword` ordering: refresh tokens revoked before the user write (`UsersController.cs:119`);
  reverse so the user-state write is authoritative first.
- `PageStatsController.cs:74-78` — transient `Views: 0` possible when reading immediately after the
  dedup race loses; self-heals but breaks the “return the resulting total” contract under
  concurrency.

---

## Positive notes (verified non-issues worth preserving)

- No Mongo injection: all queries are typed `Builders`/LINQ filters; the only regex
  (`ContentController.cs:32-35`) is `Regex.Escape`d and non-anchored (substring) — safe.
- `ContentPath.TryNormalize` (`Content/ContentPath.cs`) is a solid allowlist (anchored regex, no
  `..` / backslash, length cap).
- Uploads use a random server-side filename, never the client filename (`MediaController.cs:64`).
- `PageStats` race-safe de-dup via the unique index; TTL 12h bounds `page_view_hits` growth.
- `MongoAuthUserStore.SaveAsync` persists only engine-owned fields — clean separation.
- Comments moderation: update/delete filter by `UserId` (no IDOR) and return 404 rather than 403 to
  hide existence; comment text is bound via Angular interpolation only (the XSS vector the blog
  avoids is correctly not opened).
- The frontend `app.component.ts:53` boot-refresh error is deliberately swallowed for signed-out
  visitors and documented as such — correct.
- Mermaid is injected on demand and `deterministicIds: true` is set (`content-view`), honouring the
  2 MB budget and the same-millisecond id collision pitfall.
- `content-view` correctly manages DOM listeners (`takeUntil`, `removeEventListener`) and guards
  `navigator.clipboard`.

---

## Suggested fix order

1. **C-1** — enforce JWT signing key at startup (highest impact if misconfigured).
2. **H-2** — confirm/endpoint role claim mapping with the IdP.
3. **H-1** — single-flight the SSO refresh in the interceptor.
4. **H-3** — restrict forwarded-proxy trust / rate-limit keying.
5. **M-1 … M-10** — roles on hidden reads, clipboard guard, blank-form overwrite, OTP log gating,
   thread ordering, soft-delete vs indexes, slug conflicts, import validation, markdown sanitize,
   ban on edit/delete.
6. **L-* items** — pagination/indexing, dead code, error handling, media robustness.

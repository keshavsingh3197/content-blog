# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is this repo's own agent brief (commands, private-package token, deploy, route quirks) —
read it too; this file covers the architecture that only becomes visible after reading several files
at once, and the places the prose docs are wrong.

## Two deployables, one Angular project

| Part | Source | Ships to |
| --- | --- | --- |
| Public blog | `ng-src/` + markdown in `src/` + generated `structure.json` | GitHub Pages (`dist/browser`) |
| Admin console | `ng-src/app/admin/**` (lazy `/admin` route of the *same* app) | same Pages bundle |
| Blog Admin API | `server/Blog.Admin.Api` (net10.0 + MongoDB) | Render (Docker, `server/Dockerfile`) |

`code/` is unrelated teaching sample code for the C# articles. `content-blog.sln` contains **only**
`code/SV.OOP.App` and `code/SV.Learning.Core` — the API is *not* in the solution, so always build it
by project path.

## Commands

```bash
npm ci --legacy-peer-deps    # what CI uses; needs PACKAGES_READ_TOKEN (see AGENTS.md)
npm start                    # ng serve → http://localhost:4200
npm run build                # ng build --base-href / → dist/

python generate_structure.py           # regenerate structure.json (also --watch)

cd server/Blog.Admin.Api && dotnet run # → :5080, /swagger in Development
dotnet build server/Blog.Admin.Api/Blog.Admin.Api.csproj
dotnet build content-blog.sln          # only the code/ samples
```

There are **no tests and no lint/typecheck scripts anywhere in this repo** — `ng build` (strict
templates + `strict` TS) and `dotnet build` are the only verification. CI runs both (the `api` job
was added for the second one). In this WSL shell `node` is
not runnable (only the Windows npm shims), so frontend changes usually have to be verified by
reading, or by asking the user to run the build.

## Two content stores that never meet

This is the biggest source of confusion. The public site is 100% static: `ContentService` fetches
`structure.json` and then the raw `src/**/*.md` file (copied verbatim as a build asset by
`angular.json`). The admin console's Content pages write `ContentTopic` documents into **MongoDB**
via `/api/content`, and nothing syncs those back into `src/` or `structure.json`.

So: to change what readers see, edit markdown under `src/` and re-run `generate_structure.py`
(committing the regenerated `structure.json` — CI regenerates it too, so drift shows up as a diff).
Editing content in the admin UI does not publish anything to the site.

`generate_structure.py` also lifts optional YAML front matter (`title`, `summary`, `tags`,
`updated`) into `structure.json`; with no `tags`, the containing folder names become the tags. It
hand-rolls the front-matter parse on purpose (no YAML dep, must run from a bare checkout) and never
raises — a malformed block is silently skipped rather than breaking navigation.

## The API is a resource server, not an identity provider

There is deliberately no auth controller, no user store and no token minting here.
`admin.keshavsingh.in` / `id.keshavsingh.in` is the only token issuer for the family of apps:

- `AuthService` calls `POST {IDP}/api/sso/session` with `withCredentials` to trade the
  `.keshavsingh.in` HttpOnly SSO cookie for a short-lived access token held **in memory only**;
  `authInterceptor` attaches it to `API_BASE`/`IDP_BASE` requests and retries once on a 401.
- `Program.cs` only *validates* HS256 tokens (`ValidIssuer`/`ValidAudience` from `Jwt:*`,
  `MapInboundClaims = false`, `RoleClaimType = "role"`). `Jwt:SigningKey` must be byte-identical to
  the IdP's, and the app **throws at startup** if it is unset rather than defaulting.
- Users/roles/2FA/password are managed at the IdP, not here — the local `users` collection,
  `UsersController`, the auth-engine wiring and the OTP senders were all deleted (see
  `docs/code_review.md` § H-2). The role names (`Admin`/`Editor`/`Viewer`, from `KeshavSingh.Core`)
  are a shared contract — renaming one silently breaks cross-app authorization.
- `Program.cs`'s service registrations are correspondingly short: `MongoContext` and
  `VisitorKeyService`. If you find yourself adding a password hasher or a token service here, the
  feature belongs at the IdP.

The three runtime bases are `InjectionToken`s in `ng-src/app/admin/api.config.ts`
(`API_BASE`, `IDP_BASE`, `ADMIN_APP_URL`), defaulted from `window.__*__` globals hardcoded in
`ng-src/index.html`. Public-site services import from that admin path too — that is intentional, not
a layering mistake.

`Content/ContentPath` is the one predicate that decides whether a caller-supplied string names a
document, and `ng-src/app/services/content-path.ts` is its client-side mirror — keep the two
equivalent, since a path that passes one and fails the other is a bug in whichever direction.

## Branding, copy and config are database values

`RuntimeConfigService` and `I18nService` wrap `@keshavsingh3197/web-config` and pull the runtime
config (`GET {IDP}/api/config`) and translation bundles (`/api/i18n/bundle/{locale}`) from the IdP at
load. Titles, links, topic cards, feature flags and every user-facing string are admin-editable DB
rows, so **don't hardcode display text or URLs** — add a config/i18n key and read it through the
accessors (which handle the not-yet-loaded case; nothing throws, the `fallback` argument is only
what to paint before the API answers).

## Anonymous surface on the API

Most endpoints are `[Authorize]` by default with role gates on top, but the public site calls a few
without a session: `GET /api/comments`, `POST /api/page-stats/view` + `GET /api/page-stats`,
`GET /api/media/{id}/raw`, `GET /api/links`. Those are the exposed edge:

- Caller-supplied content paths are a trust boundary — validate through
  `Content/ContentPath.TryNormalize` (anchored allowlist regex, length cap, explicit traversal
  reject). Never build a Mongo filter or echo a path that didn't pass it.
- Rate-limit policies live in `Program.cs`: `"comments"` partitions by `sub` for signed-in posts,
  `"page-views"` by IP. `ForwardedHeaders` runs first with `ForwardLimit = 1` so a client can't
  prepend fake hops to escape either.
- `VisitorKeyService` makes a keyed digest of IP + user agent so a reader counts once per page —
  it is a dedup key, not stored personal data. It reads `Connection.RemoteIpAddress` and must keep
  doing so: `X-Forwarded-For`'s left-most entry is client-supplied, and using it would let anyone
  mint a fresh visitor key per request and inflate view counts.

`Program.cs` is the whole composition root (options binding, CORS predicate allowlist for
`*.keshavsingh.in`, the `{id:objectid}` route constraint, error middleware that fails closed,
security headers, and the anonymous `/health` probe that pings Mongo). There are only three
settings — `Mongo:ConnectionString`, `Jwt:SigningKey`, `Encryption:DataKey` — plus `Media:*`; the
Mongo-backed settings singleton and its refresh service are gone.

## Traps

- **net10.0** is authoritative (`Blog.Admin.Api.csproj`, `server/Dockerfile` `sdk:10.0`). `readme.md`
  and `server/README.md` say ".NET 8" / "Angular 21" — stale. `@angular/core` is `^22.1.1`.
- `server/README.md` also documents an `AuthController`, `/auth/login`, `/auth/2fa/*` and admin
  Users/Security pages that **no longer exist in this repo** (identity moved to the IdP; `Seed:*` is
  gone, so there is no locally seeded admin). Check the source before believing it.
- Hash routing (`withHashLocation()`) everywhere, so Pages needs no rewrites; CI copies
  `index.html → 404.html`, and `deploy-static/admin/index.html` is a plain meta-refresh so the clean
  `/admin` URL bounces to `/#/admin/login`.
- Relative markdown links only work because `ContentService.rewriteDocumentLinks` rewrites them to
  `#/file?path=…` before render; a broken one silently lands on the home page via `404.html`.
- Mermaid is injected on demand by `MermaidLoaderService` (not `angular.json > scripts`) to stay
  under the 2 MB initial budget, and `deterministicIds: true` is required or same-millisecond
  diagrams share an SVG id and restyle each other. Quote node labels, `<br/>` for breaks, no raw
  `<`/`>`/`&`.
- `provideMarkdown` is left at its default `SecurityContext.HTML` sanitization (DOMPurify) — keep it
  that way; the admin preview binds untrusted markdown through the same path.
- `.markdownlint.yaml` sets `MD024 siblings_only` for content prose.
- The csproj/tsconfig prefer **sibling checkouts** of the `KeshavSingh.*` / `@keshavsingh3197/*`
  repos over the published packages when they exist (`SkipPrivatePackages`, tsconfig `paths`
  fallback to `../KeshavSingh-Packages-Web/dist`); see the parent `/mnt/d/GITHUB/CLAUDE.md`.
- Render wipes `App_Data/media` on every deploy/restart unless a Disk is mounted at `/app/App_Data`.
- `docs/code_review.md` is a full review dated 2026-09-02. Its **Remediation status** table is the
  authoritative record of which findings have been fixed; the finding bodies below it are left as
  originally written, so read the table first.
- Entity routes use the `{id:objectid}` constraint (`Routing/ObjectIdRouteConstraint.cs`) so a
  malformed id 404s at routing instead of throwing a `FormatException` inside the driver. Use it on
  any new route that takes a Mongo id.
- Media uploads are raster-only: every accepted content type has a magic-byte signature that
  `MediaController` verifies. SVG was removed deliberately — do not put it back without a
  server-side sanitiser.

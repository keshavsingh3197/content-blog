# AGENTS.md

Repo with **two independently deployable halves**, both built from the root:

| Part | What | Runs on | Needs |
| --- | --- | --- | --- |
| **Public blog** | Angular 22 static site rendering markdown in `src/` → `dist/` | repo root | Node 20+ (CI uses 22) |
| **Admin console** | Angular `/admin` UI + .NET Web API + MongoDB | `server/Blog.Admin.Api` | .NET + MongoDB |

The target framework is **`net10.0`** (`Blog.Admin.Api.csproj`, and `server/Dockerfile` uses
`sdk:10.0` / `aspnet:10.0`). The prose docs used to say ".NET 8"; they no longer do, but the
executable sources stay authoritative either way.

## Commands

Frontend (repo root):
```bash
npm install          # once; needs PACKAGES_READ_TOKEN (see below)
npm start            # dev server → http://localhost:4200
npm run build        # → dist/  (Pages artifact is dist/browser, base href "/")
```
No test/lint/typecheck scripts exist in `package.json`; `ng build` is the only verification.

Backend:
```bash
cd server/Blog.Admin.Api
dotnet user-secrets init
dotnet user-secrets set "Mongo:ConnectionString" "mongodb://localhost:27017"
dotnet user-secrets set "Jwt:SigningKey" "$(openssl rand -base64 48)"
dotnet user-secrets set "Encryption:DataKey" "$(openssl rand -base64 32)"   # exactly 32 bytes
dotnet run           # → http://localhost:5080, Swagger /swagger
```
Secrets must be set before first start. The console uses centralized IdP SSO — there is no local
seeded `Admin` (`Seed:*` settings were removed).

## structure.json is generated — commit it

The blog's navigation comes from `structure.json`, regenerated from `src/`. After adding/removing
content files, run and commit:
```bash
python generate_structure.py          # Windows: update_structure.bat
python generate_structure.py --watch  # auto-regenerate
```
CI (`deploy.yml`) also regenerates it, so keep it in sync with `src/`. Optional YAML front matter
(`title`, `summary`, `tags`, `updated`) is lifted into it; with no `tags`, the containing folders
become tags (matched case-insensitively). Content markdown is linted by `.markdownlint.yaml`
(MD024 siblings_only).

## Private packages need PACKAGES_READ_TOKEN

Both npm and NuGet pull private `@keshavsingh3197/*` / `KeshavSingh.*` packages from GitHub Packages
via `.npmrc` / `nuget.config`, which reference `${PACKAGES_READ_TOKEN}` (read:packages). Without it,
install/restore gets 401. Set it in env for local builds and as a CI/deploy secret; **never commit it**.
CI falls back to `github.token` when the secret is absent.

Before the private npm package is published, `tsconfig.json` falls back to a **sibling checkout**
`../KeshavSingh-Packages-Web/dist` (build that repo's `dist/` once). The csproj similarly falls back to
sibling checkouts (`shared-security`, `KeshavSingh-Packages-*`) when `PACKAGES_READ_TOKEN` is unset
(`SkipPrivatePackages`), so local restore works without the token only if those siblings exist.

## Route/link quirks (hash routing)

- All routes use hash URLs (`/#/...`), so GitHub Pages needs no rewrite rules.
- Relative markdown links are rewritten at render by `ContentService.rewriteDocumentLinks` (`ng-src/app/core/services/content.service.ts`); bare `#heading` links are intercepted to scroll instead. A broken relative link silently lands on `404.html`.
- Mermaid diagrams are loaded **lazily** (`MermaidLoaderService`), not via `angular.json > scripts` (keeps the 2 MB initial budget). `deterministicIds: true` is **required** in the mermaid config. Quote node labels, use `<br/>` for line breaks, avoid raw `<`,`>`,`&`.

## Runtime endpoints in ng-src/index.html

`window.__ADMIN_API_BASE__` (admin API, default `http://localhost:5080/api`), `window.__IDP_API_BASE__`
and `__ADMIN_APP_URL__` (identity provider for brand/i18n) are hardcoded in `ng-src/index.html`. They
override local defaults; they are **public URLs, safe to commit/deploy**. The API base env var uses
`__` separators for .NET config mapping (e.g. `Mongo__ConnectionString`).

## Deploy

- **Frontend → GitHub Pages** (workflow triggers on `master`/`main`): build with `--base-href /`, publish `dist/browser`, CI copies `index.html → 404.html`. Keep `CNAME` for a custom domain.
- **Backend → Render**: `server/Dockerfile`, build root `server`, binds `$PORT` (default 10000), runs as `$APP_UID`. There is no `render.yaml` in this repo — the service is configured in the Render dashboard; point its health check at `/health` (which pings MongoDB). Only 3 app secrets needed in env: `Mongo__ConnectionString`, `Jwt__SigningKey`, `Encryption__DataKey` (the AES key decrypting everything else). Media writes to `App_Data/media` which Render **wipes every deploy/restart** — mount a Render Disk at `/app/App_Data` for durable media.
- Deep dives: admin architecture/API/security in `server/README.md`.

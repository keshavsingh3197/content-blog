# Content Blog

An Angular 21 content blog (markdown-driven, deployed as a static site) **plus** a secure
full-stack **Admin Console** — Angular UI + .NET 8 Web API + MongoDB — with authenticator-first
two-factor auth, email-code fallback, and one-time backup codes.

There are two things you can run:

| Part | What it is | Needs |
| --- | --- | --- |
| **Public blog** | The static Angular site that renders the markdown in [src/](src/) | Node only |
| **Admin console** | `/admin` UI + .NET API + MongoDB to manage content, media, users & 2FA | Node + .NET 8 + MongoDB |

> Deep dive on the admin (architecture diagrams, API reference, security design): **[server/README.md](server/README.md)**.

---

## Prerequisites

- **Node.js 18+** and npm
- For the admin console only: **.NET SDK 8+** (`dotnet --version`) and a **MongoDB** (local `mongod` or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

Install the frontend dependencies once, from the repo root:

```bash
npm install
```

---

## 1. Run the public blog

```bash
# Dev server with live reload  →  http://localhost:4200
npm start

# Production build  →  outputs to dist/
npm run build
```

The navigation tree is driven by `structure.json`. Regenerate it after adding/removing files in
[src/](src/):

```bash
python generate_structure.py          # one-off
python generate_structure.py --watch  # auto-regenerate on change
```

### Front matter and tags

A markdown file may open with an optional YAML block. The generator lifts it into
`structure.json`, so listings and the tag index can show a real title without downloading every
document, and the reader strips the block before rendering it:

```markdown
---
title: Language Fundamentals
summary: Type system, generics, LINQ and CLR internals.
tags: [C#, .NET, CLR, Interview-Prep]
updated: 2026-08-22
---

# Language Fundamentals
```

- `tags` takes either the inline `[a, b]` form or a YAML `- item` list.
- Everything is optional. With no `title` the document's first `# heading` is used; **with no
  `tags` the folders the file lives in become its tags**, so every page is reachable from
  [`/#/tags`](https://blog.keshavsingh.in/#/tags) whether or not anyone has annotated it.
- Tags are matched case-insensitively (`C#` and `c#` are one tag), and each links to the tag
  index. Nothing here calls an API — tags work on the static site exactly as they do locally.

Adding tags to a document is therefore: edit the block, re-run `generate_structure.py`, commit.

### Printing

Every document page has a **Print** button. The print stylesheet drops the navigation, contents
rail and buttons, forces the light palette (a dark-theme reader would otherwise print black
pages), wraps code that scrolls sideways on screen, turns the scrolling tables back into real
tables, and prints external link targets in brackets. The source URL is printed under the title.

### Links between content files

Write them as ordinary **relative markdown links** and they just work:

```markdown
[Chapter 2](Interview/02-memory-and-type-system.md)   → routes to the reader
[Back up](../csharp-interview.md)                           → `..` is resolved
[The diagram](Asset/static_constructor.png)           → opens the asset directly
[MSDN](https://learn.microsoft.com/…)                 → new tab, rel="noopener"
[Jump to a heading](#rapid-fire-qa)                   → scrolls, keeps the route
```

**Why this needs code at all:** the app uses hash routing, so the browser resolves a relative href
against the *site root* rather than against the markdown file — `Interview/02-…md` becomes
`/Interview/02-…md`, misses, and falls through `404.html` to the home page.
[`ContentService.rewriteDocumentLinks`](ng-src/app/services/content.service.ts) rewrites relative
document links to `#/file?path=…` (or `#/folder?path=…`) before render, leaving the href real so
hover previews, middle-click and open-in-new-tab still behave.

A bare `#heading` link needs the same care in reverse: under hash routing the fragment *is* the
route, so clicking one would navigate away. `processLinks()` in the content view intercepts those
and scrolls instead.

Two authoring notes: give external links a scheme (`https://…`, not `example.com`), and remember
that links inside fenced or inline code are deliberately left untouched.

### Diagrams in markdown (Mermaid)

Any content file can embed a diagram with a fenced ` ```mermaid ` block — flowcharts, sequence
diagrams, class diagrams, state charts, ER diagrams. It renders client-side and follows the
light/dark theme toggle.

````markdown
```mermaid
flowchart LR
  A["HTTP request"] --> B{"Authenticated?"}
  B -->|"yes"| C["Handler"]
  B -->|"no"| D["401"]
```
````

**How it is wired** — worth knowing before you change it:

- The Mermaid bundle is ~3.5 MB, so it is **not** in `angular.json > scripts` (that would load it on
  every page view and blow the 2 MB initial budget). It is copied to `assets/mermaid/` as a build
  asset and injected as a `<script>` on demand by
  [`MermaidLoaderService`](ng-src/app/services/mermaid-loader.service.ts) — only for documents that
  actually contain a mermaid fence.
- `deterministicIds: true` is **required** in the mermaid config. Without it mermaid falls back to
  `Date.now()` for the svg id, so every diagram rendered in the same millisecond shares one id — and
  since each svg carries an id-scoped `<style>` plus `url(#id)` arrow markers, the first diagram then
  styles all the others.
- Authoring rules that avoid surprises: **quote every node label** (`A["text"]`), use `<br/>` for
  line breaks, and avoid raw `<`, `>` and `&` in labels — write "of T" rather than `<T>`.

---

## 2. Run the admin console

The admin needs the **backend running** as well as the frontend.

### Step 1 — configure backend secrets (never committed)

```bash
cd server/Blog.Admin.Api
dotnet user-secrets init

# MongoDB connection
dotnet user-secrets set "Mongo:ConnectionString" "mongodb://localhost:27017"

# JWT signing key (32+ bytes)
dotnet user-secrets set "Jwt:SigningKey" "$(openssl rand -base64 48)"

# AES-256 key for encrypting TOTP secrets (Base64 of exactly 32 bytes)
dotnet user-secrets set "Encryption:DataKey" "$(openssl rand -base64 32)"
```

**Windows PowerShell** — generate a Base64 key with:

```powershell
[Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }))
```

The console uses centralized identity (SSO) via the identity provider — there is no local
seeded admin. The first SSO user to sign in becomes an Admin, or an operator grants the
`Admin` role at the IdP.

### Step 2 — start the API

```bash
cd server/Blog.Admin.Api
dotnet run
```

- API base: `http://localhost:5080`
- Swagger (dev): `http://localhost:5080/swagger`

### Step 3 — start the frontend (separate terminal)

```bash
# repo root
npm start
```

Open <http://localhost:4200/#/admin/login> and sign in via SSO. Then go to **Security & 2FA**
to enroll your authenticator app and save your backup codes.

### Pointing the UI at a different API

The UI defaults to `http://localhost:5080/api`. To target another backend without rebuilding, set
this in [ng-src/index.html](ng-src/index.html) before the app boots:

```html
<script>window.__ADMIN_API_BASE__ = 'https://api.example.com/api';</script>
```

---

## Languages and runtime configuration

The public blog holds **no user-facing text of its own**. Its strings, its brand name, its icons, its
topic cards and its footer links all come from the identity provider
(`window.__IDP_API_BASE__`, default `http://localhost:5000/api`) at runtime:

```
GET /api/config                        → brand, icons, links, topic cards, feature flags, languages
GET /api/i18n/manifest                 → per-language bundle versions (polled)
GET /api/i18n/bundle/hi?ns=common,blog,brand → the strings themselves
```

English and Hindi ship seeded, and the language picker appears in the navbar as soon as more than one
language is enabled. A visitor's choice is remembered locally; an untranslated string falls back to
English rather than rendering blank. Both fetches fail soft — if the API is unreachable the blog still
renders, using each component's built-in fallback.

Editing all of it happens on the admin app's **Localization** screen (languages, translations,
JSON/CSV/Excel import & export, and the configuration registry). The model, endpoints and validation
rules are documented in the admin repo: `admin/docs/LOCALIZATION.md`.

The client is the shared **`@keshavsingh3197/web-config`** package (repo `KeshavSingh-Packages-Web`) — the
same one the admin app and the portfolio use — wrapped by a thin signal-based adapter in
[ng-src/app/services/i18n.service.ts](ng-src/app/services/i18n.service.ts). Installing it needs
`PACKAGES_READ_TOKEN` (see `.npmrc`); before the first publish, `tsconfig.json` falls back to the
sibling checkout's `dist/`, so run `npm run build` in that repo once.

> The blog's own admin console (`/admin`) is still English-only — it reads the same catalogue, but its
> screens have not been migrated to it yet.

---

## Deploying (Render backend + GitHub Pages frontend)

The two halves deploy independently. **The frontend holds no secrets** — it's a static bundle,
so there is nothing sensitive to leak from GitHub Pages. Every secret lives only in Render's
environment. The only value the frontend needs is the API's public URL, which is not a secret.

### A. Backend → Render

Render builds the container from [server/Dockerfile](server/Dockerfile). In the service settings:

- **Language:** `Docker`
- **Branch:** `master`
- **Root Directory:** `server`  ← the Docker build context
- **Dockerfile Path:** `server/Dockerfile`

Render terminates TLS and injects `$PORT`; the app already binds to it and trusts the proxy headers.

Add these under **Render → your service → Environment** (never in the repo). .NET maps `:` to a
double underscore `__`:

| Env var | Example / notes |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Mongo__ConnectionString` | your MongoDB Atlas SRV string (mark **secret**) |
| `Mongo__Database` | `blog_admin` |
| `Jwt__SigningKey` | 32+ byte random string (mark **secret**) |
| `Encryption__DataKey` | Base64 of 32 random bytes — AES-256 key (mark **secret**) |
| `PACKAGES_READ_TOKEN` | GitHub PAT with `read:packages` so the Docker build can restore the private `KeshavSingh.*` NuGet packages (mark **secret/build secret**) |
| `Cors__AllowedOrigins__0` | `https://<you>.github.io` (your Pages origin, no trailing slash) |
| `Seed__AdminEmail` | `you@example.com` |
| `Seed__AdminPassword` | strong password, **rotate after first login** (mark **secret**) |
| `Email__*` / `Sms__*` | **optional — only seeds first-run defaults.** Email, SMS, and security thresholds are managed in **Admin → Settings** (stored in Mongo; secrets encrypted at rest). You can leave these unset and configure them in the UI. |

> **The running app only needs 3 app secrets in env**: `Mongo__ConnectionString`,
> `Jwt__SigningKey`, `Encryption__DataKey` (the AES key that decrypts everything else).
> These can't move to the DB — the connection string is needed *to reach* the DB, and the
> AES key must live outside the data it protects. Everything else lives in **Admin → Settings**
> with an Export/Import JSON backup. `PACKAGES_READ_TOKEN` is additionally required during the
> Docker build so `dotnet restore` can read the private GitHub Packages feed; the running app
> does not use it. For plain Docker builds, pass it as a BuildKit secret (for example
> `--secret id=PACKAGES_READ_TOKEN,env=PACKAGES_READ_TOKEN`).

> **MongoDB Atlas:** create a database user, and under *Network Access* allow Render's egress
> (simplest: `0.0.0.0/0` while testing, then tighten). Atlas enforces TLS by default.
>
> **Media persistence:** uploads are written to `App_Data/media` on the container's local disk,
> which Render **wipes on every deploy/restart**. For durable media, attach a **Render Disk**
> mounted at `/app/App_Data`, or move storage to object storage (S3 / Azure Blob) later.

### B. Frontend → GitHub Pages

1. Point the UI at your Render API by editing [ng-src/index.html](ng-src/index.html) — uncomment
   the line and set your URL (this is public, safe to commit):

   ```html
   <script>window.__ADMIN_API_BASE__ = 'https://YOUR-SERVICE.onrender.com/api';</script>
   ```

2. Build with the correct base href and publish `dist/` to Pages:

   ```bash
   npm run build            # base-href is already "/" (see package.json)
   # deploy the contents of dist/ to your gh-pages branch / Pages source
   ```

   Keep the existing `CNAME` if you use a custom domain. Routing uses hash URLs
   (`/#/admin/...`), so Pages needs no special rewrite rules.

3. In Render, make sure `Cors__AllowedOrigins__0` matches the exact origin the browser uses
   (your `github.io` subdomain **or** your custom domain).

### C. "Nothing exposed" checklist

- ✅ **No secrets in the repo** — `appsettings.json` ships with empty placeholders; real values
  come only from Render env vars. `.gitignore` already excludes `bin/`, `obj/`, `*.user`,
  `App_Data/`, and local secret files.
- ✅ **No secrets in the frontend bundle** — only the public API URL is embedded.
- ✅ **CORS is allow-listed** — only your Pages origin may call the API.
- ✅ **Transport is encrypted** — Render serves HTTPS; Atlas requires TLS; SMTP uses STARTTLS.
- ✅ **Secrets stay server-side** — the AES key that decrypts TOTP secrets and the JWT signing
  key live in Render's environment, never in Mongo or the client.
- 🔒 **Before going live:** sign in as the seeded admin, enable 2FA, then **rotate the seed
  password**. Consider clearing `Seed__AdminPassword` afterwards so it can't re-seed.

---

## Seeding the admin directly in MongoDB (scripts)

Besides the built-in `Seed__*` env vars, you can insert an admin **straight into Mongo**
using your connection string. All three variants below write the password with the exact
PBKDF2 scheme the API verifies, create the user as **Admin** with **2FA off** (so first login
forces authenticator setup), and won't overwrite an existing user's password.

**PowerShell** (lightest — computes the hash natively, only needs `mongosh` on PATH):

```powershell
cd server/scripts
./seed-admin.ps1 -Uri "mongodb+srv://user:pass@cluster.mongodb.net" `
                 -Email admin@keshavsingh.in -Password "a-strong-password" -DisplayName "Keshav Singh"
```

**Bash** (needs `mongosh` + `python3`):

```bash
cd server/scripts
./seed-admin.sh "mongodb+srv://user:pass@cluster.mongodb.net" admin@keshavsingh.in "a-strong-password" "Keshav Singh"
```

**Node** (self-contained — no `mongosh`, but runs `npm install` once):

```bash
cd server/scripts && npm install
node seed-admin.mjs "mongodb+srv://user:pass@cluster.mongodb.net" admin@keshavsingh.in "a-strong-password" "Keshav Singh"
```

> `mongosh` = the [MongoDB Shell](https://www.mongodb.com/try/download/shell). The Node version
> also prints fresh `Jwt__SigningKey` / `Encryption__DataKey` values for your Render env.

## First-login onboarding (temp password + forced 2FA)

- Users you create in the **Users & Roles** page get a **temporary password** and must set their
  own on first sign-in.
- Any user **without 2FA** is redirected to **Security & 2FA** and cannot use the rest of the
  console until an authenticator is enrolled.

---

## Roles

- **Admin** — full control, including user & role management
- **Editor** — create/edit/delete content and media
- **Viewer** — read-only access to the console

---

## Project layout

```text
ng-src/            Angular app
  app/             public blog components + services
  app/admin/       admin console (routes, guards, interceptor, pages)
src/               markdown content rendered by the blog
server/            .NET 8 Web API + MongoDB (admin backend)
structure.json     generated navigation tree for the blog
```

---

## Troubleshooting

- **API won't start / "Mongo:ConnectionString is not configured"** — you skipped Step 1; set the user-secrets.
- **Login works but images don't load** — make sure the API is running; media is served from `/api/media/...`.
- **CORS errors in the browser** — the API allows `http://localhost:4200` by default; add your origin under `Cors:AllowedOrigins` in [appsettings.json](server/Blog.Admin.Api/appsettings.json).
- **Locked out after a lost authenticator** — sign in with a **backup code**, or use the **email** fallback (configure SMTP under `Email:*`, or read the dev code from the API logs).

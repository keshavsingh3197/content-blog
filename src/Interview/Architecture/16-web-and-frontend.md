---
title: Web & Frontend
summary: HTTP and WebSockets, full-stack concerns, SPA design, and advanced React and Angular topics.
tags: [Architecture, Web, Frontend, Angular, React, Interview]
updated: 2026-09-02
---

# Web & Frontend

> HTTP evolution and real-time protocols, full-stack/BFF architecture, web fundamentals,
> SPA concepts, advanced React and Angular, framework choice, and frontend security —
> from a .NET-backend perspective.

## HTTP Versions

| Version | Transport | Key traits |
|---------|-----------|-----------|
| **HTTP/1.1** | TCP | Text; 1 request/connection at a time → **head-of-line (HOL) blocking**; keep-alive, pipelining (rarely used) |
| **HTTP/2** | TCP | Binary framing, **multiplexing** over one connection, header compression (HPACK), server push (deprecated); still TCP-level HOL blocking |
| **HTTP/3** | **QUIC (UDP)** | Multiplexing without TCP HOL blocking, built-in TLS 1.3, faster connection setup, connection migration |

## Real-Time / API Protocols

| Protocol | Direction | Use case |
|----------|-----------|----------|
| **REST** | Request/response | Standard CRUD APIs, cacheable, stateless |
| **SSE** | Server→client (one-way, over HTTP) | Live feeds/notifications, auto-reconnect |
| **WebSockets** | Full-duplex, persistent | Chat, live collaboration, games |
| **gRPC** | Uni/bi-directional streaming over HTTP/2, Protobuf | High-perf service-to-service |
| **SignalR** | Abstraction (WebSockets → SSE → long-polling fallback) | .NET real-time apps |

- **SignalR** is ASP.NET Core's real-time library; picks the best available transport automatically.
- **gRPC** is contract-first (`.proto`), compact & fast — great internal, weaker browser support (needs gRPC-Web).

## Full-Stack Architecture

- **SPA + API**: browser app (React/Angular) calls a stateless HTTP/JSON API (ASP.NET Core).
- **BFF (Backend-for-Frontend)**: a dedicated API per client (web/mobile) that aggregates/shapes downstream services and **handles auth** — keeps tokens off the browser (cookie-based), reduces chatty calls, tailors payloads.
- **Reverse proxy/gateway** (YARP, API Management) for routing, TLS, rate-limiting.

## HTML/CSS/JS Essentials

- **HTML**: semantic tags (`<header>`, `<main>`, `<nav>`), accessibility (ARIA, alt), forms.
- **CSS**: box model, **Flexbox** vs **Grid**, specificity/cascade, responsive (media queries), variables.
- **JS**: `let/const`, closures, prototypes, `this`, event loop (macro/microtasks), promises/`async-await`, ES modules, `==` vs `===`, hoisting.

## SPA Concepts

- **Routing** (client-side), **state management**, **code splitting / lazy loading** (load routes on demand), **bundling** (Vite/webpack), **tree-shaking**.
- **Rendering**: **CSR** (client-side), **SSR** (server-rendered HTML then **hydration**), **SSG** (build-time static), **ISR** (incremental). SSR/SSG improve first paint & SEO.
- **Core Web Vitals**: **LCP** (loading), **INP** (interactivity, replaced FID), **CLS** (visual stability).

## Advanced React

- **Hooks**: `useState`, `useEffect`, `useMemo`/`useCallback` (memoization), `useRef`, `useContext`; custom hooks for reuse. Rules: top-level, from components/hooks only.
- **Context** for cross-tree data (theme/auth) — avoid overuse (re-render cost).
- **Reconciliation**: virtual DOM diffing with **keys** to minimize real DOM updates; `React.memo` to skip re-renders.
- **State libs**: **Redux (Toolkit)** for large predictable state; **Zustand** for lighter, hook-based stores; React Query/TanStack for server state.
- **Next.js**: routing, SSR/SSG/ISR, server components, API routes — the leading React meta-framework.

## Advanced Angular

- **Building blocks**: Components, Modules (or **standalone components**, now default), Services, **DI** (hierarchical injectors).
- **RxJS**: Observables/operators for async streams; `async` pipe for auto subscribe/unsubscribe.
- **Change detection**: default (dirty-check tree) vs **OnPush** (only on input/ref change/events); **Signals** (fine-grained reactivity, Angular 16+) reduce zone reliance.
- **Lazy loading** feature routes; **RouterModule**; standalone `loadComponent`.

## React vs Angular

| | **React** | **Angular** |
|--|-----------|-------------|
| Type | Library (assemble ecosystem) | Full framework (batteries included) |
| Language | JS/TS + JSX | TS-first |
| Data flow | One-way, explicit | Two-way binding available |
| Reactivity | Hooks/state libs | RxJS + Signals |
| Fit | Flexibility, large ecosystem, SSR via Next.js | Large enterprise apps, opinionated structure |

- **Choose React** for flexibility, hiring pool, incremental adoption; **choose Angular** for large teams wanting consistency, DI, and an all-in-one toolset.

## Frontend Security

| Threat | What | Defense |
|--------|------|---------|
| **XSS** | Injected script runs in page | Output encoding, framework auto-escaping, **CSP**, sanitize HTML, avoid `dangerouslySetInnerHTML`/`bypassSecurityTrust` |
| **CSRF** | Forged authenticated request | Anti-forgery tokens, **SameSite** cookies, verify origin |
| **CORS** | Browser cross-origin policy | Server sets `Access-Control-Allow-Origin` explicitly (never blind `*` with credentials) |
| **CSP** | Content Security Policy header | Whitelist script/style sources; mitigates XSS/injection |

- Store tokens safely: prefer **HttpOnly, Secure, SameSite cookies** (BFF pattern) over `localStorage` (XSS-exposed). Always HTTPS/HSTS.

## Interview Q&A

**Q: HTTP/2 vs HTTP/3 — what problem does HTTP/3 solve?**
A: HTTP/2 multiplexes streams over one TCP connection but a lost packet still blocks all streams (TCP HOL blocking). HTTP/3 runs over QUIC/UDP with per-stream delivery, eliminating that, plus faster TLS 1.3 handshakes and connection migration.

**Q: When would you use WebSockets vs SSE vs gRPC?**
A: WebSockets for full-duplex, low-latency two-way (chat, collab); SSE for simple one-way server→client streams with auto-reconnect over plain HTTP; gRPC for high-performance, contract-first, streaming service-to-service (in .NET, SignalR abstracts real-time with transport fallback).

**Q: What is the BFF pattern and why use it?**
A: A Backend-for-Frontend is a per-client API that aggregates/shapes downstream services and owns authentication, keeping tokens in HttpOnly cookies off the browser, reducing round-trips and tailoring payloads to each UI.

**Q: CSR vs SSR vs SSG, and what is hydration?**
A: CSR renders in the browser (fast nav, slow first paint/SEO); SSR renders HTML on the server per request; SSG renders at build time. Hydration is attaching JS event handlers to server-rendered HTML to make it interactive.

**Q: How does React reconciliation work and how do you optimize re-renders?**
A: React diffs a virtual DOM against the previous tree, using keys to match list items, and applies minimal real-DOM changes. Optimize with stable keys, React.memo, useMemo/useCallback, and by splitting/co-locating state.

**Q: Angular default change detection vs OnPush vs Signals?**
A: Default dirty-checks the whole component tree on events; OnPush only re-checks when inputs change by reference, an event fires, or async pipe emits; Signals give fine-grained, dependency-tracked reactivity that updates only affected views.

**Q: How do you prevent XSS and CSRF?**
A: XSS: rely on framework escaping, apply a strict CSP, sanitize any raw HTML, avoid unsafe bypass APIs. CSRF: use anti-forgery tokens and SameSite cookies, and validate the request origin.

**Q: React vs Angular — how do you decide?**
A: React is a flexible library you compose with an ecosystem (Next.js for SSR), great for flexibility and hiring; Angular is an opinionated, TypeScript-first full framework with built-in DI, RxJS and tooling, suited to large enterprise teams wanting consistency.

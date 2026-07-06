# .NET Overview

> .NET is a free, open-source, cross-platform developer platform from Microsoft for building modern applications. Since **.NET 5** the "Core" branding was dropped and the product line was unified into a single **.NET** that ships once a year. The current release is **.NET 10** (LTS, released November 2025), which is supported for three years and ships with **C# 14**.
>
> The older, Windows-only **.NET Framework 4.8.x** is still supported for existing apps but is no longer receiving new features — all new development targets modern .NET.

## Common uses of .NET

- **Web development** — Build web APIs, real-time apps and full-stack web UIs with **ASP.NET Core** (MVC, Razor Pages, Minimal APIs) and **Blazor** (server, WebAssembly, or hybrid).

- **Cloud-native & microservices** — Build containerized microservices and serverless apps that run on Azure, AWS, or Google Cloud. **.NET Aspire** provides an opinionated stack for orchestrating, observing and deploying distributed apps.

- **Desktop development** — Build cross-platform desktop apps with **.NET MAUI** or **Blazor Hybrid**, and Windows desktop apps with **WPF** and **Windows Forms**.

- **Mobile app development** — Build native iOS and Android apps with **.NET MAUI**, the successor to Xamarin (Xamarin reached end of support in May 2024).

- **Machine learning & AI** — Use **ML.NET** for custom models and the **Microsoft.Extensions.AI** libraries / **Semantic Kernel** to integrate LLMs and AI services into .NET apps.

- **Game development** — Build games with **Unity** or **Godot**, both of which use C#.

- **Cross-platform tooling & CLIs** — Ship command-line tools and, in .NET 10, run single-file, project-less C# apps directly with `dotnet run app.cs`.

> With its unified, modular architecture and cross-platform runtime, .NET is a versatile platform that spans the web, cloud, desktop, mobile, AI and gaming.

---

## Modular architecture

Modular architecture (a.k.a. modular design) emphasizes splitting a system into independent, self-contained components. Each module performs a specific task and can be combined with others to form a larger system.

The main goal is to improve maintainability, scalability and flexibility by breaking a complex system into smaller, manageable parts. Each module can be developed, tested and deployed independently, and replaced or updated without affecting the rest of the system.

Modules communicate through well-defined interfaces that specify how data is exchanged. This reduces coupling and makes integration and testing easier. In .NET this shows up as small, composable NuGet packages and the `Microsoft.Extensions.*` libraries (dependency injection, configuration, logging, hosting).

---

## Characteristics of .NET

1. **Cross-platform** — Runs on Windows, macOS and Linux (x64, Arm64), plus WebAssembly and mobile, so the same code base deploys across environments.

2. **Open-source** — Developed in the open under the .NET Foundation. The source is on GitHub and the community contributes actively.

3. **Unified & modular** — One platform (`net10.0`) targets many app types. Functionality is delivered as small, independent NuGet packages you compose as needed.

4. **High performance** — Tiered JIT compilation, an efficient generational garbage collector, `Span<T>`/`Memory<T>` for low-allocation code, and **Native AOT** for fast startup and small, self-contained binaries. First-class `async`/`await` enables highly scalable, responsive apps.

5. **Security** — Built-in support for authentication/authorization, data protection and cryptography, including expanded post-quantum cryptography (ML-DSA, ML-KEM) in .NET 10.

6. **Developer productivity** — A rich CLI (`dotnet`), first-class tooling in Visual Studio 2026, VS Code (C# Dev Kit) and JetBrains Rider, hot reload, and multiple languages (C#, F#, Visual Basic).

> Together these traits make .NET a popular choice for building modern, high-performance applications across platforms and devices.

---

## What is ASP.NET Core?

1. **ASP.NET Core** is Microsoft's open-source, high-performance web framework for building modern web apps and services. (The name keeps the "Core" suffix — it is **not** shortened to "ASP.NET".)
2. First released in 2016 as a ground-up redesign of the classic ASP.NET, it is modular, leaner and cross-platform (Windows, macOS, Linux).
3. It unifies MVC, Razor Pages, Web API and Blazor into a single request pipeline, and runs on modern .NET (the current release is **ASP.NET Core 10.0**).

> ASP.NET Core provides a wide range of features and tools for building web applications, including:

1. **Middleware pipeline** — HTTP requests and responses flow through configurable middleware components you can add or remove to customize behavior.

2. **Built-in dependency injection** — A first-class DI container simplifies managing dependencies and writing testable code.

3. **Minimal APIs** — Define HTTP endpoints with minimal ceremony (`app.MapGet(...)`), ideal for microservices and small services.

4. **MVC & Razor Pages** — A flexible Model-View-Controller framework and page-focused Razor Pages model for server-rendered UIs, with Tag Helpers and Razor views.

5. **Blazor** — Build interactive web UIs in C# instead of JavaScript, running on the server, on WebAssembly, or in a hybrid/auto render mode.

6. **Web APIs & OpenAPI** — Build RESTful services with built-in OpenAPI document generation.

7. **Authentication & authorization** — Built-in support for JWT bearer tokens, OAuth/OpenID Connect and ASP.NET Core Identity (including passkey/WebAuthn support added in .NET 10).

> Overall, ASP.NET Core is a versatile web framework that gives developers a broad set of features and tools for building modern web applications and APIs.

---

## Version reference

| Release | Type | Shipped | Language |
| --- | --- | --- | --- |
| .NET 10 | LTS | Nov 2025 | C# 14 |
| .NET 9  | STS | Nov 2024 | C# 13 |
| .NET 8  | LTS | Nov 2023 | C# 12 |

> **STS** (Standard Term Support) releases are supported for 18 months; **LTS** (Long Term Support) releases for 3 years. Prefer LTS releases for production unless you need a newer feature.

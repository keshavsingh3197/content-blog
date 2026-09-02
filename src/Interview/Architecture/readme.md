---
title: Architecture & Senior Track
summary: An 18-chapter senior/architect interview track — language fundamentals, design, data, distributed systems, cloud, delivery and NFRs, all in C# / .NET 10.
tags: [Interview, Architecture, System-Design, .NET, Azure]
updated: 2026-09-02
---

# Architecture & Senior Track

> An 18-chapter senior/architect-level study track, mapped from a competency framework covering
> language fundamentals, design, data, distributed systems, cloud and delivery.
> Code examples target **C# / .NET 10**; Java-specific terms from the source list are
> mapped to their .NET equivalents (e.g. `CompletableFuture` → `Task`,
> *Functional Interface* → `delegate`/`Func<>`, *streams* → **LINQ**,
> *Fork/Join* → **TPL / Parallel**, *JMS* → **Azure Service Bus / MassTransit**).

## How to use this track

Each file is a self-contained, exam-ready summary: crisp definitions, why it matters,
key points, common interview questions, and C#/.NET specifics. Work top to bottom, or
jump to a weak area.

## Contents

### Foundations
- [01 — Language Fundamentals](01-language-fundamentals.md) — types, generics, lambdas & delegates (functional interfaces), LINQ (streams), predicates, records, boxing, internals.
- [02 — Collections & Data Structures](02-collections-and-data-structures.md) — collection types, Big-O, advanced/concurrent collection internals.
- [03 — SOLID & Design Principles](03-solid-and-design-principles.md) — SOLID, DRY/KISS/YAGNI, coupling & cohesion.
- [04 — GOF Design Patterns](04-design-patterns-gof.md) — creational / structural / behavioural, with standard C# solutions.

### Runtime & Quality
- [05 — Concurrency & Multithreading](05-concurrency-and-multithreading.md) — threads, `Task`/async, TPL & parallel (Fork/Join), deadlocks, locks, `ThreadLocal`, PLINQ, lazy streams.
- [06 — Memory, GC & Profiling](06-memory-gc-and-profiling.md) — GC generations & algorithms, `IDisposable`/finalizers, dump analysis, profilers.
- [13 — Testing & Quality](13-testing-and-quality.md) — TDD, unit/functional/integration, BDD, automation (SIT/security/prod), tooling.

### Data & APIs
- [07 — Databases & ORM](07-databases-and-orm.md) — RDBMS vs NoSQL, joins, indexing, EF Core, entity modelling, aggregates, CDC.
- [08 — REST & API Design](08-rest-and-api-design.md) — REST principles, OpenAPI (OAS), contract-first, versioning, pagination, mocking, code generation.
- [11 — API Security](11-api-security.md) — Basic/Client-Credentials/JWT, Auth Code + PKCE, OIDC, IAM, API gateway policies & architecture.

### Distributed Systems & Architecture
- [09 — Messaging & Eventing](09-messaging-and-eventing.md) — pub/sub vs queue, durability, tracing, schemas, AMQP/Kafka, broker internals, event-driven.
- [10 — Microservices Patterns](10-microservices-patterns.md) — orchestration vs choreography, DDD & bounded context, Saga/compensation, CQRS, event sourcing, DB strategies.
- [17 — Architecture & NFRs](17-architecture-and-nfrs.md) — NFRs, data at rest/in motion/in use, multi-tenancy, multi-geo/brand, scale, layering, views, deployment checklist, canary.
- [18 — NFR Deep Dive](18-nfr-deep-dive.md) — the eight NFRs one level deeper: measurable targets, the .NET/Azure lever for each, RTO/RPO, and a worked e-commerce example.

### Platform & Delivery
- [12 — Cloud Architecture](12-cloud-architecture.md) — deployment models, serverless & storage, IaC (Terraform/Bicep/ARM), cloud-native web & data integration, networking, monitoring.
- [14 — DevOps & CI/CD](14-devops-and-cicd.md) — CI/CD, MSBuild, Jenkins, quality gates, Docker, Kubernetes, pipelines, Chef/Ansible, branching, multi-geography.
- [15 — Observability & Monitoring](15-observability-and-monitoring.md) — logs/metrics/traces, OpenTelemetry, ELK, Grafana/Prometheus, APM/COTS tools.
- [16 — Web & Frontend](16-web-and-frontend.md) — HTTP/WebSockets, full-stack, SPA design, advanced React & Angular.

> Related deep-dives already in this blog: [C#](../CSharp-DotNet/readme.md), [Modern C#](../../CSharp/modern-csharp.md), [GOF patterns](../../GOF/GOF.md), [SQL](../../SQL/sql.md), [Azure](../../Azure/azure.md), [AWS](../../AWS/aws.md), [Containerization](../../Containerization/K8/k8.md).

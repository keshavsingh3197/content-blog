---
title: Architecture & NFRs
summary: The NFR catalogue, securing data in three states, multi-tenancy, multi-geo and residency, scaling, architecture views, layering and the deployment checklist.
tags: [Architecture, NFR, System-Design, Interview]
updated: 2026-09-02
---

# Architecture & NFRs

> The cross-cutting "-ilities", how to secure and scale data, architecture views and layering,
> and what it takes to ship and keep a system running. Context: **C# / .NET 10** on Azure.

## Non-functional requirements (NFR catalogue)

> 📖 One level deeper on every row below — measurable targets, the .NET/Azure lever that delivers
> each one, RTO/RPO and a worked example — is in [18 — NFR Deep Dive](18-nfr-deep-dive.md).

| NFR | Question it answers | Levers / .NET & Azure |
|---|---|---|
| **Performance** | How fast per request? | Latency/throughput budgets, caching, async I/O |
| **Scalability** | Handle more load? | Horizontal scale, stateless, sharding |
| **Availability** | % uptime (SLA)? | Redundancy, multi-AZ/region, health probes |
| **Reliability** | Correct under failure? | Retries, circuit breakers (Polly), idempotency |
| **Security** | Confidentiality/integrity? | AuthN/Z, encryption, least privilege |
| **Maintainability** | Cost to change? | Clean layering, tests, modularity |
| **Observability** | Can we see inside? | Logs, metrics, traces (OpenTelemetry) |

- NFRs are **architecturally significant** — they shape structure more than features do.
- Make them **measurable**: "p99 < 200 ms", "99.95% monthly", "RTO 1h / RPO 5 min".

## Securing data in three states

| State | Threat | Controls |
|---|---|---|
| **At rest** | Stolen disk/backup/DB | **TDE**, disk & **field-level encryption**, keys in **Azure Key Vault**/HSM |
| **In motion** | Network sniffing/MITM | **TLS** everywhere, **mTLS** service-to-service, cert rotation |
| **In use** | Memory scraping, insider | **Confidential computing / enclaves** (SGX), **tokenization**, data masking |

- **TDE** encrypts the database files transparently (SQL/Azure SQL).
- **Tokenization** replaces sensitive values (PAN) with tokens; the vault holds the mapping.
- Prefer **customer-managed keys (CMK)** in Key Vault for regulated data.

## Multi-tenancy models

| Model | Isolation | Cost/density | Noisy-neighbour |
|---|---|---|---|
| **Silo** (DB/stack per tenant) | Strongest | Low density, high cost | None |
| **Pool** (shared, `TenantId` column) | Logical only | Highest density | Risk — needs throttling/quotas |
| **Bridge** (shared app, DB/schema per tenant) | Medium | Medium | Reduced |

- **Tenant isolation** — enforce on every query (row-level security, tenant-scoped repos) so
  one tenant can never read another's data.
- **Noisy neighbour** — one tenant's load degrades others in pooled models; mitigate with
  rate limits, resource quotas, and moving heavy tenants to silos.

## Multi-geography / multi-brand & data residency

- **Multi-geo** — deploy to multiple regions for latency and availability; route via
  Traffic Manager / Front Door. Active-active or active-passive.
- **Data residency** — laws (GDPR) may require data stays in-region; **shard/partition by
  region** so EU data lives in EU. Replicate metadata, keep PII local.
- **Multi-brand** — one platform serving several brands: a form of multi-tenancy with per-brand
  config, theming and possibly data isolation.

## Scaling

- **Vertical** (scale up) — bigger machine; simple but capped and a single point of failure.
- **Horizontal** (scale out) — more instances; near-linear, resilient — requires **stateless** design.
- **Stateless design** — no session in-process; externalise state to Redis/DB so any instance
  serves any request (enables autoscaling and rolling deploys).
- **Sharding** — partition data by key (e.g. tenant/geo) across DBs for write scale.
- **Caching layers** — in-memory (`IMemoryCache`) -> distributed (Redis) -> **CDN** for static/
  edge content. Mind invalidation and staleness.

```text
Client -> CDN -> Front Door/LB -> [stateless app instances] -> Redis -> sharded DB
```

## Architecture views

- **4+1 model** (Kruchten): **Logical** (functionality/classes), **Process/Interaction**
  (concurrency, sequence), **Development/Component** (modules, packaging),
  **Physical/Deployment** (nodes, topology), **+ Scenarios** (use cases tying them together).
- **C4 model** — nested diagrams: **Context** -> **Container** -> **Component** -> **Code**;
  the modern, pragmatic way to document architecture.
- Common concrete views: **logical view**, **sequence/interaction view**,
  **component/deployment view**.

## Application layering

- Classic layers: **Presentation** -> **Application** -> **Domain** -> **Infrastructure**.
- **Hexagonal (Ports & Adapters)** — domain at the centre; external tech plugs in via adapters.
- **Onion / Clean Architecture** — dependencies point **inward**; domain depends on nothing,
  infrastructure depends on abstractions (**Dependency Inversion**).

```text
        Presentation (API/UI)
            |
        Application (use cases)
            |
        Domain (entities, rules)   <- no outward dependencies
            ^
        Infrastructure (EF, ASB, HTTP)  -> implements domain interfaces
```

- Benefit: domain is testable and framework-agnostic; swap DB/broker without touching business logic.

## Slowly Changing Dimensions (SCD)

| Type | Behaviour |
|---|---|
| **Type 0** | Never changes (fixed/original value) |
| **Type 1** | Overwrite; no history |
| **Type 2** | New row per change + effective dates/version -> full history |
| **Type 3** | Add "previous value" column -> limited history |
| **Type 4** | History moved to a separate history table |
| **Type 6** | Hybrid 1+2+3 (combines overwrite, new row and prior-value column) |

- Type 2 is the workhorse for data-warehouse dimension history.

## BCD / BCDR — continuity & disaster recovery

- **RPO (Recovery Point Objective)** — max acceptable **data loss** (how far back). Drives backup/replication frequency.
- **RTO (Recovery Time Objective)** — max acceptable **downtime** (how fast to recover).
- Strategy tiers (cost vs speed): **backup & restore** -> **pilot light** -> **warm standby**
  -> **active-active/multi-region**. Test with **DR drills / failover exercises**.

```text
        <---- RPO ---->[outage]<---- RTO ---->
   last good backup    failure     service restored
```

## Production deployment checklist

- Config & secrets externalised (Key Vault), no secrets in code.
- Health/readiness/liveness probes; graceful shutdown & connection draining.
- Autoscale rules, resource limits/quotas set.
- Observability: structured logs, metrics, traces, dashboards, **alerts** wired.
- **Backups + tested restore**, DR runbook, RPO/RTO validated.
- Security: TLS, least-privilege identities (managed identity), dependency/vuln scan.
- **Rollback plan** and feature flags; DB migrations backward-compatible.
- Load/perf test passed against SLOs; runbook & on-call ready.

## Release strategies

| Strategy | How | Trade-off |
|---|---|---|
| **Rolling** | Replace instances in batches | No extra infra; mixed versions briefly |
| **Blue-Green** | Two full envs; switch traffic | Instant rollback; double infra cost |
| **Canary** | Route small % to new version, ramp up | Safest; needs good metrics & routing |

- Pair with **feature flags** to decouple deploy from release.

## End-to-end solution detailing

- Trace a request across all layers/views: client -> CDN/gateway (authN, rate limit) ->
  stateless service (domain logic) -> cache/DB/broker -> downstream services, with cross-cutting
  security, observability and resilience applied throughout. In interviews, drive from NFRs and
  the 4+1/C4 views to justify each choice.

## Interview Q&A

1. **What are NFRs and why do they matter?** The quality attributes (performance, scalability,
   availability, security, etc.) that constrain *how* the system behaves. They shape architecture
   more than features and must be measurable (SLOs).
2. **How do you secure data in use?** Beyond at-rest (TDE/Key Vault) and in-motion (TLS/mTLS),
   protect data while processed via confidential computing/enclaves, tokenization and masking.
3. **RPO vs RTO?** RPO is the maximum tolerable data loss (drives backup frequency); RTO is the
   maximum tolerable downtime (drives recovery architecture). Together they set the DR budget.
4. **Silo vs pool multi-tenancy?** Silo gives strong isolation at low density/high cost; pool
   shares infra for high density but risks noisy neighbours and needs strict tenant isolation and throttling.
5. **Canary vs blue-green?** Blue-green switches all traffic between two full environments
   (instant rollback, double cost); canary shifts a small percentage first and ramps up, catching issues with least blast radius.
6. **Why stateless services?** State in-process blocks horizontal scaling and safe rolling
   deploys; externalising it (Redis/DB) lets any instance handle any request and enables autoscaling.
7. **Clean/Onion architecture benefit?** Dependencies point inward via dependency inversion, so
   the domain is framework-agnostic and testable and infrastructure (DB, broker) is swappable.
8. **How do you handle data residency across geographies?** Shard/partition data by region so
   regulated data stays in-region, route users regionally (Front Door), and replicate only non-restricted metadata.

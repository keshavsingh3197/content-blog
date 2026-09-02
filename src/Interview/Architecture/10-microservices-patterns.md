---
title: Microservices Patterns
summary: Orchestration vs choreography, DDD and bounded contexts, Saga and compensation, CQRS, event sourcing and database strategies.
tags: [Architecture, Microservices, DDD, CQRS, Interview]
updated: 2026-09-02
---

# Microservices Patterns

> Coordinating independent services: orchestration vs choreography, DDD building blocks,
> distributed transactions (Saga, outbox), CQRS and Event Sourcing — all in **C# / .NET 10**.

## Orchestration vs Choreography

- **Orchestration** — a central coordinator (workflow/saga orchestrator) tells each service
  what to do and awaits results. Explicit, easy to monitor, but a coupling hotspot.
- **Choreography** — services react to each other's **events**; no central brain. Highly
  decoupled but harder to visualise and debug end-to-end.

```text
Orchestration                         Choreography
Orchestrator                          OrderSvc --OrderPlaced--> (bus)
 |-> Payment (charge)                     PaymentSvc --Paid--> (bus)
 |-> Inventory (reserve)                     ShippingSvc --Shipped--> (bus)
 |-> Shipping (ship)                  (each reacts to events, no coordinator)
```

| | Orchestration | Choreography |
|---|---|---|
| Control | Central | Distributed |
| Coupling | Higher (to orchestrator) | Lower |
| Visibility | Easy (one place) | Harder (spread across events) |
| Change | Edit orchestrator | Add/adjust subscribers |
| Best for | Complex, ordered flows | Simple, evolving, loosely-coupled flows |

## Command pattern (distributed)

- Encapsulate a request as an object/message (`ChargePayment`) sent to a single owner.
- In distributed systems the Command pattern becomes an **async command message** on a queue;
  combine with a handler and (for undo) a **compensating command**.

## Domain-Driven Design (DDD)

- **Bounded Context** — an explicit boundary where a model and its terms are consistent; often
  maps 1:1 to a microservice. "Customer" can mean different things in Sales vs Support contexts.
- **Ubiquitous Language** — shared vocabulary between devs and domain experts, used in code, tests and conversation.
- **Entity** — has identity that persists over time (`Order` with `OrderId`); mutable.
- **Value Object** — defined by its attributes, no identity, **immutable** (`Money`, `Address`);
  compared by value. In .NET, `record` types fit well.
- **Aggregate** — a cluster of entities/VOs treated as one unit of consistency.
- **Aggregate Root** — the single entry point; external code references only the root, which
  enforces invariants. One transaction should modify one aggregate.

```c#
// Aggregate root guards invariants; value object is immutable
public record Money(decimal Amount, string Currency);

public class Order // aggregate root (entity)
{
    private readonly List<OrderLine> _lines = new();
    public Guid Id { get; }
    public Money Total => new(_lines.Sum(l => l.Subtotal.Amount), "USD");

    public void AddLine(Product p, int qty)     // behaviour lives on the model
    {
        if (qty <= 0) throw new DomainException("Qty must be positive");
        _lines.Add(new OrderLine(p.Id, qty, p.Price));
    }
}
```

### Rich (Fat) vs Anemic domain model

| | **Rich / Fat domain** | **Anemic domain** |
|---|---|---|
| Behaviour | Lives on the entities | In service/manager classes |
| Data | Encapsulated, invariants enforced | Public getters/setters (DTO-like) |
| Verdict | DDD-preferred | Considered an anti-pattern (logic leaks out) |

## Distributed transactions

### Why 2PC is avoided

- **Two-Phase Commit** needs a coordinator + locks held across services -> **blocking**,
  poor availability, doesn't scale, and NoSQL/queues often don't support it. A coordinator
  failure can leave resources locked. Microservices prefer **eventual consistency**.

### Saga pattern

- A **Saga** is a sequence of local transactions; each publishes an event/command triggering
  the next. On failure it runs **compensating transactions** to undo prior steps.
- **Orchestration-based saga** — central orchestrator drives steps and compensations.
- **Choreography-based saga** — services listen to events and compensate reactively.

```text
Book Hotel -> Book Flight -> Book Car
   |             |             X fails
   |             +-- Cancel Flight (compensate)
   +-- Cancel Hotel (compensate)
```

- **Compensating transaction** — a semantic undo (`RefundPayment`, `ReleaseInventory`), not a
  DB rollback; must itself be idempotent and may be "best effort".

### Outbox pattern

- Problem: you cannot atomically write to the DB **and** publish to a broker (dual-write).
- Solution: in the **same DB transaction**, write the state change **and** an `OutboxMessage`
  row. A relay/poller (or CDC) publishes outbox rows to the broker, then marks them sent.
- Guarantees at-least-once publishing; pair with idempotent consumers. Supported by MassTransit
  transactional outbox and EF Core.

```text
[TX] update Order + insert Outbox row  --commit-->
Relay: read unsent Outbox -> publish -> mark sent (retries safe)
```

## CQRS (Command Query Responsibility Segregation)

- Separate the **write model** (commands, validation, domain logic) from the **read model**
  (queries, denormalised DTOs optimised for display).
- **When to use** — high read/write ratio, complex reads, different scaling needs. Overkill for
  simple CRUD.
- **Database-per-model** — writes to a normalised store; reads from denormalised/materialised
  views kept in sync via events -> **eventual consistency** between them.
- **API/deployment implications** — read and write sides can be separate services, scaled and
  deployed independently; read replicas can be scaled out heavily.

```c#
// Command (write) and Query (read) handled separately (e.g. MediatR)
public record PlaceOrder(Guid CustomerId, ...) : IRequest<Guid>;   // mutates
public record GetOrderSummary(Guid OrderId) : IRequest<OrderDto>;  // reads
```

## Event Sourcing

- Store state as an **append-only sequence of events**; the **event store is the source of truth**.
  Current state = fold/replay of events.
- **Projections** — build read models by replaying events into queryable views (pairs with CQRS).
- **Snapshots** — periodic saved state so replay doesn't start from event 0 (perf).
- **Replay** — rebuild any projection or a past state; full audit trail for free.
- **DB choice** — a dedicated event store (EventStoreDB, Marten on PostgreSQL, Cosmos DB append).
- Trade-offs: powerful audit/temporal queries, but added complexity, versioning of old events,
  and eventual consistency of projections.

## DB strategy: single-DB vs DB-per-service

| | **DB-per-service** | **Shared DB** |
|---|---|---|
| Coupling | Loose; independent schemas | Tight; schema is a shared contract |
| Autonomy | Deploy/scale/choose tech freely | Constrained |
| Transactions | Cross-service = saga/eventual | Easy ACID within DB |
| Reporting | Needs aggregation (CQRS/warehouse) | Simple joins |
| Verdict | **Microservices default** | Convenient but an anti-pattern at scale |

## Idempotency & eventual consistency

- **Idempotency** — safe to retry; dedupe by message/business id. Essential given at-least-once
  delivery and saga retries.
- **Eventual consistency** — replicas/read models converge over time; embrace it since 2PC is
  avoided. Design UX for it (optimistic UI, "processing" states) and detect conflicts.

## Interview Q&A

1. **Orchestration vs choreography — trade-offs?** Orchestration centralises control (clear,
   monitorable, but coupled to the orchestrator); choreography is event-driven and loosely
   coupled but harder to trace. Use orchestration for complex ordered flows, choreography for simple evolving ones.
2. **Why not 2PC across microservices?** It's blocking, holds locks across services, hurts
   availability/scale and isn't widely supported. Use sagas with compensating transactions and eventual consistency instead.
3. **What is the outbox pattern solving?** The dual-write problem — writing to the DB and
   publishing an event atomically. Persist the event in the same transaction, then relay it, giving reliable at-least-once publishing.
4. **Entity vs Value Object?** An entity has a persistent identity and is mutable; a value
   object is immutable and compared by its attributes (`record` in C#).
5. **When is CQRS worth it?** When reads and writes have very different shapes, complexity or
   scale. Avoid it for simple CRUD — it adds moving parts and eventual consistency.
6. **Event sourcing vs storing current state?** Event sourcing stores every change as an
   immutable event (full audit, replay, temporal queries) at the cost of complexity, event
   versioning and projection lag; state-based storage is simpler but loses history.
7. **What is a compensating transaction?** A semantic undo of a completed saga step
   (`RefundPayment`), not a DB rollback; it must be idempotent and is triggered when a later step fails.
8. **Aggregate root — why?** It's the single consistency boundary and entry point; external
   code references only the root, which enforces all invariants, and one transaction should touch one aggregate.

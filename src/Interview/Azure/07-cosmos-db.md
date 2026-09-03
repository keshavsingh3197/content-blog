---
title: Azure Cosmos DB
summary: Partitioning and the 20 GB logical-partition ceiling, Request Units, the five consistency levels and what each costs, indexing policies, the change feed, and the .NET v3 SDK patterns that keep RU charges down.
tags: [Azure, Cosmos-DB, NoSQL, Partitioning, .NET, Interview]
updated: 2026-09-03
---

# 07 — Cosmos DB

> **Scope:** the NoSQL question. Resource model, partition-key design, RU/s, the five consistency
> levels, indexing, the change feed and the `Microsoft.Azure.Cosmos` v3 SDK.
> Related: [Databases & ORM](../Architecture/07-databases-and-orm.md) ·
> [SQL track](../SQL/readme.md) for the relational contrast.

---

## Resource model and APIs

```text
Account  →  Database  →  Container  →  Item
```

A **container** is the unit of scale and of throughput; an **item** is a JSON document with a
partition key and an `id` (unique *within* the logical partition).

| API | Data model | Pick it when |
| --- | --- | --- |
| **NoSQL** (Core) ⭐ | JSON documents, SQL-like query | New work — the only API with every feature first |
| MongoDB | BSON, Mongo wire protocol | Migrating a Mongo app |
| Cassandra | Wide column, CQL | Migrating Cassandra |
| Gremlin | Graph | Relationship traversal |
| Table | Key/value | Upgrading Azure Table Storage |

## Partitioning — the decision everything else depends on

- **Logical partition** = every item sharing a partition-key value. Hard limits: **20 GB** and
  **10,000 RU/s**. A single value that outgrows either cannot be split — the container is stuck.
- **Physical partition** = the machine holding one or more logical partitions; Cosmos splits and
  rebalances these for you.
- **Cross-partition query** fans out to every physical partition: more RUs, higher latency. A query
  with the partition key in the `WHERE` clause hits exactly one.

A good partition key is:

1. **High cardinality** — many distinct values (`/tenantId` in a 5-tenant system is not).
2. **Evenly distributed** for both storage *and* request volume — no hot partition.
3. **Present in your most common queries**, so reads stay single-partition.

| Anti-pattern | Why it hurts | Better |
| --- | --- | --- |
| `/date` or a timestamp | All of today's writes hit one partition | `/deviceId` (+ date in the id) |
| `/status` (`open`/`closed`) | Two values, unbounded growth | `/orderId` or `/customerId` |
| `/id` on a container you query by customer | Even, but every read fans out | `/customerId` |
| One monster tenant on `/tenantId` | 20 GB ceiling, hot partition | **Hierarchical** `/tenantId` + `/userId` |

**Hierarchical (sub)partition keys** (up to three levels, NoSQL API, v3 SDK) let a prefix exceed
20 GB / 10,000 RU/s while still routing prefix queries to a subset of partitions — the standard answer
to multi-tenant skew. There is no repartitioning: you pick the key at container creation and a change
means a new container plus a migration.

## Request Units

An **RU** is the normalised currency of CPU + IOPS + memory. Everything is billed in RUs, and the
charge comes back on every response.

| Operation | Rough cost |
| --- | --- |
| Point read (`ReadItemAsync`, 1 KB item, by id **and** partition key) | **~1 RU** |
| Single-partition query | a few RUs, grows with result size |
| Cross-partition query | fan-out × per-partition cost |
| Write / upsert (1 KB) | ~5 RUs, more with more indexed properties |

| Throughput mode | Shape | Use for |
| --- | --- | --- |
| **Manual (provisioned)** | Fixed RU/s (min 400 per container) | Steady, predictable load |
| **Autoscale** | Scales 10%–100% of a max you set | Spiky load; ~50% premium per RU but no over-provisioning |
| **Serverless** | Pay per request, no floor | Dev/test, low or very bursty traffic |

Throughput is set **per container** or shared at the **database** level (shared throughput is split
across containers — fine for many small ones, bad if one is hot). Exceed it and you get **HTTP 429**
with `x-ms-retry-after-ms`; the SDK retries automatically (`MaxRetryAttemptsOnRateLimitedRequests`),
but sustained 429s mean the RU budget or the partition key is wrong.

```csharp
var response = await container.ReadItemAsync<Order>(id, new PartitionKey(customerId), cancellationToken: ct);
logger.LogInformation("Read cost {RU} RU", response.RequestCharge);   // log it in dev; it is the tuning signal
```

## Consistency levels

Five levels, set on the account and **relaxable per request** (never strengthened above the account
default, except via the newer read-consistency strategy in recent SDKs):

| Level | Guarantee | Read RU | Notes |
| --- | --- | --- | --- |
| **Strong** | Linearizable — always the latest committed write | ~2× | ❌ not available with **multi-region writes**; latency across regions |
| **Bounded staleness** | Lags by at most K versions or T seconds | ~2× | Predictable staleness bound; good for read replicas |
| **Session** ⭐ (default) | **Read your own writes** within a session token | 1× | The right default for user-facing apps |
| **Consistent prefix** | Never see writes out of order; may be stale | 1× | Ordered event replay |
| **Eventual** | No ordering guarantee | 1× | Counters, likes, telemetry |

- The trade is the usual one: stronger consistency ⇒ higher latency, lower availability, **about twice
  the read RU cost**.
- **Session tokens are per logical partition.** If you round-robin requests across app instances and
  want read-your-writes, flow the token (`response.Headers.Session` → `ItemRequestOptions.SessionToken`)
  or you silently get eventual behaviour.

## Indexing

Every property is indexed by default — convenient, and the reason writes cost more than they need to.
Tune the **indexing policy**:

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [{ "path": "/customerId/?" }, { "path": "/status/?" }, { "path": "/createdUtc/?" }],
  "excludedPaths": [{ "path": "/*" }, { "path": "/payload/*" }],
  "compositeIndexes": [[
    { "path": "/customerId", "order": "ascending" },
    { "path": "/createdUtc", "order": "descending" }
  ]]
}
```

- **Exclude first, include what you query** — the inverse of the default — when write cost matters.
- **Composite indexes** are required for `ORDER BY` on multiple properties and speed up filter+sort.
- `indexingMode: "none"` for pure key/value lookups; `"lazy"` is deprecated for most uses.
- **TTL**: set `defaultTtl` on the container (seconds, `-1` = enabled but no expiry) and `ttl` per
  item. Expiry deletion consumes leftover RUs and is free of charge in the sense that it uses spare
  throughput — it is the cheapest way to age out data.

## Transactions

- **Transactional batch** — ACID across items **in the same logical partition**, up to 100 operations
  / 2 MB. This is the everyday answer.
- **Stored procedures / triggers / UDFs** in JavaScript — also single-partition, and rarely worth the
  operational cost now that batch exists.
- **No cross-partition transactions.** Cross-aggregate consistency is a saga, not a transaction — see
  [microservices patterns](../Architecture/10-microservices-patterns.md).

```csharp
var batch = container.CreateTransactionalBatch(new PartitionKey(customerId))
    .CreateItem(order)
    .PatchItem(cartId, [PatchOperation.Set("/status", "converted")]);

using var result = await batch.ExecuteAsync(ct);
if (!result.IsSuccessStatusCode) throw new InvalidOperationException($"Batch failed: {result.StatusCode}");
```

## Change feed

A persistent, ordered (per partition) log of creates and updates. Three ways to read it:

| Way | Shape | Use |
| --- | --- | --- |
| **Change feed processor** (v3 SDK) ⭐ | Push, needs a **lease container**, at-least-once, fault-tolerant, auto load-balances | Long-running workers |
| **Azure Functions Cosmos DB trigger** | The processor, hosted for you | Serverless reactions |
| **Pull model** | You drive the iteration and checkpoints | Batch/backfill, custom checkpoints |

Modes: *latest version* (the default — the current state of changed items, **no deletes**) and
*all versions and deletes* (intermediate versions plus deletes, retention-bounded). If you need
deletes in the default mode, soft-delete with a flag + TTL.

```csharp
var processor = container
    .GetChangeFeedProcessorBuilder<Order>("order-projector", HandleChangesAsync)
    .WithInstanceName(Environment.MachineName)   // must be unique per instance
    .WithLeaseContainer(leaseContainer)
    .WithPollInterval(TimeSpan.FromSeconds(1))
    .Build();

await processor.StartAsync();

async Task HandleChangesAsync(ChangeFeedProcessorContext ctx, IReadOnlyCollection<Order> changes, CancellationToken ct)
{
    foreach (var order in changes)
    {
        try { await projections.UpsertAsync(order, ct); }
        catch (Exception ex)
        {
            // never let one poison document wedge the lease — park it and move on
            logger.LogError(ex, "Projection failed for {Id}", order.Id);
            await deadLetter.SendAsync(order, ct);
        }
    }
}
```

**At-least-once** delivery, so handlers must be idempotent. A handler that throws forever re-reads the
same batch and stalls the lease — park failures in a dead-letter queue instead.

## The .NET SDK (`Microsoft.Azure.Cosmos` v3)

```csharp
// singleton for the process lifetime — it caches routing, warms connections, and is thread-safe
builder.Services.AddSingleton(_ => new CosmosClient(
    accountEndpoint: config["Cosmos:Endpoint"],
    tokenCredential: new ManagedIdentityCredential(),
    new CosmosClientOptions
    {
        ConnectionMode          = ConnectionMode.Direct,   // TCP; lower latency than Gateway
        ApplicationRegion       = Regions.WestEurope,      // read from the nearest region
        ConsistencyLevel        = ConsistencyLevel.Session,
        MaxRetryAttemptsOnRateLimitedRequests = 9,
        SerializerOptions       = new CosmosSerializationOptions
                                  { PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase }
    }));
```

```csharp
// point read: cheapest possible operation — id + partition key, no query engine involved
var order = await container.ReadItemAsync<Order>(id, new PartitionKey(customerId), cancellationToken: ct);

// single-partition query with parameters (never string-concatenate user input)
var query = new QueryDefinition("SELECT * FROM c WHERE c.status = @status ORDER BY c.createdUtc DESC")
    .WithParameter("@status", status);

using var iterator = container.GetItemQueryIterator<Order>(query, requestOptions: new QueryRequestOptions
{
    PartitionKey = new PartitionKey(customerId),   // <- turns a fan-out into a single-partition read
    MaxItemCount = 100
});

var results = new List<Order>();
while (iterator.HasMoreResults)
{
    var page = await iterator.ReadNextAsync(ct);
    totalRu += page.RequestCharge;
    results.AddRange(page);
}

// optimistic concurrency with the item's ETag — 412 if someone else wrote first
await container.ReplaceItemAsync(order, order.Id, new PartitionKey(order.CustomerId),
    new ItemRequestOptions { IfMatchEtag = etag }, ct);
```

Performance rules that come up verbatim in interviews:

- **One `CosmosClient` per account, for the app's lifetime.** Creating one per request is the classic
  latency bug (it re-does the routing handshake every time).
- **Direct mode** over Gateway unless a firewall forces Gateway.
- **Point reads beat queries** — if you can compute the id and partition key, do.
- **Always pass the partition key** on reads and queries; log `RequestCharge` and treat it as a metric.
- **Bulk mode** (`AllowBulkExecution = true`) for ingest; `MaxItemCount`/continuation tokens for paging.
- Enable **`EnableContentResponseOnWrite = false`** on high-volume writes to stop the service echoing
  the document back.

## Global distribution

- Add read regions with a click; the SDK routes to `ApplicationRegion` and fails over automatically.
- **Multi-region writes** trade Strong consistency for write availability everywhere, and introduce
  **conflicts**: resolved last-writer-wins on `_ts` (or a custom property), or by a merge stored
  procedure you supply.
- **Availability zones** per region, **automatic failover**, and continuous backup with
  **point-in-time restore** are the DR levers.

## Rapid-fire Q&A

**Q: How do you choose a partition key?**
High cardinality, even distribution of both storage and traffic, and present in the queries you run
most. Sanity-check it against the 20 GB / 10,000 RU/s logical-partition ceiling for the *largest*
value, and reach for hierarchical keys when one tenant will blow through it.

**Q: What is an RU?**
The normalised cost of an operation across CPU, memory and IOPS. A 1 KB point read is ~1 RU; you
provision RU/s (manual or autoscale) or pay per request (serverless), and exceeding it gives 429s.

**Q: Default consistency, and when would you change it?**
Session — read-your-own-writes per session token, at 1× read cost. Weaken to eventual for counters and
telemetry; strengthen to bounded staleness when a reader needs a known staleness bound. Strong only
single-region-write, and it doubles read RUs.

**Q: The same query is suddenly costing 10× the RUs. Where do you look?**
Cross-partition fan-out (partition key missing from the query), a missing composite index forcing a
sort, item size growth, or a hot partition. `RequestCharge` plus the query metrics tell you which.

**Q: How do you do transactions across two customers' orders?**
You don't — transactions are single-logical-partition. Model so the transactional boundary is one
partition, or use a saga with compensating actions and idempotent handlers.

**Q: What does the change feed *not* give you?**
Deletes, in the default latest-version mode — and it is not a queue: it is an ordered log per
partition, at-least-once, with your progress stored in a lease container.

**Q: Point read or query for a known id?**
Point read. It bypasses the query engine, costs ~1 RU and has the lowest latency; a `SELECT * WHERE
c.id = @id` costs more and can fan out if the partition key is absent.

**Q: Why one `CosmosClient` per app?**
It caches the partition routing map and keeps warm TCP connections in direct mode. A per-request
client pays the whole handshake every call and exhausts sockets under load.

---

**Prev:** [06 — Blob Storage](06-blob-storage.md) ·
**Next:** [08 — Messaging & Events](08-messaging-and-events.md) ·
**Up:** [Azure track hub](readme.md)

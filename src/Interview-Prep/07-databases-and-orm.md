# Databases & ORM

> Data storage models, SQL fundamentals, indexing, transactions, EF Core, and change data capture — the essentials a senior .NET engineer must reason about under load.

## RDBMS vs NoSQL

**RDBMS** (SQL Server, PostgreSQL, MySQL): fixed schema, relations, strong consistency, rich joins/aggregations, ACID. Best when data is highly relational, transactions matter, and query shapes evolve.

**NoSQL** trades relational power for scale and flexibility:

| Type | Model | Examples | Use when |
|------|-------|----------|----------|
| **Document** | JSON-like docs | MongoDB, Cosmos DB | Flexible/nested schema, aggregate-per-doc, product catalogs |
| **Key-Value** | opaque value by key | Redis, DynamoDB | Caching, sessions, ultra-low latency lookups |
| **Column-family** | wide rows, columns grouped | Cassandra, HBase | Huge write volume, time-series, denormalized reads |
| **Graph** | nodes + edges | Neo4j, Cosmos Gremlin | Relationships are first-class: social, fraud, recommendations |

- **Choose RDBMS** for transactional integrity and ad-hoc querying; **NoSQL** for horizontal scale, schema flexibility, or access patterns known in advance.
- NoSQL usually pushes join/consistency logic into the **application**.

## ACID vs BASE, CAP

- **ACID** (classic RDBMS): **Atomicity, Consistency, Isolation, Durability** — correctness first.
- **BASE** (many NoSQL): **Basically Available, Soft state, Eventual consistency** — availability first.
- **CAP theorem**: under a network **Partition** you must choose **Consistency** or **Availability**.
  - **CP**: e.g. single-master RDBMS, MongoDB (majority writes) — reject on partition.
  - **AP**: e.g. Cassandra, DynamoDB — serve possibly stale data.
  - **PACELC** extends it: even when no partition (**E**lse), trade **L**atency vs **C**onsistency.

## SQL Joins

```sql
-- INNER: only matching rows in both tables
SELECT o.Id, c.Name FROM Orders o INNER JOIN Customers c ON o.CustomerId = c.Id;

-- LEFT: all Orders, NULLs where no Customer (RIGHT is the mirror)
SELECT o.Id, c.Name FROM Orders o LEFT JOIN Customers c ON o.CustomerId = c.Id;

-- FULL OUTER: all rows from both, NULL where unmatched
SELECT o.Id, c.Name FROM Orders o FULL OUTER JOIN Customers c ON o.CustomerId = c.Id;

-- CROSS: cartesian product (every combination)
SELECT c.Name, p.Name FROM Colors c CROSS JOIN Products p;

-- SELF: table joined to itself (e.g. employee -> manager)
SELECT e.Name, m.Name AS Manager
FROM Employees e LEFT JOIN Employees m ON e.ManagerId = m.Id;
```

- `LEFT JOIN ... WHERE right.Id IS NULL` = **anti-join** (rows with no match).

## Indexing

- **Clustered index**: defines the **physical order** of the table; one per table (usually the PK). The leaf level *is* the data.
- **Non-clustered index**: separate B-tree with pointers (row locator / clustered key) back to the data; many allowed.
- **Composite index**: multiple columns; order matters — usable for leading-column predicates (left-most prefix rule).
- **Covering index**: contains every column a query needs (via key + `INCLUDE`), so the engine avoids a **key lookup**.
- **B-tree**: balanced tree giving O(log n) seeks and ordered range scans — the default index structure.

```sql
CREATE NONCLUSTERED INDEX IX_Orders_Customer_Date
ON Orders (CustomerId, OrderDate) INCLUDE (Total);
```

**When indexes hurt**: they slow `INSERT/UPDATE/DELETE` (each index must be maintained), consume storage, and can be ignored if not **selective** (e.g. a `bit` column). Too many indexes = write amplification.

**Execution plans**: read them to spot **table/clustered index scans** (often bad on big tables), **key lookups**, and missing-index hints. Look for **Seek** (good) vs **Scan**, and estimated vs actual row counts (skew = stale statistics).

## Normalization vs Denormalization

- **Normalization** (1NF→3NF/BCNF): remove redundancy, one fact per place → fewer anomalies, more joins.
  - 1NF: atomic columns; 2NF: no partial-key dependency; 3NF: no transitive dependency.
- **Denormalization**: deliberately duplicate data to cut joins and speed reads (reporting, read-heavy NoSQL). Cost: update anomalies, must keep copies in sync.

## Transactions & Isolation Levels

A transaction is an atomic unit. Isolation controls concurrency anomalies:

| Level | Dirty read | Non-repeatable read | Phantom |
|-------|-----------|--------------------|---------|
| Read Uncommitted | yes | yes | yes |
| Read Committed *(SQL Server default)* | no | yes | yes |
| Repeatable Read | no | no | yes |
| Serializable | no | no | no |
| **Snapshot** (MVCC) | no | no | no |

- **Snapshot / RCSI** uses row versioning — readers don't block writers (Postgres/Oracle behave this way by default).
- Higher isolation = more locking/blocking; pick the lowest level that is correct.

## ORM / EF Core

See the deep-dive: [../CSharp/ef.md](../CSharp/ef.md). Key exam points:

- **Code-First** + **migrations**: model in C# classes; `dotnet ef migrations add`, `dotnet ef database update`.
- **`DbContext`**: unit of work + identity map; scoped lifetime in ASP.NET Core DI.
- **Tracking vs `AsNoTracking()`**: tracking snapshots entities for `SaveChanges`; use `AsNoTracking()` for read-only queries to cut memory/CPU.
- **`IEnumerable` vs `IQueryable`**: `IQueryable` builds an expression tree translated to SQL (filtering runs in the DB); once you switch to `IEnumerable`/LINQ-to-Objects, filtering happens **in memory** — a common perf bug.
- **N+1 problem**: one query for parents then one per child. Fix with eager loading (`Include`) or projection.
- **Loading**: **eager** (`Include`/`ThenInclude`), **explicit** (`context.Entry(x).Collection(...).Load()`), **lazy** (proxies, loads on access — easy to trigger N+1).

```c#
// Read-only + eager load, no N+1
var orders = await db.Orders
    .AsNoTracking()
    .Include(o => o.Lines)
    .Where(o => o.CustomerId == id)
    .ToListAsync();
```

## Entity Modelling & Relationships

- **One-to-many**: FK on the "many" side (`Order` has many `OrderLine`).
- **Many-to-many**: EF Core auto-creates a join table, or model an explicit **join entity** when it carries data.
- **One-to-one**: shared PK or unique FK.
- Use **owned types** / value objects for components with no identity (e.g. `Address`).

## Aggregate Functions & Window Functions

```sql
SELECT CustomerId, COUNT(*) AS Orders, SUM(Total) AS Revenue, AVG(Total) AS Avg
FROM Orders
GROUP BY CustomerId
HAVING SUM(Total) > 1000;   -- HAVING filters groups; WHERE filters rows
```

- `WHERE` runs before grouping; `HAVING` after.
- **Window functions** compute across a row set without collapsing rows:

```sql
SELECT Id, Total,
       ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY OrderDate) AS Seq,
       SUM(Total)   OVER (PARTITION BY CustomerId)                    AS CustTotal,
       LAG(Total)   OVER (ORDER BY OrderDate)                         AS PrevTotal
FROM Orders;
```

## Change Data Capture (CDC)

**CDC** captures row-level `INSERT/UPDATE/DELETE` changes from a database so downstream systems can react — without polling or dual-writes.

- **SQL Server CDC**: reads the **transaction log** and populates change tables (`cdc.<schema>_<table>_CT`); low overhead, no triggers.
- **Debezium**: log-based CDC connector (Kafka Connect) for SQL Server, Postgres, MySQL, Mongo → streams changes to **Kafka** as events.
- **Use cases**: **event sourcing / outbox** and reliable event publishing, **ETL / data lake sync**, **cache invalidation**, audit trails, and **CQRS** read-model updates.
- Pairs with the **Transactional Outbox** pattern to avoid the dual-write problem (DB commit + message publish atomically).

## Interview Q&A

**Q: When would you pick a document store over an RDBMS?**
A: When the data is naturally an aggregate (self-contained document), schema is flexible/evolving, access is mostly by key, and you need horizontal scale — and you don't rely on multi-entity ACID transactions or ad-hoc joins.

**Q: What does the CAP theorem force you to choose?**
A: During a network partition you must sacrifice either consistency or availability; you can't have both. Outside partitions, PACELC adds a latency-vs-consistency trade-off.

**Q: Clustered vs non-clustered index?**
A: Clustered defines the physical row order (one per table, leaf = data); non-clustered is a separate B-tree pointing back to the data. Covering a query with `INCLUDE` avoids the extra key lookup.

**Q: When does adding an index hurt?**
A: On write-heavy tables (every index is maintained per write), for low-selectivity columns, or when it just wastes storage and is never chosen by the optimizer.

**Q: `IQueryable` vs `IEnumerable` in EF Core?**
A: `IQueryable` builds an expression tree translated to SQL so filtering/paging execute in the database; materializing to `IEnumerable` first pulls rows into memory and filters client-side — usually a performance and correctness pitfall.

**Q: How do you detect and fix an N+1 query?**
A: Detect via SQL logging/profiler showing repeated per-row queries. Fix with `Include`/`ThenInclude`, projection to a DTO, or a single batched query; avoid lazy loading in loops.

**Q: Read Committed vs Snapshot isolation?**
A: Read Committed uses shared locks and blocks readers/writers, allowing non-repeatable reads; Snapshot uses row-versioning (MVCC) so readers see a consistent point-in-time image without blocking writers.

**Q: What is CDC and where would you use it?**
A: Change Data Capture streams row-level changes (log-based, e.g. SQL Server CDC or Debezium) for ETL, cache invalidation, audit, and event-driven/outbox integration without polling or dual-writes.

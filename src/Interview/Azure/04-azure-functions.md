---
title: Azure Functions
summary: The isolated worker model (the in-process model retires 10 Nov 2026), triggers and bindings in C#, the five hosting plans with real limits, cold start, identity-based connections, retries and Durable Functions.
tags: [Azure, Azure-Functions, Serverless, .NET, Durable-Functions, Interview]
updated: 2026-09-03
---

# 04 — Azure Functions

> **Scope:** the serverless compute question. The current .NET execution model, triggers and bindings
> with working C#, hosting plans and their actual limits, cold start, and Durable Functions.
> Reference already on this blog: [Functions notes + the CRON table](../../Azure/Certification/az-204/function.md).

---

## The .NET model: isolated worker, and only isolated worker

**Support for the in-process model ends on 10 November 2026.** Any answer, sample or repo still using
`[FunctionName]` with `Microsoft.NET.Sdk.Functions` is describing a retired model. The isolated
worker model runs your code in a **separate process** from the Functions host, so you control the
.NET version, the DI container and the middleware.

| | In-process (retired 10 Nov 2026) | Isolated worker (current) |
| --- | --- | --- |
| Attribute | `[FunctionName]` | **`[Function]`** |
| Process | Inside the host | Your own process, gRPC to the host |
| .NET version | Locked to the host's | **Any supported LTS/STS**, including .NET 10 |
| Startup | `FunctionsStartup` | `Program.cs` — `FunctionsApplication.CreateBuilder(args)` |
| Logging | `ILogger` injected per function | `ILogger<T>` from DI, standard `Microsoft.Extensions.Logging` |
| Middleware | ❌ | ✅ `builder.UseMiddleware<T>()` |
| HTTP types | `HttpRequest` / `IActionResult` | `HttpRequestData` — or real ASP.NET Core types via **ASP.NET Core integration** |

```csharp
// Program.cs — the current shape. CreateBuilder wires the worker, DI, config and converters.
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();      // ASP.NET Core integration: HttpRequest/IActionResult
builder.Services
    .AddApplicationInsightsTelemetryWorkerService()
    .ConfigureFunctionsApplicationInsights();

builder.Services.AddSingleton<IOrderStore, CosmosOrderStore>();

builder.Build().Run();
```

```csharp
// Functions.cs — constructor injection, cancellation token, ASP.NET Core result types
public sealed class OrderFunctions(IOrderStore store, ILogger<OrderFunctions> log)
{
    [Function(nameof(GetOrder))]
    public async Task<IActionResult> GetOrder(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "orders/{id}")] HttpRequest req,
        string id,
        CancellationToken ct)
    {
        var order = await store.FindAsync(id, ct);
        log.LogInformation("Order {OrderId} lookup: {Found}", id, order is not null);
        return order is null ? new NotFoundResult() : new OkObjectResult(order);
    }
}
```

## Triggers and bindings

**One trigger per function** (what starts it), plus any number of **input** and **output** bindings
(declarative I/O, no SDK client code). Bindings are the reason Functions is glue-free — and the reason
people over-use them: a binding gives you no control over retries, batching or partial failure.

| Trigger | Fires on | Notes |
| --- | --- | --- |
| **HTTP** | A request | 230 s hard response limit — Azure Load Balancer, not Functions |
| **Timer** | NCRONTAB (6 fields: `sec min hour day month day-of-week`) | Singleton across instances; `RunOnStartup` only for debugging |
| **Queue Storage** | A message | Poison message after `maxDequeueCount` (default 5) → `<queue>-poison` |
| **Service Bus** | Queue/topic subscription | Sessions, DLQ, `maxConcurrentCalls` — see [chapter 08](08-messaging-and-events.md) |
| **Blob (Event Grid source)** | Blob created/updated | Event Grid source is the low-latency, reliable one; the legacy polling source can lag minutes |
| **Event Hubs** | Batches of events | Checkpointing per partition; scale = partition count |
| **Cosmos DB** | Change feed | Needs a lease container |
| **Event Grid / Durable / SignalR** | Events, orchestrations, hubs | |

```csharp
// Queue trigger + Blob output binding + Cosmos input binding, all declarative
[Function(nameof(ArchiveOrder))]
[BlobOutput("archive/{queueTrigger}.json", Connection = "StorageConnection")]
public async Task<string> ArchiveOrder(
    [QueueTrigger("orders-to-archive", Connection = "StorageConnection")] string orderId,
    [CosmosDBInput("shop", "orders", Connection = "CosmosConnection", Id = "{queueTrigger}",
                   PartitionKey = "{queueTrigger}")] Order order,
    CancellationToken ct)
{
    log.LogInformation("Archiving {OrderId}", orderId);
    return JsonSerializer.Serialize(order);      // the return value *is* the blob content
}
```

### HTTP authorization levels

| Level | Requires | Use for |
| --- | --- | --- |
| `Anonymous` | nothing | Public endpoints, health checks, anything already fronted by APIM/Entra ID |
| `Function` | a function or host key (`?code=` or `x-functions-key`) | Internal/shared callers |
| `Admin` | the **master key** — grants access to *every* function in the app | Management only; never hand it out |

Keys are a **shared secret, not identity**. For real authorization, put the function behind API
Management or Easy Auth and validate an Entra ID token — see [chapter 10](10-api-management.md).

## Hosting plans — the numbers

| Plan | Scale-out | Max instances | Default / max timeout | Cold start | VNet |
| --- | --- | --- | --- | --- | --- |
| **Flex Consumption** (the default for new apps) | Per-function group, concurrency-based | **1000** | 30 min / unbounded | Reduced; **always-ready instances** | ✅ |
| **Premium** | Event-driven, pre-warmed workers | Windows 100, Linux 20–100 | 30 min / unbounded | None (always-ready) | ✅ |
| **Dedicated** (App Service plan) | Manual or autoscale | 10–30 (100 on ASE) | 30 min / unbounded¹ | None | ✅ |
| **Container Apps** | KEDA, event-driven | 300–1000 | 30 min / unbounded | Depends on min replicas | ✅ |
| **Consumption** (legacy) | Event-driven | Windows 200, Linux 100 | **5 min / 10 min** | Yes, scales to zero | ❌ |

¹ Requires **Always On**. Regardless of plan, an **HTTP-triggered function must respond within
230 seconds** — for anything longer, return `202 Accepted` and use the Durable async HTTP pattern.

Two currency updates worth knowing: the classic **Consumption plan is legacy** (new serverless apps
should use **Flex Consumption**), and **Linux Consumption is retiring on 30 September 2028**. Flex
Consumption also lets you pick the instance memory (512 MB / 2,048 MB / 4,096 MB).

## Cold start

A cold start is platform allocation + runtime load + your dependency graph, paid when the app scaled
to zero or is scaling out. What actually helps, in order of effect:

1. **Always-ready / pre-warmed instances** (Flex Consumption, Premium) — removes it by definition.
2. **`WEBSITE_RUN_FROM_PACKAGE=1`** — mount a zip instead of unpacking files.
3. **Trim the dependency graph and the startup path** — no blocking I/O in `Program.cs`, no eager
   `HttpClient` creation per call (use `IHttpClientFactory`), no synchronous config fetch.
4. **ReadyToRun** publishing (`<PublishReadyToRun>true</PublishReadyToRun>`) to skip JIT.
5. Not: a "warm-up pinger". It papers over one instance and does nothing for scale-out.

## Storage, connections and secrets

`AzureWebJobsStorage` is **not optional** — the host uses it for key management, timer-trigger
singleton leases, Event Hub checkpoints, and the Durable task hub. Locally, Azurite stands in for it
(`"AzureWebJobsStorage": "UseDevelopmentStorage=true"` in `local.settings.json`, which is
**git-ignored and never deployed**).

Prefer **identity-based connections** over connection strings — same managed identity story as
everywhere else, no secret in app settings:

```text
AzureWebJobsStorage__accountName          = stshopprod
ServiceBusConnection__fullyQualifiedNamespace = sb-shop-prod.servicebus.windows.net
CosmosConnection__accountEndpoint         = https://cosmos-shop.documents.azure.com:443/
```

The identity needs the data-plane roles (`Storage Blob Data Owner` + `Storage Queue Data Contributor`
for the host storage, `Azure Service Bus Data Receiver`, and so on).

## Retries, idempotency and poison messages

- **Trigger-level retry** is built in for queue-style triggers (dequeue count → poison queue) and
  configurable in `host.json`; the isolated worker also supports `[FixedDelayRetry]` and
  `[ExponentialBackoffRetry]` attributes on a function.
- Delivery is **at-least-once**, always. Your handler must be **idempotent** — key the write by the
  message id, or use a conditional/upsert write.
- **Never swallow the exception to stop retries.** Let it throw so the message dead-letters, and
  alert on the poison queue / DLQ depth.

```csharp
[Function(nameof(ProcessPayment))]
[ExponentialBackoffRetry(maxRetryCount: 5, minimumInterval: "00:00:02", maximumInterval: "00:01:00")]
public async Task ProcessPayment(
    [ServiceBusTrigger("payments", Connection = "ServiceBusConnection")] ServiceBusReceivedMessage msg,
    CancellationToken ct)
{
    // idempotent: MessageId is the natural dedup key
    await payments.ChargeOnceAsync(msg.MessageId, msg.Body.ToObjectFromJson<Payment>(), ct);
}
```

```jsonc
// host.json — concurrency and batching are the two knobs that decide throughput
{
  "version": "2.0",
  "extensions": {
    "serviceBus": { "maxConcurrentCalls": 16, "prefetchCount": 0, "maxAutoLockRenewalDuration": "00:05:00" },
    "queues":     { "batchSize": 16, "maxDequeueCount": 5, "visibilityTimeout": "00:00:30" }
  },
  "logging": { "applicationInsights": { "samplingSettings": { "isEnabled": true, "excludedTypes": "Request;Exception" } } }
}
```

## Durable Functions

Stateful orchestration on top of stateless functions, with state persisted to the task hub in
storage. Four function kinds: **client** (starts things), **orchestrator** (the workflow),
**activity** (does the work), **entity** (addressable state).

| Pattern | Shape |
| --- | --- |
| **Function chaining** | A → B → C with checkpoints between |
| **Fan-out / fan-in** | Parallel activities, then aggregate |
| **Async HTTP API** | `202 Accepted` + a status URL — the answer to the 230-second limit |
| **Monitor** | Poll with a durable timer until a condition or timeout |
| **Human interaction** | Wait for an external event, with a timeout and compensation |

```csharp
[Function(nameof(PlaceOrderOrchestrator))]
public static async Task<OrderResult> PlaceOrderOrchestrator(
    [OrchestrationTrigger] TaskOrchestrationContext context)
{
    var order = context.GetInput<Order>()!;

    await context.CallActivityAsync("ReserveStock", order);

    // fan-out / fan-in
    var quotes = order.Items.Select(i => context.CallActivityAsync<decimal>("PriceItem", i));
    var total  = (await Task.WhenAll(quotes)).Sum();

    // durable timer + external event, with a timeout — not Task.Delay
    using var cts = new CancellationTokenSource();
    var approval = context.WaitForExternalEvent<bool>("Approved");
    var timeout  = context.CreateTimer(context.CurrentUtcDateTime.AddHours(24), cts.Token);
    var winner   = await Task.WhenAny(approval, timeout);
    if (winner != approval) { await context.CallActivityAsync("ReleaseStock", order); return OrderResult.Expired; }
    cts.Cancel();

    return new OrderResult(total);
}
```

**The orchestrator constraints are the interview question.** The orchestrator body is **replayed**
from the event history every time it resumes, so it must be **deterministic**:

- ❌ `DateTime.UtcNow` → ✅ `context.CurrentUtcDateTime`
- ❌ `Guid.NewGuid()` / `Random` → ✅ `context.NewGuid()` / pass values in
- ❌ HTTP calls, database reads, file I/O → ✅ do them in an **activity**
- ❌ `Task.Delay`, blocking waits, `Task.Run` → ✅ `context.CreateTimer`
- ❌ `async` over anything but durable APIs; ✅ deterministic ordering (`Task.WhenAll` is fine)

## Hands-on — local to cloud

```bash
# scaffold, run locally against Azurite
func init OrderFunctions --worker-runtime dotnet-isolated --target-framework net10.0
cd OrderFunctions
func new --name GetOrder --template "HTTP trigger" --authlevel function
azurite --silent &                 # local storage emulator for AzureWebJobsStorage
func start                         # http://localhost:7071/api/GetOrder

# create a Flex Consumption app and deploy
RG=rg-shop-dev; SA=stshopfunc$RANDOM; FUNC=func-shop-dev
az storage account create -g $RG -n $SA --sku Standard_LRS
az functionapp create -g $RG -n $FUNC --storage-account $SA \
  --flexconsumption-location westeurope --runtime dotnet-isolated --runtime-version 10.0
func azure functionapp publish $FUNC

# swap the storage connection string for an identity-based connection
PRINCIPAL=$(az functionapp identity assign -g $RG -n $FUNC --query principalId -o tsv)
SCOPE=$(az storage account show -g $RG -n $SA --query id -o tsv)
az role assignment create --assignee-object-id $PRINCIPAL --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Owner" --scope $SCOPE
az functionapp config appsettings set -g $RG -n $FUNC --settings AzureWebJobsStorage__accountName=$SA
az functionapp config appsettings delete -g $RG -n $FUNC --setting-names AzureWebJobsStorage
```

## Rapid-fire Q&A

**Q: In-process or isolated worker?**
Isolated — the in-process model loses support on 10 November 2026. Isolated decouples your .NET
version from the host's and gives you DI, middleware and full control of the dependency chain.

**Q: What is a binding, and when would you not use one?**
A declarative input/output connection to a service, so the runtime does the SDK work. Skip it when you
need control the binding doesn't expose: custom retry/back-off, batching, partial failure of a batch,
or a client you must configure (Cosmos consistency, Service Bus sessions).

**Q: Which hosting plan, and why?**
Flex Consumption for new event-driven work (scale to zero, 1000 instances, VNet, always-ready to blunt
cold start). Premium when you need always-warm plus predictable pricing. Dedicated when you already
own an App Service plan or need very long runs. Container Apps when the unit of deployment is a
container next to other microservices.

**Q: How do you avoid cold starts?**
Always-ready/pre-warmed instances on Flex Consumption or Premium; then run-from-package, a small
dependency graph, no blocking work at startup, and ReadyToRun.

**Q: An HTTP function needs 10 minutes. What do you do?**
Nothing on the HTTP path — 230 seconds is a load-balancer limit. Return `202 Accepted` with a status
URL and run the work in a Durable orchestration (async HTTP API pattern), or hand it to a queue.

**Q: Why must an orchestrator be deterministic?**
It is replayed from its event history on every resume. Non-deterministic calls (`DateTime.UtcNow`,
`Guid.NewGuid`, I/O) would produce different results on replay and corrupt the history — so all
non-determinism goes in activity functions.

**Q: What is `AzureWebJobsStorage` used for?**
Key management, timer-trigger singleton leases, Event Hub checkpoints, the Durable task hub and
runtime state. Losing it breaks the app, so treat it as production infrastructure — and prefer an
identity-based connection over a connection string.

**Q: A queue-triggered function keeps reprocessing the same message. Why?**
It throws (or times out) before completing, so the lock expires and the dequeue count climbs until the
message goes to the poison queue. Fix the handler, make it idempotent, and alert on the poison queue —
don't swallow the exception.

---

**Prev:** [03 — App Service](03-app-service.md) ·
**Next:** [05 — Containers, ACR & AKS](05-containers-and-aks.md) ·
**Up:** [Azure track hub](readme.md)

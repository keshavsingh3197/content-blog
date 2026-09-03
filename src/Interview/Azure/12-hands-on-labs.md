---
title: Azure Hands-on Labs
summary: Nine build-it-yourself labs on one running example — App Service slots, a Flex Consumption function, Cosmos partition-key RU measurement, a Service Bus dead-letter drill, Key Vault + sentinel refresh, KEDA scaling, APIM and KQL — each ending in the sentence it earns you in an interview.
tags: [Azure, Hands-On, Labs, Azure-CLI, .NET, Interview]
updated: 2026-09-03
---

# 12 — Hands-on Labs

> **Why labs.** Every chapter in this track states a fact; a lab is where you find out you believed
> the wrong one. Each lab below is small, costs little, and ends with **the sentence it earns you** —
> the answer you can now give from experience rather than from a slide.
>
> **The running example:** *Shop* — an orders API, a background worker and a projection store.

---

## Lab 0 — Toolchain

```bash
az version                       # Azure CLI
az bicep version                 # Bicep (az bicep install)
func --version                   # Azure Functions Core Tools v4
dotnet --list-sdks               # .NET 10 SDK
docker --version                 # for the container labs
npm i -g azurite                 # local storage emulator

az login
az account set --subscription "<your subscription>"
az group create -n rg-shop-lab -l westeurope --tags purpose=learning autodelete=true
```

Two habits from the start: **one resource group for the whole lab** (so `az group delete` is your
undo button), and **`--tags`** on everything.

```bash
export RG=rg-shop-lab LOC=westeurope SUFFIX=$RANDOM
```

---

## Lab 1 — App Service, a slot and a swap you can feel

**Goal:** deploy an API, put a change in staging, swap, roll back.

```bash
APP=shop-api-$SUFFIX
az appservice plan create -g $RG -n plan-shop --is-linux --sku S1
az webapp create -g $RG -p plan-shop -n $APP --runtime "DOTNETCORE:10.0"
az webapp config set -g $RG -n $APP --health-check-path /health --ftps-state Disabled
az webapp deployment slot create -g $RG -n $APP --slot staging --configuration-source $APP

dotnet new webapi -o Shop.Api && cd Shop.Api
# add: app.MapGet("/health", () => Results.Ok(new { v = Environment.GetEnvironmentVariable("BUILD_VERSION") }));
dotnet publish -c Release -o out && (cd out && zip -qr ../v1.zip .)
az webapp deploy -g $RG -n $APP --slot staging --src-path v1.zip --type zip
```

**Prove it:**

1. `curl https://$APP-staging.azurewebsites.net/health` returns v1; production returns 404 (nothing deployed).
2. Set `BUILD_VERSION=v1` on staging **without** `--slot-settings`, swap, and watch the value travel
   to production. Now mark it sticky and swap again — it stays put.
3. Swap the same two slots a second time: production is back on the previous build in seconds.
4. Add `WEBSITE_SWAP_WARMUP_PING_PATH=/health` and make `/health` return 500. The swap **fails and
   leaves production untouched** — that is the whole point of warm-up.

> **Earns you:** *"A swap applies the target's sticky settings to the source, restarts it, warms every
> instance, then flips routing — so a bad build fails the warm-up instead of taking production down,
> and rollback is just swapping back."*

---

## Lab 2 — A Flex Consumption function with a real binding

**Goal:** queue-triggered work with an output binding and an identity-based connection.

```bash
SA=stshoplab$SUFFIX; FUNC=func-shop-$SUFFIX
az storage account create -g $RG -n $SA --sku Standard_LRS
az functionapp create -g $RG -n $FUNC --storage-account $SA \
  --flexconsumption-location $LOC --runtime dotnet-isolated --runtime-version 10.0

func init ShopWorker --worker-runtime dotnet-isolated --target-framework net10.0
cd ShopWorker && func new -n ArchiveOrder --template "Queue trigger"
azurite --silent & func start          # run it locally first, against Azurite
func azure functionapp publish $FUNC
```

**Prove it:**

1. Drop a message on the queue with `az storage message put` and watch the blob appear.
2. Make the handler throw. Watch `DequeueCount` climb and the message land in `orders-poison`
   after five attempts.
3. Remove `AzureWebJobsStorage` and replace it with `AzureWebJobsStorage__accountName` plus the
   `Storage Blob Data Owner` + `Storage Queue Data Contributor` roles. It still works — **with no
   connection string anywhere.**

> **Earns you:** *"Queue triggers are at-least-once with a dequeue count and a poison queue, so the
> handler has to be idempotent; and the host storage can run on a managed identity, so the function
> app holds no secrets at all."*

---

## Lab 3 — Cosmos DB: measure what a partition key costs

**Goal:** stop guessing about RUs. This is the highest-value lab in the set.

```bash
COSMOS=cosmos-shop-$SUFFIX
az cosmosdb create -g $RG -n $COSMOS --enable-free-tier true   # drop the flag if the subscription has no free-tier allowance
az cosmosdb sql database create -g $RG -a $COSMOS -n shop
az cosmosdb sql container create -g $RG -a $COSMOS -d shop -n orders \
  --partition-key-path /customerId --throughput 400
```

Seed ~5,000 orders across 50 customers, then run the same logical read three ways and print
`RequestCharge`:

```csharp
// A. point read — id + partition key
var a = await container.ReadItemAsync<Order>(id, new PartitionKey(customerId), cancellationToken: ct);

// B. single-partition query
var b = container.GetItemQueryIterator<Order>(
    new QueryDefinition("SELECT * FROM c WHERE c.id = @id").WithParameter("@id", id),
    requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(customerId) });

// C. cross-partition query — same result, no partition key
var c = container.GetItemQueryIterator<Order>(
    new QueryDefinition("SELECT * FROM c WHERE c.id = @id").WithParameter("@id", id));

Console.WriteLine($"point={a.RequestCharge}  single={await Sum(b)}  cross={await Sum(c)}");
```

**Prove it:**

1. The point read costs ~1 RU. The query costs several. The cross-partition query costs the most, and
   the gap **grows as you add data**.
2. Now create a second container partitioned on `/status` with two values, load the same data, and
   watch the storage skew — one logical partition takes almost everything.
3. Exclude `/*` from the indexing policy and include only what you query; re-measure the **write** cost.

> **Earns you:** *"I've measured it: a point read is about 1 RU, and dropping the partition key turns
> it into a fan-out whose cost grows with the container. Partition-key choice and indexing policy are
> the two levers on the bill."*

---

## Lab 4 — Service Bus dead-letter drill

**Goal:** break a consumer on purpose and recover the messages.

```bash
NS=sb-shop-$SUFFIX
az servicebus namespace create -g $RG -n $NS --sku Standard
az servicebus queue create -g $RG --namespace-name $NS -n orders \
  --max-delivery-count 3 --lock-duration PT30S
```

**Prove it:**

1. Send 10 messages; have the consumer throw on every third. Watch `DeliveryCount` climb and three
   messages appear in `orders/$DeadLetterQueue`.
2. Read the DLQ (`client.CreateReceiver("orders", new ServiceBusReceiverOptions { SubQueue = SubQueue.DeadLetter })`)
   and print `DeadLetterReason`.
3. Fix the consumer, then **resubmit** the dead letters by sending their bodies back to the queue.
4. Sleep past the lock duration inside the handler without renewing. The message is redelivered
   **while you are still processing it** — the reason `maxAutoLockRenewalDuration` exists, and a live
   demonstration of why handlers must be idempotent.
5. Turn on sessions and send with a `SessionId`. Two consumers now cannot interleave one customer's
   messages.

> **Earns you:** *"I've watched a lock expire mid-handler and the message get delivered twice — so I
> treat at-least-once as a certainty, key writes on the message id, and alert on DLQ depth with a
> documented resubmit path."*

---

## Lab 5 — Key Vault, App Configuration and a refresh with no restart

**Goal:** change behaviour in production without a deployment.

```bash
KV=kv-shop-$SUFFIX; AC=appcs-shop-$SUFFIX
az keyvault create -g $RG -n $KV --enable-rbac-authorization true --enable-purge-protection true
az appconfig create -g $RG -n $AC --sku standard
az appconfig kv set -n $AC --key "Shop:PageSize" --value 25 --yes
az appconfig kv set -n $AC --key "Shop:Sentinel" --value 1  --yes
```

**Prove it:**

1. Wire the provider with `ConfigureRefresh(r => r.Register("Shop:Sentinel", refreshAll: true))`.
2. Change `Shop:PageSize` — nothing happens. Bump `Shop:Sentinel` — the whole set reloads within the
   refresh interval, live.
3. Add a feature flag, gate a code path on `IFeatureManager`, and flip it from the CLI.
4. Delete a Key Vault secret, then `az keyvault secret recover` it. Try `--purge` with purge
   protection on and watch it refuse.

> **Earns you:** *"Config changes go through a sentinel key so the reload is atomic; secrets live in
> Key Vault with soft delete and purge protection, referenced rather than copied."*

---

## Lab 6 — Container Apps scaling from zero on queue depth

**Goal:** see KEDA do the thing everyone describes and few have watched.

```bash
ACR=acrshop$SUFFIX; ENV=env-shop
az acr create -g $RG -n $ACR --sku Basic
az acr build -r $ACR -t order-worker:v1 .
az containerapp env create -g $RG -n $ENV -l $LOC
az containerapp create -g $RG -n order-worker --environment $ENV \
  --image $ACR.azurecr.io/order-worker:v1 --registry-server $ACR.azurecr.io \
  --min-replicas 0 --max-replicas 10 \
  --scale-rule-name sb --scale-rule-type azure-servicebus \
  --scale-rule-metadata queueName=orders namespace=$NS messageCount=20 \
  --scale-rule-auth "connection=sb-connection"
```

**Prove it:**

1. With an empty queue, `az containerapp replica list` shows **zero** replicas.
2. Publish 500 messages; watch replicas climb toward `500/20 = 25`, capped at `max-replicas 10`.
3. Let the queue drain and watch it fall back to zero.
4. Deploy `v2`, switch to multiple-revision mode and split traffic 90/10. Then shift to 100/0 —
   canary and rollback with no gateway involved.

> **Earns you:** *"`messageCount` is messages **per replica**, so KEDA targets depth ÷ messageCount up
> to the max — and scale-to-zero means the first message after an idle period pays a cold start."*

---

## Lab 7 — APIM in front, with a token and a throttle

**Goal:** move authentication and rate limiting out of the app.

```bash
APIM=apim-shop-$SUFFIX
az apim create -g $RG -n $APIM --publisher-email you@example.com --publisher-name Shop --sku-name Developer
az apim api import -g $RG --service-name $APIM --path orders --api-id orders \
  --specification-url "https://$APP.azurewebsites.net/swagger/v1/swagger.json" --specification-format OpenApiJson
```

**Prove it:**

1. Call the API with no token → 401 from the **gateway**, before the backend is touched.
2. Add `rate-limit-by-key` at 5 calls/60s keyed on the JWT subject; loop `curl` and watch the 429s,
   with `X-RateLimit-Remaining` counting down.
3. Remove `<base />` from the API-scope policy and watch your global `validate-jwt` silently stop
   applying. Put it back.
4. Lock the backend to the `ApiManagement` service tag; the direct `*.azurewebsites.net` URL now
   fails while the gateway still works.

> **Earns you:** *"Policies run global → product → API → operation, and `<base />` is where the parent
> runs — dropping it is how people accidentally disable their own gateway authentication."*

---

## Lab 8 — Find the slow thing with KQL

**Goal:** one incident, start to finish, in the portal's log blade.

**Prove it:**

1. Add a deliberate 800 ms `Task.Delay` in one endpoint and generate load.
2. Find it: `AppRequests | summarize p95 = percentile(DurationMs,95) by OperationName | top 5 by p95 desc`.
3. Decide *whose* fault it is: the same summary over `AppDependencies` shows the slow span is yours,
   not a dependency's.
4. Pick one `OperationId` and `union AppRequests, AppDependencies, AppTraces` to read the whole
   transaction in order.
5. Publish from the worker with the `traceparent` copied into a message property, restore it on
   receive, and confirm the worker's spans now share the API request's `OperationId`.
6. Create a log alert on failure rate > 2% over 5 minutes, wired to an action group.

> **Earns you:** *"I can go from 'it's slow' to the exact span in four KQL queries, and I know the
> trace only survives the queue hop if you carry `traceparent` in a message property."*

---

## Lab 9 — Tear down, and read the bill

```bash
az consumption usage list --start-date $(date -d '7 days ago' +%Y-%m-%d) --end-date $(date +%Y-%m-%d) \
  --query "[?contains(instanceName,'shop')].{name:instanceName, cost:pretaxCost}" -o table

az group delete -n $RG --yes --no-wait
```

Look at what actually cost money — it is almost never the compute you worried about, and usually the
APIM Developer instance, the Log Analytics ingestion, or provisioned Cosmos throughput you forgot.
**Cost awareness is an interview signal**: "we moved that container app to scale-to-zero and cut the
non-prod bill by two thirds" beats any amount of theory.

---

## A four-evening plan

| Evening | Do | Read |
| --- | --- | --- |
| 1 | Labs 0–2 | [01 Fundamentals](01-fundamentals-and-governance.md) · [02 Identity](02-identity-and-managed-identity.md) · [03 App Service](03-app-service.md) · [04 Functions](04-azure-functions.md) |
| 2 | Labs 3–4 | [06 Blob Storage](06-blob-storage.md) · [07 Cosmos DB](07-cosmos-db.md) · [08 Messaging](08-messaging-and-events.md) |
| 3 | Labs 5–7 | [05 Containers](05-containers-and-aks.md) · [09 Secrets & config](09-secrets-and-configuration.md) · [10 APIM](10-api-management.md) |
| 4 | Labs 8–9 + the [self-test](readme.md#self-test--20-questions-no-notes) | [11 Observability](11-observability-and-kql.md) |

---

**Prev:** [11 — Observability, App Insights & KQL](11-observability-and-kql.md) ·
**Up:** [Azure track hub](readme.md)

---
title: Azure Blob Storage
summary: Redundancy options, blob types, access tiers with their real retention penalties, lifecycle policies, the three kinds of SAS and when each is right, and the Azure.Storage.Blobs .NET SDK with ETag concurrency.
tags: [Azure, Storage, Blob, SAS, .NET, Interview]
updated: 2026-09-03
---

# 06 — Blob Storage

> **Scope:** the storage half of the developer exam and of most real systems — account shape,
> redundancy, tiers and lifecycle, SAS, and the `Azure.Storage.Blobs` v12 SDK.
> Related: [Entra ID & managed identity](02-identity-and-managed-identity.md).

---

## The account and the four services

One **storage account** (`StorageV2`, general purpose) exposes four data services on four endpoints:

| Service | Endpoint | For |
| --- | --- | --- |
| **Blob** | `{acct}.blob.core.windows.net` | Unstructured objects — files, images, backups, logs |
| **File** | `{acct}.file.core.windows.net` | SMB/NFS shares (lift-and-shift) |
| **Queue** | `{acct}.queue.core.windows.net` | Simple at-least-once messages ([chapter 08](08-messaging-and-events.md)) |
| **Table** | `{acct}.table.core.windows.net` | Key/value NoSQL (Cosmos DB for Table is the premium sibling) |

The hierarchy is **account → container → blob**. There are no real folders: `2026/09/report.pdf` is
one blob name with slashes, and "list a folder" is a **prefix** query. (Data Lake Gen2 — hierarchical
namespace enabled — adds genuine directories and POSIX ACLs.)

## Redundancy — the four-plus-two you must be able to recite

| Option | Copies | Survives | Read from secondary |
| --- | --- | --- | --- |
| **LRS** | 3, one datacenter | Disk/rack/node failure | — |
| **ZRS** | 3, across availability zones | A datacenter/zone loss | — |
| **GRS** | LRS + async copy to the paired region | Region loss (after failover) | ❌ |
| **GZRS** | ZRS + async copy to the paired region | Zone *and* region loss | ❌ |
| **RA-GRS / RA-GZRS** | as above | as above | ✅ read-only secondary endpoint |

Geo-replication is **asynchronous**, so a region failover can lose the last few seconds of writes
(a non-zero **RPO**). "Zero data loss across regions" is not on offer here — say so.

## Blob types

| Type | Optimised for | Max | Typical |
| --- | --- | --- | --- |
| **Block blob** | Upload/read whole objects, parallel blocks | ~190 TiB | 99% of what you write |
| **Append blob** | Append-only writes | ~195 GiB | Log files, audit trails |
| **Page blob** | Random read/write, 512-byte pages | 8 TiB | VHDs / managed disks |

## Access tiers and lifecycle

| Tier | Storage cost | Access cost | Minimum retention | Read latency |
| --- | --- | --- | --- | --- |
| **Hot** | highest | lowest | none | ms |
| **Cool** | lower | higher | **30 days** | ms |
| **Cold** | lower still | higher still | **90 days** | ms |
| **Archive** | lowest | highest | **180 days** | **hours — must rehydrate** |

- Delete or move a blob before its minimum retention and you pay an **early-deletion charge** for the
  remaining days (move to archive, delete after 45 days ⇒ billed as if 180).
- **Archive is offline.** You cannot read or modify the blob; you rehydrate to an online tier
  (standard priority can take up to ~15 hours; high priority is faster and dearer). Using
  **Copy Blob** to a new blob in an online tier avoids the early-deletion penalty on the source.
- Tier is set per blob (`SetAccessTier`) or defaulted per account; **archive is blob-level only**.

Automate the movement with a **lifecycle management policy** on the account:

```json
{
  "rules": [{
    "name": "invoices-cooldown",
    "enabled": true,
    "type": "Lifecycle",
    "definition": {
      "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["invoices/"] },
      "actions": {
        "baseBlob": {
          "tierToCool":    { "daysAfterModificationGreaterThan": 30 },
          "tierToArchive": { "daysAfterLastAccessTimeGreaterThan": 180 },
          "delete":        { "daysAfterModificationGreaterThan": 2555 }
        },
        "snapshot": { "delete": { "daysAfterCreationGreaterThan": 90 } }
      }
    }
  }]
}
```

```bash
az storage account management-policy create --account-name $SA -g $RG --policy @policy.json
```

## Data protection features worth naming

| Feature | Protects against |
| --- | --- |
| **Soft delete** (blob + container) | Accidental delete — retained N days, restorable |
| **Versioning** | Overwrites — every write keeps the prior version |
| **Snapshots** | Point-in-time read-only copies you take yourself |
| **Point-in-time restore** | Bulk restore of a container to a timestamp |
| **Immutable storage** (time-based / legal hold) | Tampering — WORM, satisfies retention regulation |
| **Change feed** | Needing an ordered, durable log of every change (for downstream processing) |

## Access control — four ways in, ranked

1. **Microsoft Entra ID + RBAC** ⭐ — the default. Data-plane roles: `Storage Blob Data Reader`,
   `... Data Contributor`, `... Data Owner`. No secret exists.
2. **User delegation SAS** — a short-lived, scoped URL **signed with an Entra ID key**, not the
   account key. The right way to hand a browser a direct download/upload link.
3. **Service SAS / account SAS** — signed with the **account key**. Works, but the key is a
   god-credential; a service SAS can at least be tied to a **stored access policy**.
4. **Account keys / connection strings** ❌ — two keys, full control, no identity, no expiry. Disable
   key access (`--allow-shared-key-access false`) and keep both keys out of config.

### The three SAS kinds

| | **User delegation SAS** | **Service SAS** | **Account SAS** |
| --- | --- | --- | --- |
| Signed with | Entra ID user delegation key | Account key | Account key |
| Scope | Blob service only | One service, one resource | Multiple services, account-level ops |
| Max lifetime | ≤ 7 days (delegation key) | Until you revoke | Until you revoke |
| Revocable via **stored access policy** | ❌ (revoke the delegation key instead) | ✅ | ❌ |
| Use it | Almost always | Legacy / when Entra is not available | Rarely — tooling |

**Revocation is the exam question.** A SAS is a signed URL: once issued you cannot un-issue it. Your
options are (a) a **stored access policy**, whose expiry/permissions you can change or delete to kill
every SAS bound to it, (b) rotating the account key (nukes every service/account SAS), or (c) using a
user delegation SAS with a short lifetime. Always set the shortest useful expiry, the narrowest
permissions (`r` not `rw`), HTTPS-only, and an IP range when you can.

```csharp
// User delegation SAS — no account key anywhere in the process
var blobService = new BlobServiceClient(new Uri($"https://{account}.blob.core.windows.net"), credential);
var key = await blobService.GetUserDelegationKeyAsync(
    DateTimeOffset.UtcNow.AddMinutes(-5), DateTimeOffset.UtcNow.AddMinutes(30));

var sas = new BlobSasBuilder(BlobSasPermissions.Read, DateTimeOffset.UtcNow.AddMinutes(30))
{
    BlobContainerName = "invoices",
    BlobName          = blobName,
    Protocol          = SasProtocol.Https,
    Resource          = "b"
};

var uri = new BlobUriBuilder(blobClient.Uri)
{
    Sas = sas.ToSasQueryParameters(key.Value, account)
}.ToUri();
```

> The caller needs `Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey` —
> included in `Storage Blob Data Contributor`/`Delegator` roles.

## The .NET SDK (`Azure.Storage.Blobs` v12)

```csharp
// Program.cs — register once; the clients are thread-safe and pool connections
builder.Services.AddAzureClients(clients =>
{
    clients.AddBlobServiceClient(new Uri(builder.Configuration["Storage:BlobUri"]!));
    clients.UseCredential(new ManagedIdentityCredential());
});
```

```csharp
public sealed class InvoiceStore(BlobServiceClient blobService)
{
    private readonly BlobContainerClient _container = blobService.GetBlobContainerClient("invoices");

    public async Task<Uri> UploadAsync(string name, Stream content, string contentType, CancellationToken ct)
    {
        var blob = _container.GetBlobClient(name);

        await blob.UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType, CacheControl = "private, max-age=3600" },
            Metadata    = new Dictionary<string, string> { ["uploadedBy"] = "shop-api" },
            Conditions  = new BlobRequestConditions { IfNoneMatch = ETag.All },   // create-only: 409 if it exists
            TransferOptions = new StorageTransferOptions { MaximumConcurrency = 8 }
        }, ct);

        return blob.Uri;
    }

    // optimistic concurrency: only overwrite if nobody else did
    public async Task<bool> TryReplaceAsync(string name, Stream content, ETag expected, CancellationToken ct)
    {
        try
        {
            await _container.GetBlobClient(name).UploadAsync(content, new BlobUploadOptions
            {
                Conditions = new BlobRequestConditions { IfMatch = expected }
            }, ct);
            return true;
        }
        catch (RequestFailedException ex) when (ex.Status == 412)  // precondition failed
        {
            return false;
        }
    }

    public async IAsyncEnumerable<BlobItem> ListAsync(string prefix, [EnumeratorCancellation] CancellationToken ct)
    {
        await foreach (var item in _container.GetBlobsAsync(BlobTraits.Metadata, prefix: prefix, cancellationToken: ct))
            yield return item;
    }

    public async Task<Stream> OpenReadAsync(string name, CancellationToken ct)
        => await _container.GetBlobClient(name).OpenReadAsync(cancellationToken: ct);   // streams, no full buffer
}
```

Things that separate a good answer:

- **Stream, don't buffer.** `OpenReadAsync`/`OpenWriteAsync` and `UploadAsync(Stream)` keep large
  blobs off the LOH; reading into a `byte[]` is how you OOM a container.
- **Properties vs metadata.** Properties are system headers (`Content-Type`, `Cache-Control`);
  metadata is your own `x-ms-meta-*` key/values. **`SetMetadata` replaces the whole set** — read,
  merge, write.
- **ETags** give you optimistic concurrency (`IfMatch`) and cheap create-only semantics
  (`IfNoneMatch: ETag.All`); a failed condition is HTTP **412**.
- **Retries** are built into the SDK (exponential, configurable via `BlobClientOptions.Retry`) — don't
  hand-roll a retry loop around it.
- **Azurite** is the local emulator; `UseDevelopmentStorage=true` targets it.

## Hands-on

```bash
SA=stshopdev$RANDOM; RG=rg-shop-dev
az storage account create -g $RG -n $SA --sku Standard_ZRS --kind StorageV2 \
  --min-tls-version TLS1_2 --allow-blob-public-access false --allow-shared-key-access false

az storage container create --account-name $SA -n invoices --auth-mode login
az storage blob upload --account-name $SA -c invoices -n 2026/09/inv-1.pdf -f ./inv-1.pdf --auth-mode login
az storage blob set-tier --account-name $SA -c invoices -n 2026/09/inv-1.pdf --tier Cool --auth-mode login

az storage account blob-service-properties update -g $RG -n $SA \
  --enable-delete-retention true --delete-retention-days 30 --enable-versioning true
```

## Rapid-fire Q&A

**Q: LRS, ZRS, GRS, GZRS — pick one for a payments audit archive.**
GZRS (or RA-GZRS if you need secondary reads): zone redundancy for the everyday failure and
geo-replication for the region-loss scenario. Note the replication is asynchronous, so RPO is not zero.

**Q: How do you revoke a SAS you already handed out?**
You can't revoke the URL itself. Bind service SAS tokens to a **stored access policy** and change or
delete the policy; or rotate the account key (invalidates all key-signed SAS); or prefer a **user
delegation SAS** with a short expiry. Design for short lifetimes so revocation is rarely needed.

**Q: User delegation SAS vs service SAS?**
User delegation is signed with an Entra ID-issued key, so no account key exists in the flow, and it is
capped at seven days. A service SAS is signed with the account key — more powerful, longer-lived, and
exactly the credential you are trying to eliminate.

**Q: A blob is in the archive tier and the app needs it now.**
It can't. Rehydrate it to hot/cool (standard priority up to ~15 hours, high priority faster) or copy
it to a new blob in an online tier. Archive is for data you accept waiting hours for.

**Q: What does moving a blob out of cool after 10 days cost?**
The early-deletion charge: 20 days of cool storage (30 − 10), on top of the operation cost.

**Q: How do two writers avoid clobbering each other?**
Optimistic concurrency with ETags — read the ETag, write with `IfMatch`, handle **412** by re-reading
and retrying. Pessimistic alternative: a blob **lease**.

**Q: How do you serve a private file to a browser without proxying it?**
Return a short-lived **user delegation SAS** URL from your API. The browser talks to Storage directly,
your app never streams the bytes, and the link expires.

**Q: `SetMetadata` deleted my other metadata. Why?**
It is a whole-set replace, not a merge. Read the existing metadata, add your key, then write it back.

---

**Prev:** [05 — Containers, ACR & AKS](05-containers-and-aks.md) ·
**Next:** [07 — Cosmos DB](07-cosmos-db.md) ·
**Up:** [Azure track hub](readme.md)

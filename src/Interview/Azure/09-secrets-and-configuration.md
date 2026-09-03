---
title: Key Vault & App Configuration
summary: Key Vault objects, RBAC vs access policies, soft delete and purge protection, rotation; App Configuration labels, the sentinel-key refresh pattern and feature flags — wired into ASP.NET Core with a managed identity.
tags: [Azure, Key-Vault, App-Configuration, Secrets, Security, .NET, Interview]
updated: 2026-09-03
---

# 09 — Key Vault, App Configuration & Secrets

> **Scope:** where configuration and secrets live, how a .NET app reads them without ever holding a
> credential, and how a value changes without a redeploy.
> Related: [Entra ID & managed identity](02-identity-and-managed-identity.md) ·
> [Security & cryptography in C#](../../CSharp/security-and-cryptography.md).

---

## The rule

**No secret in source control, in an image, in a log, or in an ARM parameter file.** Everything else
in this chapter is mechanics for honouring that. In practice:

| Kind of value | Home |
| --- | --- |
| Non-secret settings (URLs, limits, flags, copy) | **App Configuration** (or app settings) |
| Secrets (passwords, API keys, connection strings) | **Key Vault**, referenced — never copied |
| Access to Azure services | **Managed identity + RBAC** — so there is no secret at all |
| Local dev secrets | `dotnet user-secrets` (never `appsettings.json`) |

## Azure Key Vault

Three object types, three different jobs:

| Object | What it is | Operations |
| --- | --- | --- |
| **Secret** | An opaque string ≤ 25 KB | get / set / list; the value leaves the vault |
| **Key** | An asymmetric or symmetric key | encrypt/decrypt, sign/verify, wrap/unwrap — **the key never leaves the vault** |
| **Certificate** | A cert + its private key + lifecycle | issue, auto-renew with a supported CA, and expose the key as a Key object |

The distinction matters: use a **Key** when you want cryptography without ever holding the material
(the vault does the operation for you); a **Secret** when the app genuinely needs the value.

### Permission models

| | **Azure RBAC** ⭐ | Access policies (legacy) |
| --- | --- | --- |
| Granularity | Roles at vault / secret scope | Per-principal permission lists on the vault |
| Managed with | Standard role assignments, PIM, policy | Vault-specific API |
| Roles | `Key Vault Secrets User` (read values), `Key Vault Secrets Officer` (manage), `Key Vault Crypto User`, `Key Vault Administrator` | — |

Use RBAC. Note that vault **control-plane** rights (`Contributor`) do **not** grant data-plane access
under RBAC — the same split as storage.

### Protection features to name

- **Soft delete** (always on) — a deleted secret/key/vault is recoverable for the retention period
  (7–90 days, default 90).
- **Purge protection** — nobody, including an owner, can permanently delete before retention expires.
  Turn it on in production; it is the defence against a destructive mistake or a compromised admin.
- **Versioning** — every `set` creates a new version with its own URI. A reference *without* a version
  resolves to the current one, which is what makes rotation transparent.
- **Rotation** — set an expiry and a rotation policy; Key Vault emits **Event Grid** events
  (`SecretNearExpiry`, `SecretExpired`) you can react to. Two-set rotation (A/B credentials) is how
  you rotate without downtime.
- **Networking** — firewall + **private endpoint**, so the vault is not reachable from the internet.
- **Managed HSM / Premium** for FIPS 140-2 Level 3 hardware-backed keys and customer-managed keys.

### Reading a secret from .NET

```csharp
// Option A — as a configuration provider, so secrets are just IConfiguration keys
builder.Configuration.AddAzureKeyVault(
    new Uri(builder.Configuration["KeyVault:Uri"]!),
    new ManagedIdentityCredential(),
    new AzureKeyVaultConfigurationOptions { ReloadInterval = TimeSpan.FromHours(6) });

// "Db--Password" in the vault becomes "Db:Password" in configuration
var password = builder.Configuration["Db:Password"];
```

```csharp
// Option B — the SDK directly, when you need a specific version or the metadata
builder.Services.AddAzureClients(c =>
{
    c.AddSecretClient(new Uri(config["KeyVault:Uri"]!));
    c.UseCredential(new ManagedIdentityCredential());
});

KeyVaultSecret secret = await secretClient.GetSecretAsync("Db-Password", cancellationToken: ct);
```

**Never log the value, never put it in an exception message, and don't re-read it per request** —
the SDK caches nothing by default, and Key Vault has request limits. A configuration provider with a
`ReloadInterval` (or App Configuration, below) is the sane shape.

From App Service / Functions you often don't need the SDK at all — a **Key Vault reference** in an app
setting has the platform resolve it with the app's managed identity:

```text
Db__Password = @Microsoft.KeyVault(SecretUri=https://kv-shop.vault.azure.net/secrets/Db-Password/)
```

Omit the version to follow rotations. The value resolves **at start and on configuration change**, so
a rotated secret still needs a restart — which is the gap App Configuration closes.

## Azure App Configuration

A managed store for **non-secret** settings, with the features `appsettings.json` lacks: labels,
point-in-time snapshots, feature flags, and **push-based refresh without a restart**.

| Concept | Use |
| --- | --- |
| **Key–value** | `Shop:Api:PageSize` = `50` |
| **Label** | The same key per environment/version — `label: dev` / `prod` / a release id |
| **Key Vault reference** | A key whose value is a Key Vault secret URI — one provider, both stores |
| **Feature flag** | A managed flag with filters (percentage, targeting, time window) |
| **Sentinel key** | A single key you bump to signal "config changed, reload everything" |
| **Snapshot** | An immutable, point-in-time set — deploy against a pinned config |

```csharp
builder.Configuration.AddAzureAppConfiguration(options =>
{
    options.Connect(new Uri(builder.Configuration["AppConfig:Endpoint"]!), new ManagedIdentityCredential())
           .Select(KeyFilter.Any, LabelFilter.Null)                                  // defaults
           .Select(KeyFilter.Any, builder.Environment.EnvironmentName)               // environment overrides
           .ConfigureKeyVault(kv => kv.SetCredential(new ManagedIdentityCredential()))  // resolve KV references
           .ConfigureRefresh(refresh => refresh
               .Register("Shop:Sentinel", refreshAll: true)                          // watch one key…
               .SetRefreshInterval(TimeSpan.FromSeconds(30)))                        // …reload everything
           .UseFeatureFlags();
});

builder.Services.AddAzureAppConfiguration();
builder.Services.AddFeatureManagement();

var app = builder.Build();
app.UseAzureAppConfiguration();     // middleware that triggers the refresh check per request
```

```csharp
// feature flags read like any other service
public sealed class CheckoutController(IFeatureManager features)
{
    public async Task<IActionResult> Post(CancellationToken ct)
        => await features.IsEnabledAsync("NewPricingEngine")
            ? await NewPathAsync(ct)
            : await OldPathAsync(ct);
}
```

**The sentinel pattern is the interview answer** to "how do you change config without a restart?":
polling every key is expensive and can catch a half-written change set, so you register **one** key,
write all your changes, then bump the sentinel — and the provider reloads the lot atomically.

App Configuration is **not** a secret store: it has no HSM, no soft-delete-with-purge-protection story
for secrets, and its values are readable by anyone with data-plane read. Put secrets in Key Vault and
reference them.

## Encryption, in one table

| | Mechanism | Your job |
| --- | --- | --- |
| **In transit** | TLS 1.2+ everywhere, including service-to-service; HTTPS-only and `minTlsVersion` on every resource | Turn off HTTP, pin the minimum version |
| **At rest** | Service-managed keys by default (AES-256) | Use **customer-managed keys** (CMK) in Key Vault when policy demands control of the key lifecycle |
| **In use** | Confidential computing / Always Encrypted for SQL | Only where the threat model needs it |
| **Application level** | `IDataProtectionProvider`, or envelope encryption with a Key Vault **Key** | Persist Data Protection keys to blob storage + protect with a Key Vault key when running multi-instance |

```csharp
// ASP.NET Core Data Protection on multiple instances: shared key ring, key-encrypted at rest
builder.Services.AddDataProtection()
    .PersistKeysToAzureBlobStorage(new Uri(config["DataProtection:BlobUri"]!), credential)
    .ProtectKeysWithAzureKeyVault(new Uri(config["DataProtection:KeyUri"]!), credential);
```

Without this, every instance generates its own key ring and antiforgery tokens/cookies break on
scale-out — a classic "works on one instance" bug.

## Hands-on

```bash
RG=rg-shop-dev; KV=kv-shop-dev$RANDOM; AC=appcs-shop-dev; APP=shop-dev-api

az keyvault create -g $RG -n $KV --enable-rbac-authorization true \
  --enable-purge-protection true --retention-days 90
az keyvault secret set --vault-name $KV -n Db-Password --value "$(openssl rand -base64 32)"

PRINCIPAL=$(az webapp identity show -g $RG -n $APP --query principalId -o tsv)
az role assignment create --assignee-object-id $PRINCIPAL --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" --scope $(az keyvault show -n $KV --query id -o tsv)

# app setting that resolves through the platform — no SDK, no secret in ARM
az webapp config appsettings set -g $RG -n $APP --settings \
  Db__Password="@Microsoft.KeyVault(SecretUri=https://$KV.vault.azure.net/secrets/Db-Password/)"

# App Configuration + the sentinel
az appconfig create -g $RG -n $AC --sku standard
az appconfig kv set -n $AC --key "Shop:Api:PageSize" --label prod --value 50 --yes
az appconfig kv set -n $AC --key "Shop:Sentinel"     --label prod --value 1  --yes
az role assignment create --assignee-object-id $PRINCIPAL --assignee-principal-type ServicePrincipal \
  --role "App Configuration Data Reader" --scope $(az appconfig show -g $RG -n $AC --query id -o tsv)
```

## Rapid-fire Q&A

**Q: Key Vault or App Configuration?**
Both. Key Vault holds secrets (HSM-backed, audited, soft delete + purge protection); App
Configuration holds non-secret settings and feature flags, and can hold *references* to Key Vault
secrets so the app has one provider.

**Q: A Key Vault secret was deleted in production. What now?**
Soft delete means it is recoverable within the retention window — `az keyvault secret recover`. Purge
protection additionally means nobody could have hard-deleted it early. That pair is the answer to
"how do you protect against a destructive admin?".

**Q: RBAC or access policies on a vault?**
RBAC: standard role assignments, inheritance, PIM, and consistent tooling. Access policies are the
legacy per-vault model. And remember `Contributor` on the vault grants no data-plane access.

**Q: How do you rotate a database password with no downtime?**
Two credentials (A/B): provision B, update the secret to B (a new version), let clients pick it up,
then revoke A. Automate with the rotation policy and react to `SecretNearExpiry` Event Grid events.
The app must read the secret **without a version** so it follows the rotation.

**Q: How does a setting change without redeploying or restarting?**
App Configuration with a registered refresh key. Register a **sentinel** key, write all your changes,
bump the sentinel — the provider reloads the whole set atomically on the next refresh interval.

**Q: Why not put secrets in app settings?**
They are visible to anyone with control-plane read on the app, they land in ARM exports and templates,
they have no version/rotation/audit story, and they are trivially leaked by a diagnostic dump. A Key
Vault reference gives you the same ergonomics with none of that.

**Q: Secret or key for signing a token?**
A **key**. The private material never leaves the vault; you call sign/verify. A secret would hand the
material to every process that reads it.

**Q: Why do cookies/antiforgery tokens break after scaling out?**
Each instance generated its own Data Protection key ring. Persist the ring to shared storage and
protect it with a Key Vault key.

---

**Prev:** [08 — Messaging & Events](08-messaging-and-events.md) ·
**Next:** [10 — API Management](10-api-management.md) ·
**Up:** [Azure track hub](readme.md)

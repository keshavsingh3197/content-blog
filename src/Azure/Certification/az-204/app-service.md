---
title: App Service Reference
summary: What App Service is, the plan tiers and what each unlocks, deployment slots and networking features, with exam-style questions and answers.
tags: [Azure, App-Service, PaaS, Interview]
updated: 2026-09-03
---

# App Service

> Reference notes. The interview-shaped version — swap mechanics, sticky settings, autoscale,
> diagnostics and the `az` lab — is
> [Interview → Azure → 03 App Service](../../../Interview/Azure/03-app-service.md).

> Azure App Service is an HTTP-based service for hosting web applications, REST APIs, and mobile back
> ends. You can develop in your favorite programming language or framework. Applications run and scale
> with ease on both Windows and Linux-based environments.

- **Purpose:** a `PaaS` offering to host `web apps`, `REST APIs` and `backend services`.
- **Supported stacks:** .NET, Java, Python, PHP, Node.js, Ruby, and custom containers.
- **Key features:** autoscaling · custom domains and TLS · CI/CD integration · built-in
  authentication/authorization · deployment slots · managed identity · minimal operational overhead.

## The plan is the compute

An **App Service plan** is a set of VMs in one region and one OS. Every app in a plan runs on **all**
the plan's VMs — and so do its deployment slots. Apps in the same plan compete for the same CPU and
memory, which is the usual explanation for "the API got slow when we added the admin site".

| Category | Tiers | What it unlocks |
| --- | --- | --- |
| **Shared compute** | Free, Shared | Shared VMs and CPU quotas; **no scale-out** |
| **Dedicated compute** | Basic | Dedicated VMs, custom domains + TLS, manual scale-out — **no slots, no autoscale** |
| | Standard | **Autoscale**, **5 deployment slots**, backups, Traffic Manager |
| | Premium v3 / v4 | Faster VMs, more memory, **20 slots**, higher scale, zone redundancy |
| **Isolated** | IsolatedV2 | App Service Environment — compute **and** network isolation in your own VNet, maximum scale-out |

**Scale up** = change the tier/VM size (more CPU/RAM, and tier features). **Scale out** = more
instances (throughput and HA). Autoscale rules need Standard or higher.

## Networking features at a glance

| Feature | Direction | Purpose |
| --- | --- | --- |
| App-assigned address | inbound | A dedicated inbound IP for the app |
| Access restrictions | inbound | Allow/deny by IP or service tag |
| Private endpoint | inbound | A private IP for the app inside a VNet |
| **Regional VNet integration** | **outbound** | The app reaches private resources |
| **Hybrid Connections** | **outbound** | Reach one on-premises TCP endpoint without a VPN |
| Service endpoints | inbound | Restrict access to specific subnets |

---

<details>
<summary>Exam-style questions</summary>

**1. Which App Service plan category provides the maximum scale-out capabilities?**

- Dedicated compute
- Isolated
- Shared compute

<details>
<summary>Answer</summary>

**Isolated.** It provides network *and* compute isolation and has the maximum scale-out capability.

</details>

**2. Which networking feature of App Service can be used to control *outbound* network traffic?**

- App-assigned address
- Hybrid Connections
- Service endpoints

<details>
<summary>Answer</summary>

**Hybrid Connections** — an outbound feature. (App-assigned address and service endpoints are
inbound.) Regional VNet integration is the other outbound feature.

</details>

**3. Which tier is the minimum for deployment slots?**

- Basic
- Standard
- Premium

<details>
<summary>Answer</summary>

**Standard** — five slots. Basic has none; Premium and Isolated allow twenty.

</details>

**4. After a slot swap, the staging slot's connection string appeared in production. Why?**

<details>
<summary>Answer</summary>

App settings and connection strings **swap with the content** by default. Mark them as
*deployment slot settings* (`--slot-settings`) to pin them to a slot.

</details>

**5. Which of these does NOT swap between slots?**

- App settings
- Managed identities
- Language framework version

<details>
<summary>Answer</summary>

**Managed identities.** They are slot-specific, along with publishing endpoints, custom domains,
TLS/SSL settings, scale settings, Always On, IP restrictions, CORS, diagnostics and VNet integration.

</details>

</details>

## References

- [App Service documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [App Service plans](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans)
- [Set up staging environments (slots)](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)

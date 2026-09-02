---
title: Cloud Architecture
summary: Deployment models, serverless and storage, IaC with Terraform/Bicep/ARM, cloud-native web and data integration, networking and monitoring.
tags: [Architecture, Cloud, Azure, AWS, IaC, Interview]
updated: 2026-09-02
---

# Cloud Architecture

> Cloud service & deployment models, the shared-responsibility line, serverless & storage,
> Infrastructure-as-Code, cloud-native web/data, networking, and the Well-Architected pillars —
> across **Azure** and **AWS** for the .NET ecosystem.

## Service Models — who manages what

| Model | You manage | Provider manages | Examples |
|-------|-----------|------------------|----------|
| **IaaS** | OS, runtime, app, data | Virtualization, servers, network | Azure VM, EC2 |
| **PaaS** | App + data | OS, runtime, scaling | App Service, Elastic Beanstalk |
| **FaaS** | Function code | Everything else, per-invocation | Azure Functions, AWS Lambda |
| **SaaS** | Config/data only | Entire stack | M365, Salesforce |

- **FaaS** is a subset of serverless: event-driven, scale-to-zero, pay-per-execution, stateless.
- Move up the stack (IaaS→SaaS) = less control, less ops burden, faster delivery.

## Deployment Models

- **Public** (shared multi-tenant), **Private** (dedicated), **Hybrid** (on-prem + cloud, e.g. Azure Arc / AWS Outposts), **Multi-cloud** (spread across providers to avoid lock-in).

## Shared Responsibility

- **Provider** = security *of* the cloud (hardware, hypervisor, physical). **You** = security *in* the cloud (data, identity, config, app code, network rules).
- Responsibility shifts left as you move IaaS→SaaS. **Data classification & IAM are always yours.**

## Account/Subscription Setup & Geography

| Concept | Azure | AWS |
|---------|-------|-----|
| Billing/isolation boundary | **Subscription** (under a **Tenant**/Entra ID) | **Account** (under an **Organization**) |
| Logical grouping | **Resource Group**, **Management Group** | **Tags**, **OUs** |
| Physical geography | **Region** | **Region** |
| Fault isolation zone | **Availability Zone** | **Availability Zone** |

- **Region** = geographic area (data residency, latency). **AZ** = isolated datacenter(s) within a region — deploy across **≥2 AZs** for HA.
- **Region pairs** (Azure) / **multi-region** (AWS) for DR. Not every service is in every region.

## Serverless & Storage

| Purpose | Azure | AWS |
|---------|-------|-----|
| Functions (FaaS) | **Azure Functions** | **AWS Lambda** |
| Object/blob store | **Blob Storage** | **S3** |
| Wide-column / KV NoSQL | **Table Storage / Cosmos DB** | **DynamoDB** |
| Managed queue | **Storage Queue / Service Bus** | **SQS** |
| Event streaming | **Event Hubs** | **Kinesis** |

- **Azure Functions triggers/bindings** (HTTP, Queue, Timer, Blob, Event Grid) reduce glue code; hosting: **Consumption** (scale-to-zero), **Premium** (no cold start, VNet), **Dedicated**.
- **Lambda**: 15-min max, event sources via triggers; concurrency & provisioned concurrency to tame cold starts.
- **Blob/S3** tiers: Hot/Cool/Archive (Azure) ~ Standard/IA/Glacier (AWS).

```csharp
// Azure Function — HTTP trigger (isolated worker, .NET)
[Function("GetOrder")]
public HttpResponseData Run(
    [HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequestData req)
    => req.CreateResponse(HttpStatusCode.OK);
```

## Infrastructure as Code (IaC)

- **Declarative** desired-state, versioned in Git, repeatable environments.
- **Idempotency**: applying the same template N times yields the same result (no duplicate resources).
- **State**: Terraform records real-world resource IDs in a **state file** (store remotely + lock, e.g. Azure Storage / S3+DynamoDB) to plan diffs and avoid drift. ARM/Bicep/CloudFormation keep state **server-side** (deployment/stack history).

| Tool | Scope | Language |
|------|-------|----------|
| **Terraform** | Multi-cloud | HCL |
| **Bicep** / **ARM** | Azure | Bicep DSL / JSON |
| **CloudFormation** / **CDK** | AWS | YAML/JSON / code |
| **Pulumi** | Multi-cloud | C#/TS/Python |

```hcl
# Terraform — Azure resource group + storage account
resource "azurerm_resource_group" "rg" {
  name     = "rg-app-prod"
  location = "westeurope"
}
resource "azurerm_storage_account" "sa" {
  name                     = "stappprod01"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

```bash
terraform init      # download providers, configure backend/state
terraform plan      # preview diff vs state (idempotent)
terraform apply     # converge to desired state
```

## Cloud-Native Web

| Need | Azure | AWS |
|------|-------|-----|
| Managed web/API host | **App Service / Web Apps** | **Elastic Beanstalk / App Runner** |
| Serverless API | **Azure Functions** | **Lambda + API Gateway** |
| API management/gateway | **API Management (APIM)** | **API Gateway** |
| Low-code workflows | **Logic Apps** | **Step Functions** |
| Containers | **Container Apps / AKS** | **ECS/Fargate / EKS** |

- **App Service**: deployment slots (blue-green), autoscale, managed certs, easy .NET deploy.
- **Logic Apps / Step Functions**: orchestrate integrations with connectors, retries, state.

## Cloud-Native Data Integration

| Purpose | Azure | AWS |
|---------|-------|-----|
| ETL / orchestration | **Data Factory (ADF)** | **Data Pipeline / Glue** |
| Serverless ETL & catalog | **ADF Data Flows / Synapse** | **Glue** |
| Big-data compute | **Azure Batch / HDInsight** | **EMR** |
| Analytics warehouse/lakehouse | **Synapse Analytics / Fabric** | **Redshift / Athena** |

- **ADF/Glue**: pipelines, triggers, linked services; **Batch/EMR**: parallel HPC/Spark/Hadoop jobs.

## Cloud Networking

| Concept | Azure | AWS |
|---------|-------|-----|
| Virtual network | **VNet** | **VPC** |
| Segmentation | **Subnet** | **Subnet** |
| Firewall rules | **NSG** | **Security Group / NACL** |
| Global DNS routing | **Traffic Manager / Front Door** | **Route 53** |
| Secrets/keys | **Key Vault** | **Secrets Manager / KMS** |
| Private service access | **Private Endpoint / Private Link** | **VPC Endpoint / PrivateLink** |
| Load balancing | **Load Balancer / App Gateway** | **ELB (ALB/NLB)** |

- **NSG** = stateful allow/deny by IP/port/direction. **Private Endpoints** keep PaaS traffic off the public internet.
- **Traffic Manager/Route 53**: DNS-based routing (priority, geographic, weighted, latency) for multi-region.
- **Key Vault/Secrets Manager**: never store secrets in code/config — use **Managed Identity / IAM roles** to fetch at runtime.

## Well-Architected Pillars

| Pillar (Azure WAF ≈ AWS WAF) | Focus |
|---|---|
| **Reliability** | HA, DR, fault tolerance, backups |
| **Security** | Identity, encryption, least privilege |
| **Cost Optimization** | Right-sizing, reserved/spot, scale-to-zero |
| **Operational Excellence** | IaC, automation, monitoring |
| **Performance Efficiency** | Elastic scale, caching, right service |
| **Sustainability** (AWS) / | Efficient resource use |

## Monitoring

- Cloud-native observability (Azure Monitor/App Insights, CloudWatch, OpenTelemetry, ELK, Grafana) is covered in **[15 — Observability & Monitoring](15-observability-and-monitoring.md)**.

## Interview Q&A

**Q: IaaS vs PaaS vs FaaS — when to pick each?**
A: IaaS when you need OS-level control (legacy/lift-and-shift). PaaS for standard web/APIs where you want the platform to handle scaling/patching. FaaS for spiky, event-driven, short-lived work where scale-to-zero and pay-per-use matter.

**Q: What does the shared responsibility model mean in practice?**
A: The provider secures the underlying infrastructure; you secure your data, identities, network config and app. The boundary moves toward the provider as you go IaaS→SaaS, but data and IAM are always your responsibility.

**Q: Region vs Availability Zone?**
A: A region is a geographic area (data residency/latency); an AZ is a physically isolated datacenter within a region. Spread across AZs for HA and across regions for DR/data-residency.

**Q: Why is Terraform state important, and what is idempotency?**
A: State maps config to real resource IDs so Terraform can compute diffs and detect drift; store it remotely with locking. Idempotency means re-applying the same template converges to the same state without creating duplicates.

**Q: How do you keep PaaS traffic private?**
A: Use Private Endpoints/PrivateLink to expose the service via a private IP inside your VNet/VPC, disable public network access, and control egress with NSGs/Security Groups.

**Q: Bicep/ARM vs Terraform on Azure?**
A: Bicep/ARM are Azure-native (day-1 feature support, server-side state, no extra tooling) but Azure-only. Terraform is multi-cloud with a rich provider ecosystem but needs external state management. Choose Terraform for multi-cloud, Bicep for Azure-only teams.

**Q: How do you handle secrets in the cloud?**
A: Store them in Key Vault/Secrets Manager, grant access via Managed Identity/IAM roles (no static credentials), rotate regularly, and reference them at runtime rather than baking into images or config files.

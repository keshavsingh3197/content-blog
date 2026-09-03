---
title: Azure Automation & Logic Apps
summary: Automation Accounts, runbooks and modules, plus Logic Apps — what each is for, how they differ from Azure Functions, and when to reach for which.
tags: [Azure, Automation, Logic-Apps, Runbook, Integration]
updated: 2026-09-03
---

# Azure Automation & Logic Apps

> Reference notes on the two "no-code / low-code" automation services. For the developer interview
> track — compute, storage, messaging, security and observability in C# — see
> [Interview → Azure](../Interview/Azure/readme.md).

## Automation Account

### Introduction

- Microsoft Azure Automation provides a way for users to automate the manual, long-running, error-prone, and
frequently repeated tasks that are commonly performed in a cloud and across external systems
- Azure uses a highly scalable and reliable workflow execution engine to simplify cloud management.
- It saves time and increases the reliability of regular administrative tasks and even schedules them to be automatically
performed at regular intervals.

- 3 core components
  1. Automation Account
  2. Automation RunBook
  3. Automation Worker

### Automation RunBook

- Runbook is a set of tasks that perform some automated process in Azure Automation. It may be a simple process such
as starting a virtual machine and creating a log entry, or you may have a complex runbook that combines other smaller
runbooks to perform a complex process across multiple resources or even multiple clouds and on-premises
environments.
  - get the current size of database
  - check if the threshold has exceeded and then truncate it and notify the user.
Instead of manually performing each of these steps, you could create a runbook that would perform all of these tasks
as a single process.

---

> Runbooks:

- Runbooks are the primary means of automation in Azure Automation. They contain the logic and instructions for performing a specific task or set of tasks.
- Runbooks can be written in PowerShell, PowerShell Workflow, or Python.
- You can directly execute a runbook to perform its defined automation task. Runbooks can also be scheduled to run at specific times or triggered by external events.
- A runbook typically contains the complete script or code necessary to perform its designated automation task.

> Modules:

- Modules in Azure Automation are collections of PowerShell cmdlets, functions, and other resources that can be used in runbooks.
- Modules provide reusable code that can be shared across multiple runbooks. This allows you to modularize your automation scripts and avoid duplicating code.
- When you import a module into your Automation Account, the cmdlets and functions provided by the module become available for use in your runbooks.
- Modules can be custom-made or imported from the PowerShell Gallery or other sources.

> Key Differences

- `Purpose:` Runbooks are used to define and execute automation tasks, while modules are used to provide reusable code (cmdlets, functions) that can be used in runbooks.
- `Usage:` You execute a runbook to perform an automation task. You import a module into your Automation Account so that its cmdlets and functions can be used in your runbooks.
- `Scope:` A runbook typically contains code for a specific automation task, while a module contains a collection of related cmdlets and functions that can be used across multiple runbooks.

## Logic App

- **Azure Logic Apps** is a cloud integration service for building *workflows* that connect systems,
  data and services — with hundreds of prebuilt **connectors** (Office 365, Salesforce, SAP, SQL,
  Service Bus, Blob Storage, HTTP, FTP) instead of hand-written client code.
- A workflow is a **trigger** plus a sequence of **actions**, designed visually or in JSON
  (Workflow Definition Language), with built-in retries, error handling and long-running state.

### Triggers and actions

| Concept | Meaning |
| --- | --- |
| **Trigger** | Starts the workflow — recurrence (schedule), request (HTTP), or a connector event (new email, new blob, queue message) |
| **Action** | A step: call a connector, an HTTP endpoint, an Azure Function, or another workflow |
| **Control** | Condition, switch, for-each (with concurrency control), until, scope, terminate |
| **Connector** | Managed (hosted by Azure, per-execution cost) or built-in (runs in the engine, faster and cheaper) |

### Consumption vs Standard

| | **Consumption** | **Standard** |
| --- | --- | --- |
| Hosting | Multi-tenant, pay per action executed | Single-tenant, App Service plan-like pricing |
| Workflows per resource | One | **Many** |
| Stateless workflows | ❌ | ✅ (lower latency, no run history) |
| VNet integration / private endpoints | limited | ✅ |
| Local development | limited | ✅ (VS Code, runs on the Azure Functions runtime) |

### Logic Apps vs Azure Functions vs Automation runbooks

| | **Logic Apps** | **Azure Functions** | **Automation runbook** |
| --- | --- | --- | --- |
| You write | A workflow (visual/JSON) | Code (C#, Python, …) | A PowerShell/Python script |
| Best at | Integrating SaaS and Azure services, long-running approvals | Custom logic, APIs, event processing | Operating Azure itself — VM lifecycle, patching, cleanup |
| State | Durable by design | Stateless (Durable Functions for state) | Job-scoped |
| Reach for it when | The work is "connect A to B with rules" | The work is "run my code on an event" | The work is "administer the estate on a schedule" |

A common shape combines them: a Logic App orchestrates the business workflow and calls an Azure
Function for the one step that needs real code.

### Related

- [Interview → Azure → 08 Messaging & Events](../Interview/Azure/08-messaging-and-events.md) — Service
  Bus, Event Grid and Event Hubs, the services Logic Apps most often sits between.
- [Logic Apps documentation](https://learn.microsoft.com/en-us/azure/logic-apps/)
- [Azure Automation documentation](https://learn.microsoft.com/en-us/azure/automation/)


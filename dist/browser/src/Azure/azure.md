# Azure

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

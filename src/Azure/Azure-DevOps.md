---
title: Azure DevOps & CI/CD to Azure
summary: The five Azure DevOps services, a working multi-stage YAML pipeline that builds and deploys a .NET app to App Service, workload identity federation instead of secrets, environments and approvals — plus the GitHub Actions equivalent.
tags: [Azure, Azure-DevOps, CI-CD, Pipelines, GitHub-Actions, .NET]
updated: 2026-09-03
---

# Azure DevOps & CI/CD to Azure

> Reference notes. The interview-shaped version of CI/CD in general is
> [Interview → Architecture → 14 DevOps & CI/CD](../Interview/Architecture/14-devops-and-cicd.md);
> the Azure services these pipelines deploy to are in [Interview → Azure](../Interview/Azure/readme.md).

## The five services

| Service | What it is | Equivalent |
| --- | --- | --- |
| **Boards** | Work items, backlogs, sprints, queries | GitHub Issues/Projects, Jira |
| **Repos** | Git hosting, branch policies, PR gates | GitHub |
| **Pipelines** | CI/CD — YAML (recommended) or classic | GitHub Actions |
| **Artifacts** | Feeds for NuGet/npm/Maven/Python packages | GitHub Packages |
| **Test Plans** | Manual and exploratory testing | — |

**Organization → Project → Repo/Pipeline** is the hierarchy; permissions and service connections are
scoped at the project.

## Pipeline vocabulary

| Term | Meaning |
| --- | --- |
| **Trigger** | What starts a run — `trigger` (CI on push), `pr`, `schedules`, or another pipeline |
| **Stage** | A boundary you can gate and approve (build → dev → prod) |
| **Job** | A unit that runs on one agent; jobs in a stage run in parallel by default |
| **Step / task** | One command or packaged action |
| **Agent pool** | Microsoft-hosted (clean VM per job) or self-hosted (yours — for private networks) |
| **Variable group** | Shared variables, optionally **linked to Key Vault** |
| **Environment** | A named deployment target carrying **approvals, checks and history** |
| **Service connection** | How the pipeline authenticates to Azure — use **workload identity federation** |

## A multi-stage pipeline: build once, deploy through slots

```yaml
# azure-pipelines.yml
trigger:
  branches: { include: [ master ] }

variables:
  buildConfiguration: Release
  azureSubscription: 'sc-shop-prod'        # a workload-identity-federation service connection
  appName: 'shop-api'
  resourceGroup: 'rg-shop-prod'

stages:
- stage: Build
  jobs:
  - job: build
    pool: { vmImage: 'ubuntu-latest' }
    steps:
    - task: UseDotNet@2
      inputs: { packageType: sdk, version: '10.x' }

    - script: dotnet restore --locked-mode          # fail if the lockfile drifted
      displayName: Restore

    - script: dotnet build --no-restore -c $(buildConfiguration)
      displayName: Build

    - script: dotnet test --no-build -c $(buildConfiguration) --logger trx --collect:"XPlat Code Coverage"
      displayName: Test

    - task: PublishTestResults@2
      condition: succeededOrFailed()
      inputs: { testResultsFormat: VSTest, testResultsFiles: '**/*.trx' }

    - script: dotnet publish src/Shop.Api -c $(buildConfiguration) -o $(Build.ArtifactStagingDirectory)/app
      displayName: Publish

    - task: PublishPipelineArtifact@1
      inputs:
        targetPath: '$(Build.ArtifactStagingDirectory)/app'
        artifact: app                                # build once — every stage deploys THIS artifact

- stage: DeployStaging
  dependsOn: Build
  condition: succeeded()
  jobs:
  - deployment: staging
    environment: 'shop-staging'                      # history + checks live here
    strategy:
      runOnce:
        deploy:
          steps:
          - download: current
            artifact: app
          - task: AzureWebApp@1
            inputs:
              azureSubscription: $(azureSubscription)
              appName: $(appName)
              slotName: staging
              deployToSlotOrASE: true
              resourceGroupName: $(resourceGroup)
              package: '$(Pipeline.Workspace)/app'
          - script: curl -sf "https://$(appName)-staging.azurewebsites.net/health"
            displayName: Smoke test

- stage: PromoteProduction
  dependsOn: DeployStaging
  condition: succeeded()
  jobs:
  - deployment: production
    environment: 'shop-production'                   # add a manual approval check on this environment
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureAppServiceManage@0
            inputs:
              azureSubscription: $(azureSubscription)
              Action: 'Swap Slots'
              WebAppName: $(appName)
              ResourceGroupName: $(resourceGroup)
              SourceSlot: staging
```

Three things this pipeline gets right, and interviewers look for:

1. **Build once, deploy many.** The artifact produced in `Build` is the one deployed to every
   environment — no rebuild per stage, so what you tested is what ships.
2. **Promotion by slot swap**, not redeploy, so production is warmed before it takes traffic and
   rollback is a second swap ([App Service slots](../Interview/Azure/03-app-service.md#deployment-slots--the-part-they-actually-probe)).
3. **Approvals live on the environment**, not in the YAML — so the gate cannot be edited away in a PR.

## Authentication: stop using secrets

A **workload identity federation** service connection has Azure DevOps present a short-lived OIDC
token that Entra ID trusts via a **federated credential** on an app registration. No client secret, no
certificate, nothing to rotate or leak. It is now the default for new Azure Resource Manager service
connections, and existing secret-based ones can be converted.

For secrets the pipeline genuinely needs, link a **variable group to Key Vault** rather than pasting
values into the pipeline UI:

```yaml
variables:
- group: shop-prod-secrets          # linked to kv-shop-prod; values fetched at run time
```

Pipeline secrets are masked in logs, but masking is a safety net, not a control — never `echo` one,
and never write one into a build artifact.

## Quality gates worth having

| Gate | Where |
| --- | --- |
| Build + tests must pass | Branch policy on `master` |
| Minimum reviewers, linked work item | Branch policy |
| Code coverage threshold | `PublishCodeCoverageResults` + a policy |
| Static analysis / SAST | A scan task in the Build stage |
| Dependency and container scanning | Same stage, failing the build on high severity |
| Manual approval before production | **Environment check**, not YAML |

## The GitHub Actions equivalent

Same shape, different syntax — and the same OIDC story (`permissions: id-token: write` +
`azure/login` with a federated credential, no publish profile secret):

```yaml
name: build-and-deploy
on:
  push: { branches: [ master ] }

permissions:
  contents: read
  id-token: write                       # required for OIDC login to Azure

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '10.x' }
      - run: dotnet test --configuration Release
      - run: dotnet publish src/Shop.Api -c Release -o ./publish
      - uses: actions/upload-artifact@v4
        with: { name: app, path: ./publish }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production             # approvals attach here, same as Azure DevOps
    steps:
      - uses: actions/download-artifact@v4
        with: { name: app, path: ./publish }
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/webapps-deploy@v3
        with:
          app-name: shop-api
          slot-name: staging
          package: ./publish
```

### Choosing between them

| | **Azure DevOps** | **GitHub Actions** |
| --- | --- | --- |
| Strong at | Enterprise governance, Boards, Test Plans, granular permissions, self-hosted agents at scale | Open source, marketplace breadth, code and CI in one place |
| Approvals | Environment checks, gates, deployment history | Environment protection rules |
| Both | YAML pipelines, OIDC to Azure with no stored secret, hosted or self-hosted runners | |

If the code already lives in GitHub, Actions is usually the lower-friction choice; Azure DevOps wins
where Boards/Test Plans and fine-grained governance matter.

## References

- [Azure Pipelines documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/)
- [Workload identity federation for service connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure)
- [Deploy to App Service with Azure Pipelines](https://learn.microsoft.com/en-us/azure/app-service/deploy-azure-pipelines)
- [Authenticate GitHub Actions to Azure with OIDC](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect)

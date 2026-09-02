---
title: DevOps & CI/CD
summary: CI/CD pipelines, MSBuild, quality gates, Docker and Kubernetes, configuration management, branching and multi-geography delivery.
tags: [Architecture, DevOps, CI-CD, Docker, Kubernetes, Interview]
updated: 2026-09-02
---

# DevOps & CI/CD

> Continuous integration/delivery/deployment, pipeline stages, .NET build tooling,
> Jenkins/GitHub Actions/Azure DevOps, quality gates, Docker & Kubernetes,
> config management, branching strategies, and multi-geography delivery.

## CI vs CD vs Continuous Deployment

| Term | Definition |
|------|-----------|
| **Continuous Integration** | Every merge triggers build + automated tests on a shared branch; catch integration issues early. |
| **Continuous Delivery** | Every change is *always releasable*; deploy to prod is a **manual approval**. |
| **Continuous Deployment** | Every green change auto-deploys to prod with **no manual gate**. |

- Goal: small, frequent, low-risk changes; fast feedback; automation over toil.

## Pipeline Stages

```
Source → Build → Test → Scan → Package → Deploy → (Verify/Monitor)
```

- **Build**: compile, restore deps. **Test**: unit → integration → E2E. **Scan**: SAST/DAST, dependency/license, secrets. **Package**: artifact/container image + version. **Deploy**: to env with promotion (dev→test→staging→prod). **Fail fast** — cheap checks first.

## .NET Build Tooling

- **MSBuild** — the build engine (`.csproj`/`.sln`), targets & tasks.
- **NuGet restore** — resolve dependencies (`dotnet restore`, lock files for reproducibility).
- **`dotnet` CLI** — the everyday commands:

```bash
dotnet restore
dotnet build -c Release
dotnet test --collect:"XPlat Code Coverage"
dotnet publish -c Release -o ./out   # self-contained/framework-dependent artifact
```

## CI/CD Platforms

| Platform | Model | Config |
|----------|-------|--------|
| **Jenkins** | Self-hosted, plugin-rich | `Jenkinsfile` (Groovy) |
| **GitHub Actions** | SaaS, marketplace actions | YAML in `.github/workflows` |
| **Azure DevOps Pipelines** | SaaS/self-hosted, tight Azure integration | YAML (`azure-pipelines.yml`) |
| **GitLab CI** | Integrated with GitLab | `.gitlab-ci.yml` |

### Jenkins declarative pipeline

```groovy
pipeline {
  agent any
  stages {
    stage('Restore/Build') { steps { sh 'dotnet build -c Release' } }
    stage('Test')          { steps { sh 'dotnet test --collect:"XPlat Code Coverage"' } }
    stage('SonarQube')     { steps { sh 'dotnet sonarscanner begin /k:app; dotnet build; dotnet sonarscanner end' } }
    stage('Publish')       { steps { sh 'dotnet publish -c Release -o out' } }
    stage('Deploy')        { when { branch 'main' }
                             steps { sh './deploy.sh prod' } }
  }
  post { failure { echo 'Pipeline failed' } }
}
```

### GitHub Actions (equivalent)

```yaml
on: { push: { branches: [main] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '10.0.x' }
      - run: dotnet build -c Release
      - run: dotnet test --collect:"XPlat Code Coverage"
      - run: dotnet publish -c Release -o out
```

## Quality Gates

- **SonarQube** — static analysis, code smells, bugs, coverage & duplication; a **quality gate** fails the build if thresholds aren't met.
- **Code coverage** — Coverlet/`XPlat Code Coverage` → ReportGenerator; gate on a minimum (e.g. new-code %).
- **Security scanning** — **SAST** (source), **SCA/dependency** (`dotnet list package --vulnerable`, Dependabot, Snyk), **DAST** (running app), secret scanning, container image scan (Trivy).
- Fail the pipeline on gate breach — quality is enforced, not advisory.

## Containerization — multi-stage Dockerfile (.NET)

```dockerfile
# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

# Runtime stage — small, no SDK
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app .
USER app
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

- **Multi-stage** keeps the SDK out of the final image → smaller, safer. Pin tags, run as non-root, use `.dockerignore`.

## Kubernetes (brief)

- **Deployment** — desired replicas + rolling updates of Pods. **Service** — stable virtual IP/DNS + load-balancing across Pods. **Ingress** — HTTP(S) routing/TLS into Services. **ConfigMap/Secret** — config & secrets.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: myapp }
spec:
  replicas: 3
  selector: { matchLabels: { app: myapp } }
  template:
    metadata: { labels: { app: myapp } }
    spec:
      containers:
        - name: myapp
          image: registry/myapp:1.2.3
          ports: [{ containerPort: 8080 }]
          readinessProbe: { httpGet: { path: /health, port: 8080 } }
```

- **Helm** — package manager for K8s: templated **charts** + `values.yaml` for env-specific config and versioned releases.
- Managed: **AKS** (Azure), **EKS** (AWS).

## Configuration Management

| Tool | Model | Language |
|------|-------|----------|
| **Ansible** | **Push**, agentless (SSH) | YAML playbooks |
| **Chef** | **Pull**, agent | Ruby recipes |
| **Puppet** | **Pull**, agent | Puppet DSL |

- **Push** (Ansible): control node pushes config on demand — simple, agentless.
- **Pull** (Chef/Puppet): nodes poll a server and converge — scales to large fleets, self-heals drift.
- All are **idempotent** and declare desired state. IaC (Terraform) provisions infra; config mgmt configures the OS/app on it.

## Branching & Merging Strategies

| Strategy | Idea | Fit |
|----------|------|-----|
| **GitFlow** | Long-lived `develop`/`release`/`hotfix` branches | Scheduled releases, versioned products |
| **Trunk-based** | Short-lived branches, merge to `main` daily | CI/CD, high velocity |
| **GitHub Flow** | Feature branch → PR → `main` | Web/continuous deploy |

- **Feature flags** decouple deploy from release — merge incomplete work behind a toggle; enables trunk-based dev, canary, A/B, kill-switch.
- **Pull Requests**: peer review, required checks (build/tests/scan), branch protection before merge.

## Multi-Geography Deployment

- **Data residency/sovereignty** (GDPR) — keep regional data in-region.
- **Latency** — deploy close to users; use CDN/edge and geo-routing (Traffic Manager / Route 53 / Front Door).
- **Progressive rollout** — ring/canary per region, blue-green with slots, automated rollback on SLO breach.
- **Config per region** — parameterize pipelines; avoid hard-coded endpoints; watch time zones & regional service availability.

## Interview Q&A

**Q: Continuous Delivery vs Continuous Deployment?**
A: Both keep the app always releasable; Delivery requires a manual approval to push to production, Deployment automatically ships every passing change with no human gate.

**Q: Why a multi-stage Dockerfile?**
A: The build stage uses the heavy SDK to compile/publish; the final stage copies only the published output onto a slim runtime image. Result: smaller image, reduced attack surface, no build tools in production.

**Q: Push vs pull config management?**
A: Push (Ansible) has a control node send config over SSH — agentless and simple. Pull (Chef/Puppet) has agents periodically fetch and converge to desired state from a server — better for large, drift-prone fleets.

**Q: GitFlow vs trunk-based development?**
A: GitFlow uses long-lived branches suited to versioned, scheduled releases but risks merge pain. Trunk-based uses short-lived branches merged daily behind feature flags, optimizing for CI/CD and fast feedback.

**Q: What are quality gates and where do they run?**
A: Automated pass/fail thresholds (coverage, bugs, vulnerabilities, duplication) enforced in the pipeline — e.g. a SonarQube gate or coverage minimum that fails the build so substandard code can't be merged/deployed.

**Q: How do feature flags help delivery?**
A: They decouple deployment from release — code ships dark and is enabled at runtime, enabling trunk-based development, canary/A-B testing, and instant rollback via a toggle without redeploying.

**Q: Deployment vs Service vs Ingress in Kubernetes?**
A: A Deployment manages replica Pods and rolling updates; a Service gives them a stable IP/DNS and load-balances traffic; an Ingress routes external HTTP(S) with TLS to Services.

**Q: How do you handle secrets in CI/CD?**
A: Store them in the platform's secret store / Key Vault / Secrets Manager, inject at runtime via masked variables or workload identity, never commit them, and run secret-scanning to catch leaks.

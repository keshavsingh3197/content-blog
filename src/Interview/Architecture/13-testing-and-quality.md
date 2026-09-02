# Testing & Quality

> A senior view of testing in .NET: the testing pyramid, unit testing with xUnit and
> mocking, TDD, integration/functional testing (`WebApplicationFactory`, Testcontainers),
> BDD (Reqnroll), the wider test types across SIT/security/production, and the coverage
> and quality gates that enforce it (Coverlet, SonarQube).

## The testing pyramid

- **Unit (base, many)** — fast, isolated, one class/method; run in-memory, milliseconds.
- **Integration/Service (middle)** — components + real dependencies (DB, HTTP); slower.
- **End-to-end / UI (top, few)** — full stack through the UI (Playwright/Selenium); slow, brittle.
- Anti-pattern: the **ice-cream cone** (mostly E2E) — slow, flaky, expensive. Push tests **down** the pyramid.

## Unit testing

- .NET frameworks: **xUnit** (idiomatic, modern default), **NUnit** (rich attributes), **MSTest** (built-in).
- **AAA** — **Arrange** (set up), **Act** (invoke), **Assert** (verify).
- Data-driven tests: xUnit `[Theory]` + `[InlineData]`/`[MemberData]`; NUnit `[TestCase]`.
- Assertions: FluentAssertions / Shouldly for readability; xUnit's `Assert`.

```c#
[Fact]
public void Discount_Applies_TenPercent()
{
    var svc = new Pricing();            // Arrange
    var result = svc.Apply(100m);       // Act
    Assert.Equal(90m, result);          // Assert
}

[Theory]
[InlineData(100, 90)]
[InlineData(200, 180)]
public void Discount_Table(decimal input, decimal expected) =>
    Assert.Equal(expected, new Pricing().Apply(input));
```

### Test doubles: fakes vs mocks vs stubs

| Double | Purpose |
|---|---|
| **Dummy** | Passed but never used (fills a parameter) |
| **Stub** | Returns canned data (state you read) |
| **Fake** | Working lightweight impl (e.g. in-memory repo) |
| **Mock** | Records/verifies **interactions** (behavior) |
| **Spy** | Real object recording some calls |

- **Moq** and **NSubstitute** are the common .NET mocking libraries.

```c#
var repo = new Mock<IRepo>();
repo.Setup(r => r.Get(1)).Returns(new Order(1));   // stub behavior
var sut = new Service(repo.Object);
sut.Process(1);
repo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);  // mock verification
```

- Mock **roles you own** (interfaces/abstractions), not third-party concretes. Over-mocking = brittle tests coupled to implementation.

## TDD — red / green / refactor

1. **Red** — write a failing test for the next small behavior.
2. **Green** — write the minimum code to pass.
3. **Refactor** — clean up with tests green.

- Drives testable design (DI, small units), documents intent, gives a safety net. Keep cycles tiny.

## Functional & integration testing

- **`WebApplicationFactory<TEntryPoint>`** (`Microsoft.AspNetCore.Mvc.Testing`) — spins up the ASP.NET Core app **in-memory** with a real DI container and `HttpClient`; override services (swap DB, auth) for tests.

```c#
public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    public ApiTests(WebApplicationFactory<Program> f) => _client = f.CreateClient();

    [Fact]
    public async Task Get_Health_Returns_Ok() =>
        Assert.True((await _client.GetAsync("/health")).IsSuccessStatusCode);
}
```

- **Testcontainers (.NET)** — spins up **real dependencies in Docker** (SQL Server, Postgres, Redis, Kafka) per test run, giving high-fidelity integration tests without shared environments.
- **Respawn** resets DB state between tests; **WireMock.Net** stubs external HTTP.

## BDD — Given / When / Then

- Behavior-Driven Development expresses tests as business-readable scenarios in **Gherkin**.
- **Reqnroll** is the actively-maintained successor to **SpecFlow** (which is now deprecated) for .NET.

```gherkin
Scenario: Apply loyalty discount
  Given a customer with a loyalty tier "Gold"
  When they check out a 100 EUR basket
  Then the total should be 90 EUR
```

- Steps bind to C# methods; good for shared understanding with product/QA, overkill for pure technical units.

## Test types across SIT / security / production

| Type | What it checks | When |
|---|---|---|
| **Smoke** | Critical paths up after deploy | Post-deploy gate |
| **Contract** (Pact) | Consumer/provider API compatibility | CI, integration |
| **Performance / Load** (k6, NBomber, JMeter) | Throughput, latency, soak, spike | Pre-release / SIT |
| **Security – SAST** (SonarQube, CodeQL) | Static code vulnerabilities | CI |
| **Security – DAST** (OWASP ZAP) | Running-app attacks | Staging/SIT |
| **SCA** (Dependabot, `dotnet list package --vulnerable`) | Vulnerable dependencies | CI |
| **Chaos** (Simmy, Chaos Monkey) | Resilience to injected failures | Staging/prod |
| **Synthetic monitoring** | Scripted prod probes / uptime | Continuous prod |

- **SIT** (System Integration Testing) validates integrated systems end-to-end in a shared environment.
- **Shift-left** security (SAST/SCA in CI) + **shift-right** (DAST, chaos, synthetic monitoring in/near prod).

## Coverage & quality gates

- **Coverlet** — cross-platform code coverage for .NET (`--collect:"XPlat Code Coverage"`), outputs Cobertura; **ReportGenerator** turns it into HTML/badges.
- **Coverage is a signal, not a goal** — 100% line coverage can still miss branches/assertions. Track **branch coverage** and mutation testing (**Stryker.NET**) for real rigor.
- **SonarQube / SonarCloud** — static analysis for bugs, code smells, security hotspots, duplication, and coverage; enforces a **Quality Gate** (e.g. "coverage on new code ≥ 80%, 0 new blocker issues") that **fails the CI/PR**.
- Other gates: analyzers/`.editorconfig` + `TreatWarningsAsErrors`, required PR reviews, protected branches.

```bash
dotnet test --collect:"XPlat Code Coverage"
reportgenerator -reports:**/coverage.cobertura.xml -targetdir:coveragereport
```

## Tooling overview

- **Frameworks:** xUnit / NUnit / MSTest · **Assertions:** FluentAssertions, Shouldly.
- **Mocking:** Moq, NSubstitute · **Integration:** `WebApplicationFactory`, Testcontainers, Respawn, WireMock.Net.
- **BDD:** Reqnroll (ex-SpecFlow) · **E2E:** Playwright for .NET, Selenium.
- **Coverage/quality:** Coverlet, ReportGenerator, Stryker.NET, SonarQube · **Perf:** BenchmarkDotNet (micro), k6/NBomber (load).
- **Runner:** `dotnet test` in CI; parallelize, keep unit tests deterministic and hermetic.

## Interview Q&A

**Q: Explain the testing pyramid and why it matters.**
A: Many fast unit tests at the base, fewer integration tests in the middle, and a handful of slow E2E tests at the top. It optimizes for fast, reliable feedback; inverting it (ice-cream cone) yields slow, flaky suites.

**Q: Difference between a mock, a stub, and a fake?**
A: A **stub** returns canned data to drive state-based tests. A **mock** verifies interactions (behavior). A **fake** is a working lightweight implementation (e.g. in-memory repo). Overusing mocks couples tests to implementation.

**Q: What is TDD and what benefits does it give?**
A: Red-green-refactor: write a failing test, make it pass minimally, refactor. It drives testable/decoupled design, prevents over-engineering, documents behavior, and provides a regression safety net.

**Q: How do you integration-test an ASP.NET Core API?**
A: Use `WebApplicationFactory<Program>` to host the app in-memory with the real DI pipeline and an `HttpClient`, overriding external services; back it with **Testcontainers** for a real database so tests are high-fidelity yet isolated.

**Q: SpecFlow or Reqnroll?**
A: SpecFlow is deprecated; **Reqnroll** is its maintained fork/successor for Gherkin BDD in .NET. Both bind Given-When-Then scenarios to C# step definitions.

**Q: Is high code coverage enough?**
A: No — coverage shows executed lines, not correct assertions or covered branches/edge cases. Combine branch coverage, meaningful assertions, and mutation testing (Stryker.NET) to gauge real quality.

**Q: How do you enforce quality in CI?**
A: Quality gates: fail the build on failing tests, coverage thresholds (Coverlet + Sonar gate on new code), SAST/SCA findings, analyzer warnings-as-errors, and required reviews on protected branches.

**Q: SAST vs DAST vs SCA?**
A: **SAST** analyzes source statically (SonarQube/CodeQL); **DAST** attacks the running app (OWASP ZAP); **SCA** scans dependencies for known CVEs (Dependabot). Together they cover code, runtime, and supply chain.

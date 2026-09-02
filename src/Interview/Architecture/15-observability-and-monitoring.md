---
title: Observability & Monitoring
summary: Logs, metrics and traces, OpenTelemetry, ELK, Grafana and Prometheus, and the APM tools worth naming.
tags: [Architecture, Observability, OpenTelemetry, Monitoring, Interview]
updated: 2026-09-02
---

# Observability & Monitoring

> The three pillars and four golden signals, structured logging in .NET, OpenTelemetry,
> log aggregation stacks (ELK, Grafana/Prometheus/Loki), cloud & COTS APM,
> dashboards, alerting, SLI/SLO/SLA and correlation IDs.

## Monitoring vs Observability

- **Monitoring** = watching known metrics/thresholds ("is it up?"). **Observability** = ability to ask *new* questions about internal state from external outputs ("why is it slow for tenant X?").

## Three Pillars

| Pillar | What | Answers |
|--------|------|---------|
| **Logs** | Discrete timestamped events (ideally structured) | *What happened?* |
| **Metrics** | Numeric time-series, aggregatable | *How much / how many?* |
| **Traces** | Causal path of a request across services (spans) | *Where is the latency/error?* |

## Four Golden Signals (SRE)

- **Latency** (fast vs slow, split success/error), **Traffic** (demand, e.g. req/s), **Errors** (rate of failures), **Saturation** (how full — CPU/mem/queue). USE (Utilization/Saturation/Errors) and RED (Rate/Errors/Duration) are related lenses.

## Structured Logging in .NET

- Use `ILogger<T>` with **message templates** (structured, not string-interpolated) so fields are queryable.

```csharp
// Good — structured: OrderId is a searchable property, not baked into text
_logger.LogInformation("Order {OrderId} shipped to {Region}", orderId, region);
// Avoid: _logger.LogInformation($"Order {orderId} shipped");  // loses structure
```

- **Serilog** is the common structured backend with **sinks** (Console, File, Elasticsearch, Seq, App Insights):

```csharp
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.Elasticsearch(new ElasticsearchSinkOptions(new Uri("http://es:9200"))
    {
        AutoRegisterTemplate = true,
        IndexFormat = "app-logs-{0:yyyy.MM.dd}"
    })
    .CreateLogger();
```

- Log **levels**: Trace < Debug < Information < Warning < Error < Critical. Never log secrets/PII.

## OpenTelemetry (OTel)

- Vendor-neutral standard for **traces, metrics, and logs** — one SDK, pluggable **exporters** (OTLP → Collector → any backend: Jaeger, Prometheus, App Insights, Datadog).
- In .NET, tracing maps onto **`System.Diagnostics.Activity`** (an Activity = a span); metrics onto `System.Diagnostics.Metrics.Meter`.

```csharp
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("orders-api"))
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter())          // → OTel Collector
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation()
        .AddOtlpExporter());
```

- **OTel Collector**: receive → process (batch, filter, enrich) → export; decouples app from backend.

## Log Export & Aggregation

| Stack | Components | Notes |
|-------|-----------|-------|
| **ELK / Elastic** | **Elasticsearch** (store/search), **Logstash** (ingest/transform), **Kibana** (visualize), **Beats** (lightweight shippers e.g. Filebeat) | De-facto self-hosted log analytics |
| **Grafana stack** | **Prometheus** (metrics, pull-based), **Loki** (logs), **Tempo** (traces), **Grafana** (dashboards) | Cloud-native, label-based |
| **Azure** | **Azure Monitor** + **Application Insights** (APM), **Log Analytics** (KQL) | Native to Azure |
| **AWS** | **CloudWatch** (logs/metrics/alarms), **X-Ray** (tracing) | Native to AWS |
| **COTS** | **Datadog**, **Splunk**, **New Relic**, **Dynatrace** | Managed, full-stack APM |

- **Prometheus** scrapes `/metrics` (pull); **Alertmanager** handles routing/dedup/silencing. **PromQL** for queries, **KQL** for Azure Log Analytics.

## Dashboards & Alerting

- **Dashboards**: golden signals per service, RED/USE panels, business KPIs. Keep them actionable.
- **Alerting**: alert on **symptoms** (SLO burn, error rate, latency) not every cause; avoid noise/fatigue. Route by severity, include runbook links, use **on-call/paging** (PagerDuty).

## SLI / SLO / SLA & Error Budgets

| Term | Meaning |
|------|---------|
| **SLI** | Measured indicator (e.g. % requests < 200ms) |
| **SLO** | Internal target for an SLI (e.g. 99.9% over 30d) |
| **SLA** | Contractual promise to customers (with penalties) |
| **Error budget** | 1 − SLO (allowed failure); when exhausted, freeze features & focus on reliability |

## Correlation / Trace IDs

- Propagate a **correlation ID / trace ID** across service calls (W3C `traceparent` header) so logs, metrics and traces for one request join up.
- ASP.NET Core sets `Activity.Current`; enrich logs with `TraceId`/`SpanId` (Serilog `Enrich.FromLogContext` + OTel enrichment) so a Kibana/Grafana search on one ID shows the full journey.

## Interview Q&A

**Q: What are the three pillars of observability and how do they differ?**
A: Logs are discrete events (what happened), metrics are aggregatable numeric time-series (how much), traces show a request's causal path across services (where the time/error is). Together they let you both detect and diagnose.

**Q: Monitoring vs observability?**
A: Monitoring tracks predefined metrics and thresholds for known failure modes; observability is the property of a system that lets you explore unknown-unknowns and ask new questions from its telemetry without shipping new code.

**Q: What are the four golden signals?**
A: Latency, traffic, errors, and saturation — the SRE-recommended minimum to alert on for any user-facing service.

**Q: Why structured logging over string logs?**
A: Structured logs emit fields (e.g. OrderId, Region) as queryable properties, enabling filtering/aggregation/correlation in tools like Kibana; plain interpolated strings force fragile text parsing.

**Q: What does OpenTelemetry give you and how does it map to .NET?**
A: A vendor-neutral SDK/wire format for traces, metrics and logs with pluggable exporters, so you avoid backend lock-in. In .NET, spans are `System.Diagnostics.Activity` and metrics use `Meter`, exported via OTLP to a Collector.

**Q: SLI vs SLO vs SLA, and what's an error budget?**
A: SLI is the measurement, SLO the internal target, SLA the customer contract with penalties. The error budget is 1−SLO — the tolerated unreliability; burning it triggers a shift from features to reliability work.

**Q: How do you trace a request across microservices?**
A: Propagate a correlation/trace ID via the W3C traceparent header, generate spans per hop (OTel), and enrich all logs with TraceId/SpanId so logs, metrics and traces can be joined on a single ID.

**Q: Prometheus vs ELK — when each?**
A: Prometheus (pull-based, label-based) is ideal for metrics and alerting on time-series; ELK excels at storing, searching and visualizing high-volume structured logs. They're complementary — often paired with Grafana over both.

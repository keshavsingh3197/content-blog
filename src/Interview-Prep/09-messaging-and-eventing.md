# Messaging & Eventing

> Asynchronous communication between services: brokers, delivery guarantees, ordering,
> schemas and tracing. Java's *JMS* maps to **Azure Service Bus / MassTransit**; *AMQP*
> to **RabbitMQ / ASB**; Kafka is Kafka on any platform.

## Why messaging

- **Decoupling** — producers and consumers never call each other directly; they share a broker.
- **Temporal decoupling** — consumer can be offline; messages wait in durable storage.
- **Load levelling** — a queue absorbs bursts; workers drain at their own pace.
- **Resilience & scale** — add consumers to scale out; a slow consumer never blocks a producer.

## Queue (point-to-point) vs Pub/Sub (topics)

| | Queue (P2P) | Topic (Pub/Sub) |
|---|---|---|
| Consumers | **One** logical consumer per message (competing consumers) | **Many** subscribers each get a copy |
| Use | Work distribution, commands, jobs | Broadcast events, fan-out |
| .NET | ASB Queue, RabbitMQ queue | ASB Topic+Subscriptions, RabbitMQ exchange, Kafka topic |

```text
Queue (competing consumers)          Topic (fan-out)
Producer -> [ q ] -> Worker A        Producer -> [topic] -> Sub1 -> Svc A
                  -> Worker B                            -> Sub2 -> Svc B
(each msg to exactly one worker)      (each msg copied to every sub)
```

## Message vs Event vs Command

| Aspect | **Command** | **Event** | **Message** |
|---|---|---|---|
| Intent | "Do this" (imperative) | "This happened" (past tense fact) | Generic envelope |
| Coupling | Sender knows the handler | Publisher does not know subscribers | — |
| Recipients | Exactly one | Zero or many | — |
| Example | `ChargePayment` | `OrderPlaced` | headers + payload |

- **Command** — expects an action; owned by the receiver's contract.
- **Event** — immutable statement of fact; owned by the publisher; enables choreography.
- Naming: commands are verbs/imperative, events are past-tense.

## Delivery guarantees

| Guarantee | Meaning | Cost |
|---|---|---|
| **At-most-once** | Fire and forget; may lose messages | Fast, no dedup |
| **At-least-once** | Redelivered until acked; may duplicate | Default for most brokers |
| **Exactly-once** | No loss, no duplicate | Expensive / limited scope |

- Real systems use **at-least-once + idempotent consumers** ("effectively once").
- **Idempotency** — processing the same message twice yields the same state. Track a
  `MessageId`/business key in a **dedup store** (e.g. table with unique constraint, Redis).
- Kafka offers **exactly-once semantics (EOS)** *within Kafka* (transactions + idempotent
  producer), not across external side-effects.

```c#
// Idempotent consumer using a processed-messages table
public async Task Handle(OrderPlaced e)
{
    if (await _dedup.AlreadyProcessedAsync(e.MessageId)) return; // skip duplicate
    await _orders.CreateAsync(e);
    await _dedup.MarkProcessedAsync(e.MessageId);
}
```

## Durability, acks, DLQ, retries

- **Durability/persistence** — messages written to disk (RabbitMQ durable queue +
  persistent messages; ASB is durable by default; Kafka appends to a replicated log).
- **Acknowledgements** — consumer acks after successful processing; unacked messages are
  redelivered. Ack *after* work, not on receipt (avoid message loss on crash).
- **Retries with backoff** — transient failures retried with **exponential backoff + jitter**.
- **Poison message** — a message that always fails. After N delivery attempts it is moved
  to the **Dead-Letter Queue (DLQ)** for inspection instead of blocking the queue.
- ASB has a native DLQ per queue/subscription; RabbitMQ uses a **dead-letter exchange**.

```text
receive -> process -> ack
        -> fail -> retry (backoff) x N -> DLQ (poison)
```

## Ordering & partitioning

- Global ordering kills throughput. Order is guaranteed **within a partition / session**.
- **Kafka** — ordering per **partition**; the producer's **partition key** (e.g. `CustomerId`)
  routes related messages to the same partition.
- **ASB** — **Sessions** give FIFO for a `SessionId`; **message deduplication** window removes duplicates by `MessageId`.
- Trade-off: more partitions/sessions = more parallelism but no cross-partition order.

## Distributed tracing across messages

- Propagate context so a trace spans producer -> broker -> consumer.
- **Correlation ID** — business/logical id carried in headers to stitch a workflow.
- **W3C `traceparent`** — standard header carrying trace-id/span-id; use with **OpenTelemetry**.
- .NET: `System.Diagnostics.Activity` auto-injects/extracts `traceparent`; ASB and MassTransit
  instrument this out of the box, exportable to Jaeger/Zipkin/App Insights.

## Schema management

- Messages are a contract between teams; schemas must evolve safely.
- Formats: **Avro** (compact, schema-required, great with Kafka), **Protobuf** (compact,
  cross-language, gRPC), **JSON Schema** (human-readable, loose).
- **Schema Registry** (Confluent, Azure Schema Registry) stores versioned schemas; producers/
  consumers validate against it.
- **Compatibility** modes: **backward** (new consumer reads old data), **forward** (old
  consumer reads new data), **full** (both). Add optional fields; never repurpose/remove required fields.

## Protocols

| Protocol | Where | .NET mapping |
|---|---|---|
| **AMQP** | Rich broker messaging | RabbitMQ, Azure Service Bus |
| **MQTT** | Lightweight IoT/IIoT, unreliable networks | MQTTnet, Azure IoT Hub / Event Grid MQTT |
| **JMS** | Java messaging API | ASB, MassTransit, RabbitMQ.Client (no direct JMS in .NET) |
| **Kafka protocol** | High-throughput log | Confluent.Kafka |

## Kafka vs broker queues

| | **Kafka** (log) | **RabbitMQ / ASB** (broker queue) |
|---|---|---|
| Model | Distributed **append-only log** | Smart broker, dumb consumer |
| Retention | Messages **kept** by time/size; consumers track **offsets** | Message **removed** after ack |
| Replay | Yes — reset offset | No (must re-publish) |
| Ordering | Per partition | Per queue/session |
| Routing | Consumer pulls; simple | Rich (exchanges, filters, topics) |
| Best for | Event streaming, analytics, high throughput | Task queues, RPC, complex routing |

### Kafka concepts

- **Topic** — named stream, split into **partitions** (unit of parallelism & ordering).
- **Offset** — position of a record in a partition; consumer commits offsets.
- **Consumer group** — partitions divided among members; one partition -> one consumer in a group.
- **Log compaction** — retains only the latest value per key (great for changelog/state topics).
- **Retention** — time- or size-based deletion of old segments.

## Broker internals & scaling

- Scale throughput by **adding partitions**; scale consumers up to the partition count.
- **Replication factor** — each partition has a leader + followers (in-sync replicas/ISR)
  for durability; leader handles reads/writes, followers take over on failure.
- RabbitMQ scales via **quorum queues** (Raft) and clustering; ASB via partitioned entities
  and premium messaging units.

## Event-driven / event-based programming

- Services react to events rather than being called; enables **choreography** and loose coupling.
- Patterns: **event notification** (thin, "something happened, go look"), **event-carried
  state transfer** (event carries the data, avoids callbacks), **event sourcing** (events are the state).
- Trade-off: high decoupling but harder to reason about end-to-end flow and debugging.

## MassTransit example (.NET)

```c#
// Contract
public record OrderPlaced(Guid OrderId, decimal Total);

// Consumer
public class OrderPlacedConsumer : IConsumer<OrderPlaced>
{
    public async Task Consume(ConsumeContext<OrderPlaced> ctx)
        => await Console.Out.WriteLineAsync($"Order {ctx.Message.OrderId}");
}

// Registration (Azure Service Bus transport)
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<OrderPlacedConsumer>();
    x.UsingAzureServiceBus((ctx, cfg) =>
    {
        cfg.Host(connectionString);
        cfg.ConfigureEndpoints(ctx);            // auto topic/queue + DLQ
        cfg.UseMessageRetry(r => r.Exponential(  // retry with backoff
            5, TimeSpan.FromSeconds(1), TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(2)));
    });
});

// Publish (event) / Send (command)
await bus.Publish(new OrderPlaced(id, 99.90m));
```

## Interview Q&A

1. **At-least-once vs exactly-once?** At-least-once may deliver duplicates; combine with an
   idempotent consumer for "effectively once". True end-to-end exactly-once across external
   systems is impractical — Kafka EOS is scoped to Kafka transactions only.
2. **How do you guarantee ordering while scaling?** Only within a partition/session. Use a
   consistent partition key (e.g. CustomerId) so related messages stay ordered, and scale by
   adding partitions rather than relying on global order.
3. **What is a poison message and how do you handle it?** A message that repeatedly fails.
   Cap retries with backoff, then dead-letter it to a DLQ for later analysis so it doesn't block the queue.
4. **Kafka vs RabbitMQ — when each?** Kafka for high-throughput event streaming, replay and
   analytics (retained log, offsets). RabbitMQ/ASB for work queues, RPC and complex routing where
   messages are consumed and removed.
5. **Command vs event?** A command is an instruction to one known handler ("ChargePayment");
   an event is an immutable past-tense fact ("PaymentCharged") broadcast to unknown subscribers.
6. **How do you trace a request across async messages?** Propagate W3C `traceparent` +
   correlation id in message headers; OpenTelemetry/`Activity` links producer and consumer spans.
7. **How do you evolve a message schema safely?** Use a schema registry with backward/forward
   compatibility rules — add optional fields, never remove/repurpose required ones.
8. **Why ack after processing?** Acking on receipt loses the message if the consumer crashes
   mid-work; acking after success lets the broker redeliver on failure (at-least-once).

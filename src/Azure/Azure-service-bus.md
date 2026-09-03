---
title: Azure Service Bus
summary: Queues (point-to-point) and topics (publish-subscribe) explained with real order-processing flows, and when Service Bus is the right broker.
tags: [Azure, Service-Bus, Messaging, Queue, Topic]
updated: 2026-09-03
---

# Azure Service Bus

> Reference notes. The interview-shaped version — peek-lock, dead-lettering, sessions, duplicate
> detection, the C# `ServiceBusProcessor`, and the choice between Service Bus, Storage Queues, Event
> Grid and Event Hubs — is
> [Interview → Azure → 08 Messaging & Events](../Interview/Azure/08-messaging-and-events.md).

- Azure Service Bus is a fully managed message broker that enables reliable communication between distributed applications using queues and topics.

```
Azure Service Bus = a messaging service that connects applications using messages.
👉 It acts like a middleman (message broker) between systems.

App A sends a message
Service Bus stores it safely
App B receives it later

✅ Even if App B is offline, the message is NOT lost [cloudlearn.io]
```

## 🧩 Core Components
### 1. Queue (Point-to-Point) - (1 → 1 communication)

- 👉 1 sender → 1 receiver
- Message is consumed by only one consumer
- Once processed → removed

> 📌 Use Case
- Order processing
- Background jobs
- Email sending queue
- Flow:
    - Producer → Queue → One Consumer

```
✔ Simple
✔ Guaranteed delivery
❌ No broadcast
```

### 2. Topic (Publish–Subscribe) - (1 → many communication)

- 👉 1 sender → multiple receivers
- Message is sent to Topic
- Multiple Subscriptions receive copies

> 📌 Use Case
- Notifications
- Event-driven systems
- Microservices
- Flow:
    - Producer → Topic → Sub1, Sub2, Sub3

```
✔ Broadcast
✔ Independent processing
✔ Scalable
```

```
📌 Example:

Order placed →

Payment service
Inventory service
Notification service
```

```
🧾 Real-world example (best for interviews)
🛒 E-commerce order flow
User places order
     ↓
Message sent to Service Bus (Topic)
     ↓
Multiple services consume:
   - Payment service
   - Inventory service
   - Shipping service

👉 One event → multiple independent actions
```

## 📌 When to use Service Bus
- Use it when:
    - Microservices communication
    - Need reliability (no message loss)
    - Systems shouldn’t depend on each other
    - Background processing required

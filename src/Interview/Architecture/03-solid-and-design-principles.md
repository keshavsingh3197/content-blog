---
title: SOLID & Design Principles
summary: SOLID in practice plus DRY, KISS and YAGNI, and how coupling and cohesion decide whether a design survives change.
tags: [Architecture, SOLID, Design, Interview]
updated: 2026-09-02
---

# SOLID & Design Principles

> The five SOLID principles plus the wider design maxims (DRY, KISS, YAGNI, cohesion/coupling, composition over inheritance, Law of Demeter) with short C# illustrations.

## SOLID at a Glance

| Letter | Principle | One line |
|---|---|---|
| **S** | Single Responsibility | a class has one reason to change |
| **O** | Open/Closed | open for extension, closed for modification |
| **L** | Liskov Substitution | subtypes must be usable via their base type |
| **I** | Interface Segregation | prefer many small interfaces over one fat one |
| **D** | Dependency Inversion | depend on abstractions, not concretions |

## S — Single Responsibility Principle

- A module should have **one reason to change**; separate concerns (business logic vs persistence vs formatting).

```c#
// Bad: report generation + persistence + email in one class
// Good:
class InvoiceCalculator { public decimal Total(Invoice i) => /* ... */ 0m; }
class InvoiceRepository  { public void Save(Invoice i) { /* ... */ } }
class InvoiceMailer      { public void Send(Invoice i) { /* ... */ } }
```

- **Why**: smaller blast radius for changes, easier testing, higher cohesion.

## O — Open/Closed Principle

- Extend behaviour by **adding** new types, not editing existing tested code — via abstraction/polymorphism.

```c#
// Bad: switch on type inside one method, edited for every new shape
// Good:
abstract class Shape { public abstract double Area(); }
class Circle(double r) : Shape { public override double Area() => Math.PI * r * r; }
class Square(double s) : Shape { public override double Area() => s * s; }
```

- **Why**: new requirements don't risk regressions in working code.

## L — Liskov Substitution Principle

- Any subtype must honour the base type's **contract** (no strengthened preconditions, weakened postconditions, or surprise exceptions).

```c#
// Violation: Square : Rectangle where setting Width also mutates Height
// breaks code relying on Rectangle's independent W/H contract.
```

- Fix by modelling correctly (both as `Shape`) rather than forcing an is-a that breaks behaviour.
- **Why**: polymorphism is safe only if substitutes behave.

## I — Interface Segregation Principle

- Clients shouldn't depend on methods they don't use; split fat interfaces.

```c#
// Bad: interface IMachine { Print(); Scan(); Fax(); }  -> printers forced to stub Fax
interface IPrinter { void Print(Doc d); }
interface IScanner { void Scan(Doc d); }
```

- **Why**: avoids forcing empty/`NotImplemented` methods and reduces coupling.

## D — Dependency Inversion Principle

- High-level modules depend on **abstractions**; abstractions don't depend on details. Inject dependencies (usually via a DI container).

```c#
class OrderService(IPaymentGateway gateway)   // depends on interface
{
    public void Checkout(Order o) => gateway.Charge(o.Total);
}
// Registration: services.AddScoped<IPaymentGateway, StripeGateway>();
```

- **Why**: swap implementations, mock in tests, decouple layers. (Note: DIP is the principle; **DI/IoC container** is the mechanism.)

## Beyond SOLID

### DRY — Don't Repeat Yourself
- Every piece of knowledge has a single authoritative representation. Extract shared logic; but beware **false DRY** (coupling unrelated code that merely looks similar).

### KISS — Keep It Simple, Stupid
- Favour the simplest solution that works; complexity must earn its place.

### YAGNI — You Aren't Gonna Need It
- Don't build speculative features/abstractions until a real requirement exists.

### Separation of Concerns
- Divide a system into distinct sections (UI / domain / data), each addressing one concern — the architectural backbone behind SRP and layering.

## Coupling vs Cohesion

| | Coupling | Cohesion |
|---|---|---|
| Meaning | interdependence **between** modules | relatedness **within** a module |
| Goal | **low** (loose) | **high** |
| Symptom when bad | change ripples everywhere | a class does unrelated things |

- Aim for **low coupling, high cohesion** — the summary metric of good design.

## Composition over Inheritance

- Prefer assembling behaviour from injected/contained collaborators over deep inheritance hierarchies (fragile base class, rigid taxonomy).

```c#
// Instead of: class SqlLogger : FileWriterBase { ... }
class Logger(IWriter writer) { public void Log(string m) => writer.Write(m); }
```

- Inheritance for genuine **is-a** + shared contract; composition for **has-a**/behaviour reuse.

## Law of Demeter (Principle of Least Knowledge)

- "Only talk to your immediate friends" — an object should call methods on itself, its fields, its parameters, and objects it creates; **avoid train-wreck chains**.

```c#
// Bad:  order.Customer.Address.Country.Code
// Good: order.ShippingCountryCode()   // Order exposes what callers need
```

- **Why**: reduces coupling to the internal structure of other objects.

## Interview Q&A

- **Q: What does SRP actually mean by "responsibility"?** A single reason/axis of change — one actor or concern driving modifications to the class.
- **Q: How do you satisfy Open/Closed in C#?** Program to abstractions (interfaces/abstract classes) and add new implementations instead of editing existing code; strategy/polymorphism enable it.
- **Q: Give a classic LSP violation.** `Square : Rectangle` where setting width also changes height, breaking callers that assume independent dimensions.
- **Q: Difference between DIP and DI?** DIP is the design principle (depend on abstractions); DI/IoC is the technique/container that supplies those dependencies.
- **Q: Low coupling vs high cohesion — why both?** Loose coupling limits change ripple across modules; high cohesion keeps each module focused — together they yield maintainable, testable code.
- **Q: When prefer composition over inheritance?** When you need behaviour reuse without a true is-a relationship, or to avoid fragile deep hierarchies — inject collaborators instead.
- **Q: What problem does the Law of Demeter address?** Coupling to the internal structure of other objects via long call chains; expose intent-revealing methods instead.
- **Q: DRY vs YAGNI tension?** DRY removes duplication of real knowledge; YAGNI stops premature abstraction — apply DRY to actual repetition, not coincidental similarity.

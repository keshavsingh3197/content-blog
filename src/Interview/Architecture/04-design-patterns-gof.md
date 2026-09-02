---
title: GOF Design Patterns
summary: All 23 Gang of Four patterns grouped creational, structural and behavioural, each with the standard C# solution.
tags: [Architecture, Design-Patterns, GOF, Interview]
updated: 2026-09-02
---

# GOF Design Patterns

> The 23 Gang of Four patterns across creational, structural and behavioural categories, with concise standard C# solutions and their .NET counterparts.

See the deep-dive notes and diagrams in [../GOF/GOF.md](../../GOF/GOF.md).

## The Three Categories

- **Creational (5)** — how objects are created; decouple construction from use.
- **Structural (7)** — how objects/classes are composed into larger structures.
- **Behavioural (11)** — how objects interact and distribute responsibility.

## All 23 Patterns

| Category | Pattern | Intent (one line) |
|---|---|---|
| Creational | **Factory Method** | subclass decides which concrete type to create |
| Creational | **Abstract Factory** | create families of related objects |
| Creational | **Builder** | construct a complex object step by step |
| Creational | **Prototype** | create by cloning an existing instance |
| Creational | **Singleton** | one shared instance, global access |
| Structural | **Adapter** | make an incompatible interface usable |
| Structural | **Bridge** | separate abstraction from implementation |
| Structural | **Composite** | treat trees of objects uniformly |
| Structural | **Decorator** | add behaviour dynamically by wrapping |
| Structural | **Facade** | a simple front over a complex subsystem |
| Structural | **Flyweight** | share fine-grained objects to save memory |
| Structural | **Proxy** | a stand-in controlling access to another object |
| Behavioural | **Chain of Responsibility** | pass a request along a handler chain |
| Behavioural | **Command** | encapsulate a request as an object |
| Behavioural | **Interpreter** | evaluate sentences in a grammar |
| Behavioural | **Iterator** | traverse a collection without exposing internals |
| Behavioural | **Mediator** | centralize complex object communication |
| Behavioural | **Memento** | capture/restore state without breaking encapsulation |
| Behavioural | **Observer** | notify dependents of state changes |
| Behavioural | **State** | change behaviour when internal state changes |
| Behavioural | **Strategy** | swap interchangeable algorithms |
| Behavioural | **Template Method** | fix a skeleton, defer steps to subclasses |
| Behavioural | **Visitor** | add operations to a type hierarchy externally |

## Creational — Worked Examples

### Factory Method

```c#
abstract class DialogButton { public abstract string Render(); }
class WinButton : DialogButton { public override string Render() => "[Win]"; }
class WebButton : DialogButton { public override string Render() => "<button>"; }

abstract class Dialog { protected abstract DialogButton CreateButton();  // factory method
    public string Show() => CreateButton().Render(); }
class WinDialog : Dialog { protected override DialogButton CreateButton() => new WinButton(); }
```

### Singleton (thread-safe via `Lazy<T>`)

```c#
public sealed class Config
{
    private static readonly Lazy<Config> _instance = new(() => new Config());
    public static Config Instance => _instance.Value;
    private Config() { }
}
```

- **Pitfall**: Singleton is often an anti-pattern (hidden global state, hard to test). Prefer registering a **singleton lifetime in the DI container** instead.

## Structural — Worked Examples

### Adapter

```c#
interface ILogger { void Log(string msg); }
class ThirdPartyLog { public void Write(int level, string text) { /*...*/ } }

class LogAdapter(ThirdPartyLog inner) : ILogger   // adapts old API to ILogger
{
    public void Log(string msg) => inner.Write(1, msg);
}
```

### Decorator

```c#
interface INotifier { void Send(string m); }
class EmailNotifier : INotifier { public void Send(string m) { /* email */ } }

class SmsDecorator(INotifier inner) : INotifier    // wraps + adds behaviour
{
    public void Send(string m) { inner.Send(m); /* also SMS */ }
}
// var n = new SmsDecorator(new EmailNotifier());
```

- .NET example: `Stream` wrappers (`BufferedStream`, `GZipStream`) and ASP.NET Core middleware are decorators.

## Behavioural — Worked Examples

### Strategy

```c#
interface IPricing { decimal Apply(decimal p); }
class NoDiscount : IPricing { public decimal Apply(decimal p) => p; }
class TenPercent : IPricing { public decimal Apply(decimal p) => p * 0.9m; }

class Checkout(IPricing pricing)   // swap algorithm at runtime
{
    public decimal Total(decimal p) => pricing.Apply(p);
}
```

- In C#, a `Func<decimal,decimal>` delegate is often a lightweight Strategy.

### Observer

```c#
// Idiomatic .NET: events / IObservable<T>
class Stock
{
    public event Action<decimal>? PriceChanged;
    public void Set(decimal p) => PriceChanged?.Invoke(p);
}
// stock.PriceChanged += price => Console.WriteLine($"now {price}");
```

- .NET provides `IObservable<T>`/`IObserver<T>` (Rx) and `event` as first-class Observer support.

## When to Use / Pitfalls

- **Factory/Abstract Factory**: hide concrete types, families of products; over-use adds indirection.
- **Builder**: many optional params / immutable objects (alternative to telescoping constructors).
- **Decorator vs Inheritance**: prefer decorator for composable, runtime-added behaviour; deep wrapping hurts debuggability.
- **Strategy vs State**: same structure — Strategy varies an algorithm chosen by the client; State transitions itself between behaviours.
- **Singleton**: default to DI singleton lifetime; avoid static global state.
- General pitfall: applying patterns speculatively adds complexity — reach for them to solve a real, recurring problem (see KISS/YAGNI in [03](03-solid-and-design-principles.md)).

## Patterns Built into .NET

| GOF pattern | .NET realization |
|---|---|
| Iterator | `IEnumerator`/`IEnumerable`, `yield return` |
| Observer | `event`, `IObservable<T>` (Rx) |
| Strategy | `Func<>`/`Action<>` delegates, `IComparer<T>` |
| Decorator | `Stream` chain, ASP.NET Core middleware |
| Factory / Abstract Factory | **DI container** (`IServiceProvider`, factory delegates) |
| Adapter | `IList`↔`IEnumerable`, wrapper classes |
| Command | `ICommand` (WPF/MVVM), `IRequest` (MediatR) |
| Disposable cleanup | `IDisposable` / `using` (RAII-style) |

## Interview Q&A

- **Q: Name the three GOF categories.** Creational (object creation), Structural (composition), Behavioural (interaction/responsibility).
- **Q: Factory Method vs Abstract Factory?** Factory Method creates one product via subclass override; Abstract Factory creates families of related products behind one interface.
- **Q: How do you implement a thread-safe Singleton in C#?** Use `Lazy<T>` or a static readonly field; better still, register a singleton lifetime in the DI container.
- **Q: Decorator vs Proxy — both wrap.** Decorator adds/extends behaviour; Proxy controls access (lazy loading, caching, security) with the same interface.
- **Q: Strategy vs State?** Identical structure; Strategy swaps an externally chosen algorithm, State encapsulates transitions the object drives itself.
- **Q: Which GOF patterns does .NET give you for free?** Iterator (`IEnumerable`/`yield`), Observer (`event`/Rx), Strategy (delegates), Decorator (`Stream`/middleware), Factory (DI container).
- **Q: When is Builder preferable to a constructor?** When there are many optional parameters or you build an immutable object incrementally, avoiding telescoping constructors.
- **Q: Why can Singleton be an anti-pattern?** It introduces hidden global state and tight coupling that make code hard to test and reason about.

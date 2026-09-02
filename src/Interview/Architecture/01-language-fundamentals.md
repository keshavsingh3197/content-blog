---
title: Language Fundamentals
summary: Core C# / .NET type system, generics, delegates and LINQ, records, pattern matching and CLR internals.
tags: [C#, .NET, CLR, Interview-Prep, Generics, LINQ]
updated: 2026-08-22
---

# Language Fundamentals

> Core C# / .NET type system, generics, delegates & LINQ, records, pattern matching and CLR internals — the building blocks every senior engineer must explain cold.

## Value vs Reference Types

- **Value types** (`struct`, `enum`, primitives, `record struct`): hold data directly, copied by value, usually on the **stack** or inline in the containing object.
- **Reference types** (`class`, `interface`, `record`, arrays, delegates, `string`): a variable holds a **reference** to data on the **heap**; assignment copies the reference.
- Equality: value types → member-wise (`ValueType.Equals`); reference types → identity by default (`object.ReferenceEquals`).

```c#
struct Point { public int X, Y; }
var a = new Point { X = 1 };
var b = a;      // full copy
b.X = 99;       // a.X is still 1
```

## Stack vs Heap

- **Stack**: fast, LIFO, per-thread; stores locals, method params, and value types not captured/boxed. Freed automatically on scope exit.
- **Heap**: managed by the **GC**; stores all reference-type instances and boxed values.
- Captured variables in closures, and value types inside a class, live on the heap. (GC detail → file 06.)

## Boxing / Unboxing

- **Boxing**: converting a value type to `object`/interface → allocates a heap box + copies. **Unboxing**: extracting back, requires exact type match (else `InvalidCastException`).
- Costs allocations + GC pressure — avoid in hot paths. Generics (`List<int>`) and `Span<T>` avoid boxing entirely.

```c#
int i = 42;
object o = i;        // boxing (heap alloc)
int j = (int)o;      // unboxing
```

## struct vs class

| Aspect | `struct` (value) | `class` (reference) |
|---|---|---|
| Storage | inline / stack | heap |
| Copy semantics | by value | by reference |
| Default | cannot be null (unless `T?`) | nullable |
| Inheritance | none (only interfaces) | full |
| Use when | small, immutable, short-lived | identity, large, polymorphic |

- Guideline: keep structs **small (≤16 bytes)** and **immutable**; use `readonly struct` and `in` params to avoid defensive copies.

## Records & record struct

- **`record`** (reference) and **`record struct`** (value): concise types with **value-based equality**, `ToString`, deconstruction, and `with` non-destructive mutation.
- `record` members are immutable when declared with positional/`init` properties; `record struct` is mutable unless `readonly record struct`.

```c#
public record Person(string Name, int Age);
var p1 = new Person("Ada", 36);
var p2 = p1 with { Age = 37 };   // copy + change
bool same = p1 == new Person("Ada", 36); // true (value equality)
```

## Immutability

- Achieved via `readonly` fields, `init`-only setters, records, and immutable collections (`ImmutableArray<T>`, `FrozenDictionary<T>`).
- Benefits: thread-safety, predictable state, safe sharing/caching.

## string & Interning

- `string` is an **immutable reference type**; every mutation creates a new instance — use `StringBuilder` for loops.
- **Interning**: identical string literals share one heap instance (compile-time interned). `string.Intern`/`IsInterned` for runtime pooling.
- `==` on strings compares **content**; `object.ReferenceEquals` checks identity.

## Generics

- Type-safe, no boxing, code reuse via type parameters.
- **Constraints**: `where T : class`, `struct`, `new()`, `notnull`, base class/interface, `unmanaged`.
- `default(T)` / `default` → zero value for value types, `null` for reference types.
- **Variance** (interfaces/delegates only):
  - `out T` **covariant** — producer/return position (`IEnumerable<out T>`): `IEnumerable<string>` → `IEnumerable<object>`.
  - `in T` **contravariant** — consumer/param position (`IComparer<in T>`, `Action<in T>`).

```c#
public T FirstOrDefaultSafe<T>(IEnumerable<T> src) where T : notnull
    => src.Any() ? src.First() : default!;
```

## Delegates & Lambdas — .NET's "Functional Interfaces"

- A **delegate** is a type-safe function pointer; the .NET analogue of a Java *functional interface*.
- Built-in generic delegates:

| Delegate | Shape | Java analogue |
|---|---|---|
| `Func<...,TResult>` | returns a value | `Function`/`Supplier` |
| `Action<...>` | returns void | `Consumer`/`Runnable` |
| `Predicate<T>` | `bool Test(T)` | `Predicate` |

- **Lambda** = anonymous method (`x => x * 2`); captures variables via a compiler-generated closure class (heap).

```c#
Func<int, int> square = x => x * x;
Predicate<string> isEmpty = s => s.Length == 0;
Action<string> log = Console.WriteLine;
```

## LINQ — the .NET equivalent of Java Streams

- Fluent query over any `IEnumerable<T>`; **deferred (lazy) execution** — the query runs only on enumeration (`foreach`, `ToList`, `Count`).
- **`IEnumerable<T>`** → LINQ-to-Objects, executes **in memory** with delegates.
- **`IQueryable<T>`** → builds an **expression tree** translated by a provider (EF Core → SQL); executes at the source.

```c#
var adults = people
    .Where(p => p.Age >= 18)   // deferred
    .Select(p => p.Name)
    .OrderBy(n => n);          // still not executed
var list = adults.ToList();    // executes now
```

- Prefer a single materialization; re-enumerating a deferred query re-runs it.

## Extension Methods

- Static methods on a static class with a `this` first param — add methods to existing types without inheritance. LINQ itself is extension methods on `IEnumerable<T>`.

```c#
public static bool IsNullOrEmpty(this string? s) => string.IsNullOrEmpty(s);
```

## params

- Variable-length arguments. `params T[]` classic; **`params ReadOnlySpan<T>`** (C# 13+) avoids array allocation.

```c#
int Sum(params ReadOnlySpan<int> nums) { int t = 0; foreach (var n in nums) t += n; return t; }
```

## Pattern Matching

- `is`, `switch` expressions, and rich patterns: type, constant, relational, logical (`and`/`or`/`not`), property, positional, and **list patterns**.

```c#
string Describe(object o) => o switch
{
    null                      => "null",
    int n and > 0             => $"positive {n}",
    Person { Age: >= 18 }     => "adult",
    [1, .., var last]         => $"starts 1 ends {last}",
    _                         => "other"
};
```

## Nullable Reference Types (NRT)

- Opt-in (`<Nullable>enable</Nullable>`): `string` is non-null, `string?` may be null. Compiler flow-analysis warns on possible null deref.
- Operators: `?.` null-conditional, `??`/`??=` coalesce, `!` null-forgiving (assert), `[NotNull]`/`[MaybeNull]` attributes for API contracts.

## CLR Internals (overview)

- Source → **IL** (Intermediate Language) + metadata in an assembly.
- **JIT** compiles IL to native code per-method at first call; **Tiered Compilation** (quick tier then optimized) and **ReadyToRun/AOT** reduce startup cost.
- **GC** is generational, tracing, compacting (Gen0/1/2 + LOH) — details in [06 — Memory, GC & Profiling](06-memory-gc-and-profiling.md).

## Interview Q&A

- **Q: When does boxing occur?** When a value type is assigned to `object` or an interface, or used where a reference type is expected — it allocates a heap copy.
- **Q: `struct` vs `class` — pick which and why?** Struct for small, immutable, short-lived value data (avoids heap/GC); class for identity, polymorphism, and large/shared state.
- **Q: Deferred vs immediate execution in LINQ?** Query operators build a pipeline that runs only on enumeration; `ToList/Count/First` force immediate execution.
- **Q: `IEnumerable` vs `IQueryable`?** `IEnumerable` executes in memory via delegates; `IQueryable` builds an expression tree translated by a provider (e.g. to SQL) and executes at the data source.
- **Q: Covariance vs contravariance?** `out` (covariant) allows a more-derived return type; `in` (contravariant) allows a less-derived parameter type — supported on interfaces/delegates only.
- **Q: Why is `string` immutable and what's interning?** Immutability enables safe sharing/caching/thread-safety; interning stores one shared instance per identical literal to save memory.
- **Q: What does a record give you over a class?** Value-based equality, `with` copy, `ToString`, and deconstruction with minimal code.
- **Q: What is the JIT?** The just-in-time compiler that turns IL into native machine code at runtime, with tiered optimization.

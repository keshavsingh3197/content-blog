# Modern C# (12 – 14)

> A tour of the newest C# language features. Versions map to .NET releases:
> **C# 12 → .NET 8**, **C# 13 → .NET 9**, **C# 14 → .NET 10** (current, LTS).
> The language version is selected automatically from your project's target framework, or set explicitly with `<LangVersion>` in the `.csproj`.

---

## C# 12 (.NET 8)

### Primary constructors

Primary constructors are now allowed on **any** `class` or `struct` (previously records only). The parameters are in scope for the whole type body.

```c#
public class OrderService(IRepository repo, ILogger<OrderService> logger)
{
    public async Task Handle(int id)
    {
        logger.LogInformation("Handling {Id}", id);
        var order = await repo.GetAsync(id);
        // ...
    }
}
```

### Collection expressions

A single, unified `[ ... ]` syntax for arrays, lists, spans and more, with the spread element `..` to inline other collections.

```c#
int[] a = [1, 2, 3];
List<int> b = [0, ..a, 4];        // 0,1,2,3,4  — ".." spreads a
Span<int> c = [1, 2, 3];
```

### Default lambda parameters & `ref readonly`

```c#
var greet = (string name = "world") => $"Hello, {name}!";
greet();          // Hello, world!
```

### Alias any type

```c#
using Point = (int X, int Y);     // alias tuples, arrays, generics, etc.
```

---

## C# 13 (.NET 9)

### `params` collections

`params` now works with any collection type (spans, `IEnumerable<T>`, `List<T>`), not just arrays — often allocation-free with `ReadOnlySpan<T>`.

```c#
void Log(params ReadOnlySpan<string> messages) { /* ... */ }
Log("a", "b", "c");
```

### New `System.Threading.Lock`

A dedicated lock type with better performance than locking on a plain `object`.

```c#
private readonly Lock _gate = new();

void Update()
{
    lock (_gate) { /* critical section */ }
}
```

### Other additions

- `partial` properties and indexers.
- Index-from-end (`^`) allowed in object/collection initializers.
- The `\e` escape sequence for the ESC character.

---

## C# 14 (.NET 10)

### Extension members (extension blocks)

New `extension` blocks extend a type with **properties** and **static members**, not just extension methods.

```c#
public static class EnumerableExtensions
{
    extension<T>(IEnumerable<T> source)
    {
        public bool IsEmpty => !source.Any();          // extension property
        public IEnumerable<T> Tail => source.Skip(1);  // extension property
    }
}

// usage
bool empty = numbers.IsEmpty;
```

### The `field` keyword

Access the compiler-generated backing field with `field` — no need to declare it yourself.

```c#
public string Message
{
    get;
    set => field = value ?? throw new ArgumentNullException(nameof(value));
}
```

### Null-conditional assignment

`?.` and `?[]` can now appear on the **left** side of an assignment. The right side is evaluated only when the target is non-null.

```c#
customer?.Order = GetCurrentOrder();   // no-op if customer is null
```

### `nameof` with unbound generics

```c#
string name = nameof(List<>);   // "List"
```

### Simpler lambda parameter modifiers

Add `ref`, `in`, `out`, or `scoped` to lambda parameters without repeating the types.

```c#
delegate bool TryParse<T>(string text, out T result);
TryParse<int> parse = (text, out result) => int.TryParse(text, out result);
```

### More partial members & user-defined operators

- `partial` **constructors** and **events** (joining partial methods/properties).
- User-defined **compound assignment** (`+=`, `-=`, …) and **increment/decrement** (`++`, `--`) operators.
- First-class implicit conversions between `Span<T>`, `ReadOnlySpan<T>` and `T[]`.

---

## Still worth knowing — `required` and `init` (C# 11)

Slightly older than this page's range, but interviewers pair them with primary constructors, so
they belong here. Together they give an object that is **immutable after construction** yet still
usable with object-initializer syntax.

```c#
public class Order
{
    public required string CustomerId { get; init; }   // must be set by the initializer...
    public required decimal Total { get; init; }       // ...or it is a COMPILE error
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;   // optional, has a default
}

var order = new Order { CustomerId = "c-1", Total = 42m };   // ✅
// var bad = new Order { Total = 42m };                      // ❌ CS9035: CustomerId is required
// order.Total = 99m;                                        // ❌ init-only, set during init only
```

| | `required` | `init` |
| --- | --- | --- |
| Enforces | the property **must** be assigned | the property may only be assigned **during** initialisation |
| Checked at | compile time, at the construction site | compile time, at every later assignment |
| Replaces | a constructor parameter per property | a `private set` plus a constructor |

> 🎯 **The senior answer:** "`required` moves 'you must supply this' from a runtime null-check into
> a compile error, without forcing a constructor overload per combination. `init` makes the property
> settable only while the object is being built. Together they are the non-record way to get
> immutability — and with a `record` you get both plus value equality."

---

## Quick reference

| Feature | Version | .NET |
| --- | --- | --- |
| `required` members, `init`-only setters | C# 11 | 7 |
| Primary constructors (all types), collection expressions | C# 12 | 8 |
| `params` collections, `Lock`, partial properties | C# 13 | 9 |
| Extension members, `field` keyword, null-conditional assignment | C# 14 | 10 |

> See the official docs: [What's new in C# 14](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-14) · [What's new in .NET 10](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-10/overview).

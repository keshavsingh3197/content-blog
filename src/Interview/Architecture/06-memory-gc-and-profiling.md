# Memory, GC & Profiling

> How the .NET runtime manages memory: stack vs heap, GC generations and algorithms,
> deterministic cleanup with `IDisposable`, finalizers and `SafeHandle`, the causes of
> managed memory leaks, and the tooling to diagnose them (dotnet-dump, dotnet-gcdump,
> dotnet-trace, dotnet-counters, PerfView, SOS).

## Stack vs heap (recap)

- **Stack** — per-thread, LIFO, fast; holds value types (locals), method frames, and references (pointers). Auto-freed on scope exit.
- **Heap** — shared, GC-managed; holds reference-type objects. Freed by the **garbage collector**.
- Value types can live on the heap when boxed, captured by a closure, or fields of a class. `ref struct`/`Span<T>` are stack-only.

## GC generations

The heap is generational — young objects die young ("generational hypothesis"):

| Gen | Contents | Collected |
|---|---|---|
| **Gen 0** | Newest, small objects | Very often, very fast |
| **Gen 1** | Survived one GC (buffer) | Less often |
| **Gen 2** | Long-lived objects | Rarely; full GC |
| **LOH** | Objects **≥ 85,000 bytes** | Collected with Gen 2; not compacted by default |
| **POH** | **Pinned Object Heap** (.NET 5+) | Pinned buffers, avoids fragmenting the rest |

- A **Gen 2 collection is a full collection** (all generations) — the expensive one to minimize.
- Survivors are **promoted** to the next generation.
- The LOH avoids copying big buffers; but it can **fragment**. Force compaction rarely: `GCSettings.LargeObjectHeapCompactionMode = CompactOnce`.

## GC algorithms

- **Mark-and-sweep** — mark reachable objects from **GC roots** (statics, locals, CPU registers, finalization queue), then reclaim the rest.
- **Compaction** — after sweeping, live objects are moved together to remove fragmentation and keep allocation a cheap pointer bump (Gen 0/1/2; LOH only on demand).
- **Generational** — collect Gen 0 mostly; use a **card table / write barrier** to track old→young references so young collections stay cheap.
- **Concurrent / Background GC** — Gen 2 is collected on a background thread concurrently with app execution, minimizing pause times. **Background GC is on by default.**

### Workstation vs Server GC

| | Workstation GC | Server GC |
|---|---|---|
| Heaps | One | One **per logical CPU** |
| GC threads | On app thread (or 1 bg) | Dedicated per-heap threads |
| Goal | Low latency, low memory | High throughput |
| Default | Client apps | ASP.NET Core / server workloads |

```xml
<PropertyGroup>
  <ServerGarbageCollection>true</ServerGarbageCollection>   <!-- GCServer -->
  <ConcurrentGarbageCollection>true</ConcurrentGarbageCollection> <!-- GCConcurrent -->
</PropertyGroup>
```

Also tunable via `runtimeconfig.json` (`System.GC.Server`, `System.GC.Concurrent`) or env vars (`DOTNET_gcServer`, `DOTNET_GCHeapHardLimit`).

## Deterministic cleanup: IDisposable / using

- The GC handles **managed memory** but not **unmanaged resources** (file handles, sockets, DB connections). Release those deterministically via **`IDisposable.Dispose()`**.
- `using` / `using` declaration calls `Dispose()` at scope exit; **`await using`** for `IAsyncDisposable.DisposeAsync()`.

```c#
using var conn = new SqlConnection(cs);   // Dispose at end of scope
await using var stream = File.OpenRead(p); // DisposeAsync
```

### Standard Dispose pattern

```c#
public class Resource : IDisposable
{
    private readonly SafeHandle _handle;   // preferred over a raw finalizer
    private bool _disposed;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);         // skip finalizer — we cleaned up already
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing) _handle?.Dispose();  // release managed disposables
        _disposed = true;
    }
}
```

## Finalizers — and why to avoid them

- A **finalizer** (`~Class()`) runs before the object is collected, as a safety net for unmanaged resources when `Dispose` wasn't called.
- **Cost:** finalizable objects go on the **finalization queue**, survive an extra GC (promoted a generation), and run on a single **finalizer thread** — hurting throughput and delaying reclamation.
- **Prefer `SafeHandle`** (a `CriticalFinalizerObject` wrapping the handle) so your class needs **no finalizer** of its own.
- **`GC.SuppressFinalize(this)`** in `Dispose()` removes the object from the finalization queue when cleanup already happened.

## Memory leaks in managed code

Managed ≠ leak-proof. Objects leak when a **root keeps them reachable**:

- **Event handler leaks** — a subscriber stays alive because the publisher's event holds a reference. Unsubscribe (`-=`), or use weak events.
- **Static references / caches** — statics are GC roots; unbounded static/dictionary caches grow forever. Bound them or use `WeakReference`/`ConditionalWeakTable`.
- **Captured closures** — a lambda captures a variable (e.g. `this`), extending its lifetime; common with long-lived delegates/timers.
- **Undisposed `IDisposable`**, **long-lived `HttpClient` misuse / socket exhaustion**, **`Timer`/background tasks** still referencing objects.

```c#
publisher.DataReceived += Handler;   // leak if never removed
publisher.DataReceived -= Handler;   // unsubscribe when done
```

## Dump & heap analysis

| Tool | Use |
|---|---|
| **dotnet-dump** | Capture (`collect`) & analyze (`analyze`) full process dumps; SOS commands cross-platform |
| **dotnet-gcdump** | Lightweight **GC heap** snapshot (types, counts, retention) — great for leak hunting |
| **WinDbg + SOS** | Deep native/managed debugging (`!dumpheap -stat`, `!gcroot`, `!eeheap`) |
| **Visual Studio** | Managed heap snapshots & **diff** in the Diagnostic Tools / Memory Usage window |

```bash
dotnet-gcdump collect -p <pid>          # open .gcdump in VS
dotnet-dump collect -p <pid>            # then: dotnet-dump analyze core_...
# in analyze:  dumpheap -stat   |   gcroot <addr>
```

- **Workflow:** take two gcdumps over time, **diff** them; types with growing counts and their **retention path** (`gcroot`) reveal the leaking root.

## Profilers & counters

| Tool | Use |
|---|---|
| **dotnet-counters** | Live metrics: CPU, alloc rate, Gen sizes, GC pause %, exception rate, thread-pool queue |
| **dotnet-trace** | Collect ETW/EventPipe traces (CPU sampling, GC events) → view in PerfView / Speedscope |
| **PerfView** | Powerful CPU + GC + allocation analysis (Windows) |
| **VS Profiler** | CPU Usage, .NET Object Allocation, GC, DB, async tools in-IDE |

```bash
dotnet-counters monitor -p <pid> System.Runtime   # live GC/alloc/CPU stats
dotnet-trace collect -p <pid>                       # CPU/GC trace
```

## Tuning knobs (summary)

- **`GCServer` / `System.GC.Server`** — throughput, one heap per CPU (servers).
- **`GCConcurrent` / `System.GC.Concurrent`** — background Gen 2 for low pause times.
- **`GCHeapHardLimit`** / `GCHeapHardLimitPercent` — cap heap (containers).
- **`GCConserveMemory`**, `TieredCompilation`, `RetainVM` — advanced trade-offs.
- Best "tuning": **allocate less** — reuse buffers (`ArrayPool<T>`), `Span<T>`/`stackalloc`, `struct`/`readonly struct`, avoid boxing, pool objects. Fewer Gen 0 allocations = fewer collections.

## Interview Q&A

**Q: What are GC generations and why do they exist?**
A: Gen 0/1/2 partition the heap by object age, exploiting that most objects die young. Collecting Gen 0 frequently and cheaply, while collecting Gen 2 (a full GC) rarely, keeps pauses short and throughput high.

**Q: What is the LOH and what's special about it?**
A: The Large Object Heap holds objects ≥ 85,000 bytes. It's collected with Gen 2 and **not compacted by default** (copying big objects is expensive), so it can fragment; compact on demand only when needed.

**Q: Workstation vs Server GC?**
A: Workstation GC uses a single heap and favors low latency/memory (client apps). Server GC creates one heap and GC thread per logical CPU for maximum throughput; it's the default for ASP.NET Core.

**Q: `Dispose` vs finalizer — when do you need each?**
A: `Dispose` is deterministic cleanup for unmanaged/managed resources, invoked via `using`. A finalizer is a non-deterministic safety net for unmanaged resources if `Dispose` wasn't called. Prefer `SafeHandle` so you avoid writing a finalizer at all.

**Q: Why call `GC.SuppressFinalize`?**
A: If `Dispose` already released everything, suppressing finalization removes the object from the finalization queue so it doesn't survive an extra GC generation or waste the finalizer thread.

**Q: How can you leak memory in a GC'd runtime?**
A: By keeping objects rooted: un-unsubscribed **event handlers**, unbounded **static caches**, **captured closures**, and long-lived timers/tasks. The GC can't collect anything still reachable from a root.

**Q: How would you diagnose a suspected memory leak in production?**
A: Watch `dotnet-counters` for rising heap/Gen 2. Capture two **dotnet-gcdump** snapshots over time, diff them to find growing types, then use `gcroot` (SOS/dotnet-dump) to find the retention path holding them alive.

**Q: What is background GC?**
A: A mode (on by default) that performs Gen 2 collection on a dedicated background thread concurrently with application execution, dramatically reducing GC pause times while Gen 0/1 remain blocking but fast.

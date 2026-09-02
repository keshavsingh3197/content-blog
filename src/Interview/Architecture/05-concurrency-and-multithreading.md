---
title: Concurrency & Multithreading
summary: Threads, Task and async, the TPL and parallel work, deadlocks and locks, ThreadLocal, PLINQ and lazy streams.
tags: [Architecture, Concurrency, Threading, Interview]
updated: 2026-09-02
---

# Concurrency & Multithreading

> How .NET runs work in parallel: `Thread` vs `ThreadPool` vs `Task`, `async`/`await`,
> the TPL (Fork/Join), PLINQ, locks & synchronization primitives, and how to avoid
> deadlocks and race conditions. Java mapping: `CompletableFuture` → `Task`,
> Fork/Join → **TPL / `Parallel`**, `ThreadLocal` → `ThreadLocal<T>` / `AsyncLocal<T>`,
> streams → **LINQ / PLINQ**.

## Concurrency vs Parallelism

- **Concurrency** — dealing with many things at once (interleaved; may be one core). I/O-bound work.
- **Parallelism** — doing many things at once (multiple cores). CPU-bound work.
- Rule of thumb: **`async`/`await` for I/O-bound**, **`Parallel`/PLINQ for CPU-bound**.

## Thread vs ThreadPool vs Task

| | `Thread` | `ThreadPool` | `Task` (TPL) |
|---|---|---|---|
| Cost | ~1 MB stack, OS thread | Pooled, reused | Abstraction over pool |
| Return value | No | No (`QueueUserWorkItem`) | Yes (`Task<T>`) |
| Continuations | Manual | No | `ContinueWith`/`await` |
| Cancellation | Manual | No | `CancellationToken` |
| Use when | Long-running/dedicated, custom priority | Legacy short work items | **Default choice** |

```c#
// Prefer Task; use LongRunning to hint a dedicated thread, not a pool thread.
var t = Task.Run(() => Compute());
var dedicated = Task.Factory.StartNew(Work, TaskCreationOptions.LongRunning);
```

- The **thread pool** self-tunes; it injects threads slowly. Blocking pool threads (sync-over-async) causes **thread-pool starvation**.

## async / await and the synchronization context

- `await` yields control until the awaitable completes, then resumes the continuation.
- `async` methods return `Task`, `Task<T>`, or `ValueTask` — **never `async void`** except top-level event handlers.
- A **`SynchronizationContext`** captures where the continuation resumes. UI apps (WPF/WinForms) and legacy ASP.NET have one; **ASP.NET Core and console apps do not**.
- `ConfigureAwait(false)` says "don't marshal back to the captured context" — use it in **library code** to avoid deadlocks and reduce overhead.

```c#
public async Task<string> LoadAsync(HttpClient http)
{
    var body = await http.GetStringAsync("...").ConfigureAwait(false);
    return body.Trim();
}
```

- **`ValueTask<T>`** avoids allocation when a result is often synchronous/cached. Don't `await` it twice.

## TPL: Fork/Join, Parallel, PLINQ

- **`Parallel.For` / `Parallel.ForEach` / `Parallel.Invoke`** — the .NET equivalent of Java's Fork/Join for **data/task parallelism**; they partition work across pool threads and join at the end.
- **`Parallel.ForEachAsync`** (.NET 6+) — parallelism with async bodies and `MaxDegreeOfParallelism`.

```c#
Parallel.ForEach(files, new ParallelOptions { MaxDegreeOfParallelism = 4 },
    file => Process(file));

Parallel.Invoke(() => TaskA(), () => TaskB());   // fork two, join
```

- **PLINQ** — `AsParallel()` parallelizes a LINQ query. Use `.AsOrdered()` to preserve order, `.WithDegreeOfParallelism(n)`, `.AsSequential()` to drop back.

```c#
var primes = numbers.AsParallel()
                    .Where(IsPrime)
                    .ToArray();
```

- Only parallelize when work per item is large enough to beat coordination overhead.

## Parallel vs serial vs lazy sequences

- **Serial** — ordinary `foreach` / LINQ: one item at a time on one thread.
- **Parallel** — PLINQ / `Parallel.ForEach`: many items across cores.
- **Lazy (deferred)** — LINQ operators (`Where`, `Select`) are **deferred**: they build an expression pipeline and execute only on enumeration (`foreach`, `ToList`, `Count`). This is .NET's "lazy streams."

```c#
var q = list.Where(x => x > 0).Select(x => x * 2); // nothing runs yet
foreach (var x in q) { }                            // executes now, lazily
```

- `IEnumerable<T>` = pull-based lazy; **`IAsyncEnumerable<T>`** = async streaming with `await foreach` and `yield return`.

## Synchronization primitives

| Primitive | Scope | Notes |
|---|---|---|
| `lock` / `Monitor` | In-process | Reentrant; sugar over `Monitor.Enter/Exit` |
| `System.Threading.Lock` (C# 13/.NET 9) | In-process | Dedicated lock type; `lock` on it uses `EnterScope()` |
| `SemaphoreSlim` | In-process | Async-friendly (`WaitAsync`); throttling |
| `Mutex` | Cross-process | Named; slow; single-instance apps |
| `ReaderWriterLockSlim` | In-process | Many readers / one writer |
| `Interlocked` | Lock-free | Atomic `Increment`, `Add`, `CompareExchange` |

```c#
private readonly Lock _gate = new();      // C# 13 — prefer over lock(object)
public void Add(int x) { lock (_gate) { _total += x; } }

Interlocked.Increment(ref _counter);      // atomic, no lock
await _semaphore.WaitAsync(ct);           // only async-capable gate
```

- **Don't `await` inside a `lock`** — the monitor is thread-affine and reentrancy breaks; use `SemaphoreSlim` for async critical sections.

### The new `System.Threading.Lock` (C# 13)

- A concrete `Lock` type. `lock (aLockObject)` now lowers to `Lock.EnterScope()` returning a disposable `ref struct` scope (faster, clearer intent than locking an arbitrary `object`).

### Lock internals

- A `Monitor` uses a **sync block**; the CLR keeps object headers thin. Under contention the header is **inflated** to a full sync block with a wait queue.
- Locks first **spin** briefly (busy-wait) hoping the holder releases soon, then fall back to an OS wait (kernel transition). Short critical sections benefit from spinning; long ones don't.

## Deadlocks — causes & avoidance

- **Causes:** circular lock acquisition (A waits for B, B waits for A); **sync-over-async** (`.Result`/`.Wait()` blocking a captured context).
- **Avoid:**
  - **Consistent lock ordering** — always acquire locks in the same global order.
  - Keep critical sections small; avoid calling out to unknown code while holding a lock.
  - Use `ConfigureAwait(false)` in libraries; **never block on async** (`GetAwaiter().GetResult()` on a captured context).
  - Prefer timeouts: `Monitor.TryEnter(obj, timeout)`, `SemaphoreSlim.WaitAsync(timeout)`.

```c#
// Classic sync-over-async deadlock in UI/legacy ASP.NET:
var x = LoadAsync().Result;   // BAD: continuation needs the context this thread holds
var y = await LoadAsync();    // GOOD
```

## ThreadLocal<T> vs AsyncLocal<T>

- **`ThreadLocal<T>`** — value per **thread**. Breaks across `await` because continuations may resume on a different thread.
- **`AsyncLocal<T>`** — value flows down the **logical async call chain** (the .NET analogue for ambient context across `await`). Used by `HttpContext`, logging scopes, `Activity`/tracing.

```c#
static readonly AsyncLocal<string> Correlation = new();
Correlation.Value = requestId;    // flows into awaited calls
```

## Concurrent collections (brief)

- Prefer thread-safe collections over manual locking: `ConcurrentDictionary<K,V>`, `ConcurrentQueue<T>`, `ConcurrentBag<T>`, `BlockingCollection<T>`. See **[02 — Collections & Data Structures](02-collections-and-data-structures.md)** for internals.

## Cancellation tokens

- Cooperative cancellation via `CancellationTokenSource` → `CancellationToken`. Pass the token down; callees check `ThrowIfCancellationRequested()` or honor it in async APIs.

```c#
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
await httpClient.GetAsync(url, cts.Token);   // throws OperationCanceledException on timeout
```

- `CancellationTokenSource.CreateLinkedTokenSource(...)` combines tokens (e.g. request-abort + timeout).

## Common pitfalls

- **`async void`** — unobserved exceptions crash the process; can't be awaited. Use `async Task`.
- **Sync-over-async** (`.Result`, `.Wait()`, `.GetAwaiter().GetResult()`) — deadlocks and pool starvation.
- **Race conditions** — unsynchronized read-modify-write on shared state; use `Interlocked`/locks/immutable data.
- **Captured loop variable / closure** across threads — capture a local copy.
- **Not passing `CancellationToken`** through the call chain.
- **`await` inside `lock`**, or forgetting `ConfigureAwait(false)` in libraries.

## Interview Q&A

**Q: When do you use `async/await` vs `Parallel.ForEach`?**
A: `async/await` for **I/O-bound** work (frees the thread while waiting). `Parallel.ForEach`/PLINQ for **CPU-bound** work spread across cores. Mixing them (many concurrent I/O calls) is fine via `Task.WhenAll`.

**Q: What does `ConfigureAwait(false)` do and where do you use it?**
A: It tells the runtime not to resume the continuation on the captured `SynchronizationContext`. Use it in **library code** to avoid UI/legacy-ASP.NET deadlocks and reduce marshaling overhead. In ASP.NET Core it's a no-op (no context) but still harmless.

**Q: Why is `async void` dangerous?**
A: It can't be awaited, exceptions are unobservable (they crash the process rather than surfacing on a `Task`), and callers can't know when it completes. Only acceptable for event handlers.

**Q: How do you prevent deadlocks with multiple locks?**
A: Enforce a **global lock-acquisition order**, keep critical sections tiny, avoid calling external code while holding a lock, use `TryEnter` with timeouts, and never block on async code.

**Q: `ThreadLocal<T>` vs `AsyncLocal<T>`?**
A: `ThreadLocal<T>` stores per-thread state and doesn't survive `await` (may resume on another thread). `AsyncLocal<T>` flows with the logical async control flow, so it's the correct choice for ambient context (correlation IDs, scopes).

**Q: What's the new `System.Threading.Lock`?**
A: A C# 13/.NET 9 dedicated lock type. `lock` on a `Lock` instance uses `EnterScope()` (a disposable scope) instead of `Monitor` on `object`, giving clearer intent and better performance.

**Q: How does the CLR implement a `lock`?**
A: Via `Monitor` on the object's sync block. It **spins** briefly under light contention before falling back to a kernel wait, and inflates a thin header to a full sync block (with a wait queue) under heavy contention.

**Q: What is thread-pool starvation and what causes it?**
A: All pool threads are blocked, so new work can't run and the pool injects threads slowly. Usually caused by **sync-over-async** blocking pool threads; fix by going async end-to-end.

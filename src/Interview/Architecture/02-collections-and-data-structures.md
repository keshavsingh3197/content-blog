# Collections & Data Structures

> The .NET collection types, their internal structures, Big-O costs, growth/hashing internals, concurrent variants, and how to choose the right one.

## The Core Types

| Type | Backed by | Ordered? | Key idea |
|---|---|---|---|
| `T[]` (array) | contiguous block | index | fixed size, fastest indexing |
| `List<T>` | dynamic array | insertion | resizable array, index access |
| `Dictionary<TKey,TValue>` | hash table (buckets) | no* | O(1) key lookup |
| `HashSet<T>` | hash table | no* | unique membership, set ops |
| `SortedDictionary<TKey,TValue>` | red-black tree | by key | ordered keys, O(log n) |
| `SortedSet<T>` | red-black tree | sorted | ordered unique, range queries |
| `Queue<T>` | circular array | FIFO | Enqueue/Dequeue |
| `Stack<T>` | array | LIFO | Push/Pop |
| `LinkedList<T>` | doubly-linked nodes | insertion | O(1) insert/remove at node |
| `Span<T>` / `Memory<T>` | window over memory | index | allocation-free slicing |

\* Enumeration order is unspecified (roughly insertion order in practice but not guaranteed).

## Big-O of Common Operations

| Operation | `List<T>` | `Dictionary`/`HashSet` | `SortedDictionary`/`SortedSet` | `LinkedList<T>` | `Queue`/`Stack` |
|---|---|---|---|---|---|
| Index access | O(1) | — | — | O(n) | — |
| Search (contains) | O(n) | O(1) avg | O(log n) | O(n) | O(n) |
| Insert at end | O(1) amortized | O(1) avg | O(log n) | O(1) | O(1) amortized |
| Insert at front/middle | O(n) | — | O(log n) | O(1) at node | — |
| Remove | O(n) | O(1) avg | O(log n) | O(1) at node | O(1) |
| Add worst case | O(n) (resize) | O(n) (rehash) | O(log n) | O(1) | O(n) (resize) |

## Array & List<T> Growth

- `List<T>` wraps a `T[]`. On overflow it **doubles** capacity (new array + `Array.Copy`), giving **amortized O(1)** `Add` but occasional O(n) copies.
- Pre-size with `new List<T>(capacity)` when count is known to avoid repeated reallocations.
- `Count` = elements; `Capacity` = allocated slots. `TrimExcess()` releases slack.

## Dictionary / HashSet Internals

- Backed by **buckets** + entry array. Slot = `hashCode % bucketCount`.
- **Collisions** resolved by **chaining** (entries link within a bucket via a `next` index).
- Uses `GetHashCode()` to place and `Equals()` to disambiguate — **override both consistently** (or use a `record`) for correct behaviour.
- **Load factor**: when entries exceed capacity, it resizes to the next prime (~2x) and **rehashes** all entries → O(n) spike.
- A poor/constant hash degrades lookups toward **O(n)** (all in one bucket). Immutable keys are essential — mutating a key after insertion corrupts the table.

## SortedDictionary / SortedSet (Trees)

- Implemented as **self-balancing red-black trees** → all ops **O(log n)**, iteration in **sorted order**, supports range queries (`GetViewBetween`).
- `SortedList<TKey,TValue>` is different: a sorted **array pair**, lower memory + faster indexed access, but O(n) inserts. Choose `SortedList` for read-mostly, `SortedDictionary` for frequent inserts/removes.

## Queue / Stack / LinkedList

- **`Queue<T>`** FIFO via circular buffer; **`Stack<T>`** LIFO via array. Both amortized O(1).
- **`LinkedList<T>`** doubly-linked; O(1) insert/remove given a node reference, but O(n) to find one and poor cache locality — rarely the best choice vs `List<T>`.
- `PriorityQueue<TElement,TPriority>` (.NET 6+): binary-heap, O(log n) enqueue/dequeue.

## Span<T> and friends

- **`Span<T>`**: a `ref struct` — a type-safe window over arrays, stack memory (`stackalloc`), or unmanaged memory. **No allocation, no copy** for slicing.
- Stack-only (can't be a field/boxed/awaited across). Use **`Memory<T>`** for heap-storable/async slices.
- Great for parsing, buffers, and hot paths (`ReadOnlySpan<char>` for substring-free string work).

```c#
ReadOnlySpan<char> s = "2026-07-06";
var year = s[..4];          // no substring allocation
int y = int.Parse(year);
```

## Concurrent Collections

- Thread-safe without external locking; optimized for concurrency (lock internals & synchronization primitives → [05 — Concurrency](05-concurrency-and-multithreading.md)).

| Type | Purpose |
|---|---|
| `ConcurrentDictionary<K,V>` | thread-safe map; `GetOrAdd`/`AddOrUpdate` atomic-ish helpers, fine-grained striped locking |
| `ConcurrentQueue<T>` | lock-free FIFO |
| `ConcurrentStack<T>` | lock-free LIFO |
| `ConcurrentBag<T>` | unordered, thread-local optimized for producer=consumer |
| `BlockingCollection<T>` | producer/consumer wrapper with bounding + blocking `Take`/`Add` |

- `ConcurrentDictionary` factory delegates (`GetOrAdd`) may run **more than once** under contention — keep them side-effect free.

## Choosing the Right Collection

- **Index by position, mostly append** → `List<T>` / array.
- **Fast key lookup** → `Dictionary` (or `FrozenDictionary` for read-only hot data).
- **Uniqueness / set math** → `HashSet<T>`.
- **Always-sorted / range queries** → `SortedSet` / `SortedDictionary`.
- **FIFO / LIFO** → `Queue` / `Stack`; priority → `PriorityQueue`.
- **Many mid-list inserts with node handles** → `LinkedList<T>`.
- **Allocation-free slicing/parsing** → `Span<T>` / `Memory<T>`.
- **Immutable/shared safely** → `ImmutableArray<T>` / `FrozenDictionary`.
- **Multi-threaded** → `Concurrent*` / `BlockingCollection`.

## Interview Q&A

- **Q: How does `Dictionary<K,V>` achieve O(1) lookup?** Hashes the key to a bucket index and resolves collisions by chaining; degrades to O(n) with bad hashing.
- **Q: What happens when a `List<T>` runs out of capacity?** It allocates a new array (typically 2x), copies elements over — amortized O(1) Add, occasional O(n).
- **Q: `SortedDictionary` vs `SortedList`?** Tree (O(log n) inserts, more memory) vs sorted array pair (O(n) inserts, faster indexed reads, less memory).
- **Q: Why must you override `GetHashCode` and `Equals` together for dictionary keys?** Hash locates the bucket; Equals confirms the match — inconsistent implementations cause missed/duplicate entries.
- **Q: What is a load factor and rehash?** The fill threshold that triggers resizing to a larger table and recomputing all bucket positions — an O(n) operation.
- **Q: When use `Span<T>`?** For allocation-free slicing/parsing over arrays or stack memory in hot paths; it's a stack-only `ref struct`.
- **Q: Is `ConcurrentDictionary` fully lock-free?** No — reads are largely lock-free but writes use fine-grained striped locking; `GetOrAdd` factories can run multiple times.
- **Q: When would you pick `LinkedList<T>`?** When you frequently insert/remove at known node positions; rarely otherwise due to O(n) search and poor cache locality.

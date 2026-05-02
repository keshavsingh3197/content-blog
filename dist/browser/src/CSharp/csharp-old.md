# C_Sharp

1. [CSharp](#csharp)
2. [Operator](#operator)
3. [Filters](#filters)
   - [Authorization Filter](#authorization-filter)
   - [Resource Filter](#resource-filter)
   - [Action Filter](#action-filter)
   - [Result Filter](#result-filter)
   - [Exception Filter](#exception-filter)
   - [A filter can be added to the pipeline at one of three scopes](#a-filter-can-be-added-to-the-pipeline-at-one-of-three-scopes)
   - [We can apply our filter to the controller class or action method using one of the following](#we-can-apply-our-filter-to-the-controller-class-or-action-method-using-one-of-the-following)
     - [ServiceFilterAttribute](#servicefilterattribute)
     - [TypeFilterAttribute](#typefilterattribute)
     - [IFilterFactory implemented on attribute](#ifilterfactory-implemented-on-attribute)
4. [Ref and Out](#ref-and-out)
5. [Boxing and Unboxing](#boxing-and-unboxing)
   - [Boxing](#boxing)
   - [Unboxing](#unboxing)
6. [DI (Dependency Injection)](#di)
   - [There are three types of DIs](#there-are-three-types-of-dis)
   - [There are 3 types of lifetimes supported by ASP.NET Core for the dependency injection](#there-are-3-types-of-lifetimes-supported-by-aspnet-core-for-the-dependency-injection)
   - [Injecting service with different lifetimes into another](#injecting-service-with-different-lifetimes-into-another)
7. [What are the features of C#?](#what-are-the-features-of-c)
8. [What is Asynchronous and synchronous with example](#what-is-asynchronous-and-synchronous-with-example)
9. [Delegates and Events](#delegates-and-events)
10. [Method signature](#method-signature)
11. [Comments](#comments)
12. [Indexer](#indexer)
    - [Overload Indexer](#overload-indexer)
    - [C# Indexer Overview](#c-indexer-overview)
13. [Diff b/w const, static and readonly](#diff-bw-const-static-and-readonly)
14. [Lazy Loading](#lazy-loading)
15. [Concurrency & Parallelism](#concurrency--parallelism)
16. [Diff b/w Interface and Abstract class](#diff-bw-interface-and-abstract-class)
17. [Diff b/w list and arrayList](#diff-bw-list-and-arraylist)
18. [Diff b/w IEnumerable, ICollection and IList](#ienumerable-icollection-and-ilist)
19. [Diff b/w Dynamic, Object and Reflection](#dynamic-object-and-reflection-diff)
20. [Diff b/w MetData and Manifest](#diff-bw-metadata-and-manifest)

## Operator

---

## Filters

> Filters allow us to run custom code before or after executing the action method. They provide ways to do common repetitive tasks on our action method. The filters are invoked on certain stages in the request processing pipeline.

- Authorization FIlter
- Resource Filter
- Action Filter
- Result Filter
- Exception Filter

### A filter can be added to the pipeline at one of three scopes

- by action method,
- by controller class or
- globally (which be applied to all the controller and actions).

> We need to register filters in to the MvcOption.Filters collection within ConfigureServices method.

![Filter types overview](https://camo.githubusercontent.com/4711bb74ccf3f761f71bec058afa51a2d7c5aae62b3a7d2ea384b36a04349955/68747470733a2f2f66346e33783663352e737461636b7061746863646e2e636f6d2f61727469636c652f776f726b696e672d776974682d66696c746572732d696e2d6173702d6e65742d636f72652d6d76632f496d616765732f312e706e67)

![Implementation of filter overview](https://camo.githubusercontent.com/cc25260ca6c4b609ad9403e297a7a304b0395e03e3d3e4ca3726f0fc95f8fe17/68747470733a2f2f66346e33783663352e737461636b7061746863646e2e636f6d2f61727469636c652f776f726b696e672d776974682d66696c746572732d696e2d6173702d6e65742d636f72652d6d76632f496d616765732f322e706e67)

### We can apply our filter to the controller class or action method using one of the following

- ServiceFilterAttribute

```c#
[ServiceFilter(typeof(ExampleFilterWithDI))]  
public IActionResult Index()  
{  
    return View();  
}
```

- TypeFilterAttribute
  - It is very similar to ServiceFilterAttribute and also implemented from IFilterFactory interface.
  - The "TypeFilterAttribute" can be optionally accept constructor arguments for the type.

```c#
[TypeFilter(typeof(ExampleFilterAttribute), Arguments = new object[] {"Argument if any" })]  
public IActionResult About()  
{  
    return View();  
}
```

- IFilterFactory implemented on attribute

> References:

- [MSDIN](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters)
- [https://www.c-sharpcorner.com/article/working-with-filters-in-asp-net-core-mvc](https://www.c-sharpcorner.com/article/working-with-filters-in-asp-net-core-mvc/)

---

## Ref and Out

- ref tells the compiler that the object is initialized before entering the function, while out tells the compiler that the object will be initialized inside the function.

- So while ref is two-ways, out is out-only.

| Ref | Out |
| --- | --- |
| The parameter or argument must be initialized first before it is passed to ref. | It is not compulsory to initialize a parameter or argument before it is passed to an out. |
| It is not required to assign or initialize the value of a parameter (which is passed by ref) before returning to the calling method. |  A called method is required to assign or initialize a value of a parameter (which is passed to an out) before returning to the calling method. |
| Passing a parameter value by Ref is useful when the called method is also needed to modify the pass parameter. | Declaring a parameter to an out method is useful when multiple values need to be returned from a function or method. |
| It is not compulsory to initialize a parameter value before using it in a calling method. | A parameter value must be initialized within the calling method before its use. |
| When we use REF, data can be passed bi-directionally. | When we use OUT data is passed only in a unidirectional way (from the called method to the caller method). |
| Both ref and out are treated differently at run time and they are treated the same at compile time. |

> References:

- [https://www.c-sharpcorner.com/UploadFile/ff2f08/ref-vs-out-keywords-in-C-Sharp/](https://www.c-sharpcorner.com/UploadFile/ff2f08/ref-vs-out-keywords-in-C-Sharp/)

---

## Boxing and Unboxing

- Boxing
  - The conversion of value type to reference type is known as boxing.
![Boxing](https://camo.githubusercontent.com/c9821116564e899b1028d1a2877dd3247c1d98abf5c497b79c61a8f939958f42/68747470733a2f2f7777772e7475746f7269616c73746561636865722e636f6d2f436f6e74656e742f696d616765732f61727469636c65732f6373686172702f626f78696e672e504e47)

- Unboxing
  - The conversion of reference type to value is known as unboxing.
![UnBoxing](https://camo.githubusercontent.com/cfe6e987e2db984639001d98acc69faeda0a4d8626d8abdf3dd54f4fdaad6cc1/68747470733a2f2f7777772e7475746f7269616c73746561636865722e636f6d2f436f6e74656e742f696d616765732f61727469636c65732f6373686172702f756e626f78696e672e504e47)

> References:

- [https://www.tutorialsteacher.com/articles/boxing-unboxing-in-csharp](https://www.tutorialsteacher.com/articles/boxing-unboxing-in-csharp)

---

## DI

- It is a design pattern that allows objects to depend on other objects, called dependencies, without creating them directly.
- It is a software design pattern which enables the development of loosely coupled code. Through DI, you can decrease tight coupling between software components. It is also known as Inversion-of-Control.

### There are three types of DIs

```text
    Constructor Injection
    Setter Injection
    Method Injection
```

### There are 3 types of lifetimes supported by ASP.NET Core for the dependency injection

- Transient Service
  - New instance transient service is created whenever the service is requested.
- Scoped Service
  - Created once per scope; i.e., web request.or any unit of work.
- Singleton Service
  - Singleton service is only created when it is called for the first time. In the next subsequent requests, the same instance is provided.

### Injecting service with different lifetimes into another

Be careful, while injecting service into another service with a different lifetime

Consider the example of Singleton Service, which depends on another Service which is registered with say the transient lifetime.

When the request comes for the first time a new instance of the singleton is created. It also creates a new instance of the transient object and injects into the Singleton service.

When the second request arrives the instance of the singleton is reused. The singleton already contains the instance of the transient service Hence it is not created again. This effectively converts the transient service into the singleton.

The services with the lower lifetime injected into service with a higher lifetime would change the lower lifetime service to a higher lifetime. This will make debugging the application very difficult and should be avoided at all costs.

Hence, remember the following rules

- Never inject Scoped & Transient services into Singleton service.
- Never inject Transient services into scoped service

> References

- [https://stackify.com/dependency-injection-c-sharp/](https://stackify.com/dependency-injection-c-sharp/)
- [https://www.tektutorialshub.com/asp-net-core/asp-net-core-dependency-injection-lifetime/](https://www.tektutorialshub.com/asp-net-core/asp-net-core-dependency-injection-lifetime/)

## What are the features of C#?

1. Object-Oriented Programming

    ```text
    C# is an object-oriented programming (OOP) language. It supports features such as classes, objects, encapsulation, inheritance, and polymorphism.
    ```

2. Type Safety

    ```text
    It is a type-safe language, which means that it enforces type checking at compile time to ensure that variables are used only in the ways intended by the programmer. Example:-
    ```

    ```C#
    int x = 10;   // declaring an integer variable and initializing it with value 10
    string str = "Hello, World!";   // declaring a string variable and initializing it with a string value

    // We cannot assign a string value to an integer variable:
    x = str;   // This will result in a compilation error

    // Similarly, we cannot call a method on a variable that doesn't support it:
    int y = 5;
    y.ToUpper();   // This will result in a compilation error since ToUpper() method 
    ```

3. Garbage Collection

    ```text
    C# includes automatic garbage collection, which automatically frees up memory that is no longer being used by the program.
    ```

4. Cross-Platform Support

    ```text
    C# can be used to develop applications for a wide range of platforms, including Windows, macOS, Linux, and mobile devices.
    ```

5. Language Interoperability

    ```text
    C# can interoperate with other programming languages, including C, C++, and Visual Basic.
    ```

6. LINQ

    ```text
    Language Integrated Query (LINQ) is a powerful feature in C# that allows developers to query and manipulate data from different data sources using a uniform syntax.
    ```

7. Asynchronous Programming

    ```text
    C# includes support for asynchronous programming, which allows developers to write code that can execute concurrently without blocking the main thread.
    ```

8. Exception Handling

    ```text
    C# includes robust exception handling capabilities that allow developers to handle and recover from runtime errors in a structured manner.
    ```

9. Delegates and Events

    ```text
    C# supports the use of delegates and events, which are used for implementing callback functions and event-driven programming.
    ```

10. Security Features

    ```text
    C# includes security features such as code access security, which helps protect against malicious code execution, and cryptography, which allows for secure communication and data storage.
    ```

---

### What is Asynchronous and synchronous with example

- Synchronous refers to an operation that blocks the execution of the program until the operation completes

- Asynchronous, on the other hand, refers to an operation that does not block the execution of the program but instead executes in the background, allowing the program to continue executing other operations.

### Here's an example of synchronous code

```c#
public static void Main()
{
    Console.WriteLine("Starting synchronous operation...");
    string result = GetDataFromWeb(); // This method blocks the execution until it gets the data
    Console.WriteLine("Synchronous operation completed with result: " + result);
}

public static string GetDataFromWeb()
{
    // This method makes a web request to get some data
    WebClient client = new WebClient();
    string result = client.DownloadString("http://example.com");
    return result;
}

```

> In the above code, the `Main` method makes a call to the `GetDataFromWeb` method, which makes a web request to retrieve some data. Since this operation is synchronous, the execution of the program is blocked until the web request completes and returns the data. Only then does the program continue to execute the next line of code.

### Here's an example of asynchronous code

```c#
public static async Task Main()
{
    Console.WriteLine("Starting asynchronous operation...");
    Task<string> resultTask = GetDataFromWebAsync(); // This method executes in the background
    Console.WriteLine("Asynchronous operation started, program continues executing other operations...");

    // Do some other work here while the GetDataFromWebAsync() method is executing in the background

    string result = await resultTask; // This line blocks until the GetDataFromWebAsync() method completes and returns the data
    Console.WriteLine("Asynchronous operation completed with result: " + result);
}

public static async Task<string> GetDataFromWebAsync()
{
    // This method makes an asynchronous web request to get some data
    HttpClient client = new HttpClient();
    string result = await client.GetStringAsync("http://example.com");
    return result;
}
```

> In the above code, the `Main` method makes a call to the `GetDataFromWebAsync` method, which makes an asynchronous web request to retrieve some data. Since this operation is asynchronous, the execution of the program is not blocked and the program continues executing other operations while the web request is being made in the background. The program then waits for the result of the asynchronous operation using the `await` keyword, which does not block the execution of the program but instead waits for the result to become available before continuing to execute the next line of code.

---

## Delegates and Events

- A `delegate` is a type that represents a reference to a method with a particular parameter list and return type

```c#
public delegate int BinaryOperation(int x, int y);

public class Calculator
{
    public int Add(int x, int y)
    {
        return x + y;
    }

    public int Subtract(int x, int y)
    {
        return x - y;
    }
}

public static void Main()
{
    Calculator calculator = new Calculator();

    BinaryOperation operation = new BinaryOperation(calculator.Add);

    int result = operation(5, 3); // result = 8

    operation = new BinaryOperation(calculator.Subtract);

    result = operation(5, 3); // result = 2
}

```

- An `event` is a construct built on top of delegates that allows objects to be notified when an event occurs.

```c#
public class Button
{
    public event EventHandler Clicked;

    public void Click()
    {
        if (Clicked != null)
        {
            Clicked(this, EventArgs.Empty);
        }
    }
}

public static void Main()
{
    Button button = new Button();

    button.Clicked += OnButtonClicked;

    button.Click();
}

public static void OnButtonClicked(object sender, EventArgs e)
{
    Console.WriteLine("Button clicked!");
}

```

---

## Method signature

- The signature of a method in C# consists of its name and the types of its parameters. The return type of the method is not considered part of its signature.

---

## Comments

> In c#, there are three types of comments available, those are

- Single-line Comments

```c#
// Single Line Comment 
```

- Multi-line Comments

```c#
/* Multi Line Comment */
```

- XML Comments

```c#
///<summary>
/// This class does something.
///</summary>
```

---

## Indexer

- It allows instances of a class or structure to be indexed same like an array.

```c#
public class UserIndexer
{
    public Dictionary<string, string> Users = new Dictionary<string, string>();

    public string this[string index]
    {
        get { return Users[index]; }
        set { Users[index] = value; }
    }
}

UserIndexer user = new();

user["Name"] = "Keshav";
user["password"] = "1234";


Console.WriteLine($"Name: {user["Name"]}");
Console.WriteLine($"Password: {user["password"]}");

/*Output:
Name: Keshav
Password: 1234
*/
```

### Overload Indexer

```c#
public class UserIndexer
{
    public Dictionary<string, string> Users = new();
    public Dictionary<char, int> Chars = new();

    public string this[string index]
    {
        get { return Users[index]; }
        set { Users[index] = value; }
    }

    public int this[char index]
    {
        get { return Chars[index]; }
        set { Chars[index] = value; }
    }
}

UserIndexer user = new();

user["Name"] = "Keshav";
user["password"] = "1234";
user['A'] = 65;
user['C'] = 67;


Console.WriteLine($"Name: {user["Name"]}");
Console.WriteLine($"Password: {user["password"]}");
Console.WriteLine($"A ASCII value {user['A']}");
Console.WriteLine($"C ASCII value {user['C']}");

/*Output:
Name: Keshav
Password: 1234
A ASCII value 65
C ASCII value 67
*/
```

### C# Indexer Overview

Following are the important points which we need to remember about indexers in c#.

- In c#, the indexer is a special type of property, allowing instances of a class or structure to be indexed same as an array.
- In c#, the indexer is same as the property, but the only difference is, the indexer will define with this keyword along with the square bracket and parameters.
- Indexers can be overloaded by having different signatures.
- Indexers cannot be a static member as it’s an instance member of the class.
- Passing indexer value as a ref or out parameter is not supported.

> In C#, indexers are instance members that allow objects of a class to be indexed in a similar way as arrays. They cannot be declared as static because they are used to access or modify the data of individual instances of a class, not shared data across all instances.
>
> References

- [https://www.tutlane.com/tutorial/csharp/csharp-indexer](https://www.tutlane.com/tutorial/csharp/csharp-indexer)

## Diff b/w const, static and readonly

| Modifier   | Scope        | Lifetime         | Assigned At                          | Can Be Static            | Can Change After Assignment | Access Through              | Typical Use Case                                     |
|------------|--------------|------------------|--------------------------------------|--------------------------|-----------------------------|-----------------------------|------------------------------------------------------|
| `const`    | Class        | Application      | Declaration (Compile Time)           | Implicitly (Always)      | No                          | Class Name                  | Primitive/enum values known at compile time          |
| `readonly` | Instance/Class | Object/Application | Constructor or Declaration (Runtime) | Explicitly (when combined with `static`) | No                          | Object Reference or Class Name | Values computed at runtime but immutable after construction |
| `static`   | Class        | Application      | Constructor, Field Initializer, or Any Method (Runtime) | Yes (Inherently)          | Yes (unless combined with `readonly`) | Class Name                  | Shared data or methods that do not require an instance of the class |

<details>
<summary>More info</summary>

In C#, `const`, `readonly`, and `static` are modifiers that can be applied to fields and properties to control their behavior and accessibility. Here's a breakdown of their differences:

1. `const` (Constant):
   - A `const` field is a compile-time constant, meaning its value is set at compile time and cannot be changed.
   - It is implicitly static, and you must assign a value to it at the time of its declaration.
   - The value of a `const` field is the same across all instances of the class, and you access it using the class name rather than an instance of the class.
   - It can only be used with primitive types (such as `int`, `double`, `string`, etc.) and enum types.

Example:

```c#
public class MyClass
{
    public const int MyConstant = 42;
}
// Usage: int value = MyClass.MyConstant;
```

2. `readonly` (Read-only):
   - A `readonly` field can be assigned only during initialization or in the constructor of the class in which it is declared.
   - It is not static by default (but can be made static explicitly), meaning its value can be different across instances of the class.
   - If you declare a `readonly` field as static, its value will be the same for all instances, just like a `const`, but it can be assigned a value that is computed at runtime, unlike a `const`.

Example:

```c#
public class MyClass
{
    public readonly int MyReadOnlyField;

    public MyClass(int value)
    {
        MyReadOnlyField = value; // Assignment is allowed only here or in a field initializer
    }
}
// Usage: MyClass myClass = new MyClass(10); int value = myClass.MyReadOnlyField;
```

3. `static`:
   - A `static` field belongs to the type itself rather than to any specific instance of the class.
   - A `static` field is initialized once and retains its value between calls.
   - `static` fields can be modified at any time, unless they are also marked as `readonly`.

Example:

```c#
public class MyClass
{
    public static int MyStaticField = 0;
}
// Usage: MyClass.MyStaticField = 10; int value = MyClass.MyStaticField;
```

In summary:

- `const` is for compile-time constants, with values known at compile time and unchangeable at runtime.
- `readonly` is for fields that should not be changed after the constructor has finished executing, but their initial values can be computed at runtime.
- `static` means the field is associated with the type rather than with any instance, and it can be modified unless it's combined with `readonly`.

</details>

## Lazy Loading

- Lazy loading is basically loading data when its required, not at the time when the object instance is created, the lazy loading technique can help boosting application performance  some extent if used correctly.

- Example

```text
Think of real-time business scenario, when you want to create a client object along with client order list, now in general you probably will have order list property in client object, so when a new instance of client object is created, the order list also will be loaded at the same time. If the order list is long, that will take longer the execution time, when you may not need those data while accessing other client class property, which can be avoided by using lazy class, you can load the data only when the data is required.
```

```c#
public class data
{
    public static List<int> GetList1()
    {
        List<int> list1 = new List<int>();
        for (int i = 0; i <= 5000000; i++)
        {
                list1.Add(i);
        }
        return list1;
    }

    public static Lazy<List<int>> GetList3()
    {
        Lazy<List<int>> list3 = new Lazy<List<int>>();
        for (int i = 0; i <= 5000000; i++)
        {
            list3.Value.Add(i);
        }
        return list3;
    }
}

```

```text
You will be surprised to see the execution time; the lazy list took half time to perform than the normal list object.
```

## Concurrency & Parallelism

- Concurrency refers to the ability of an application to deal with multiple tasks at the same time. Concurrency does not necessarily mean that these tasks are actually running simultaneously; it means that the tasks can start, run, and complete in overlapping time periods, and the architecture is such that it can handle multiple tasks at once. Concurrency is about structure.

```c#
using System;
using System.Threading;
using System.Threading.Tasks;

class ConcurrencyExample
{
    static void Main()
    {
        Task task1 = Task.Run(() => DoTask("Task 1"));
        Task task2 = Task.Run(() => DoTask("Task 2"));

        Task.WaitAll(task1, task2);
    }

    static void DoTask(string name)
    {
        for (int i = 0; i < 5; i++)
        {
            Thread.Sleep(1000); // Simulate work
            Console.WriteLine($"{name} - iteration {i}");
        }
    }
}
```

- Parallelism is about execution. It refers to the simultaneous execution of multiple tasks or processes. This requires a system with multiple processing units (cores). Parallelism is possible when tasks are independent or can be broken into independent subtasks which can be processed simultaneously.

```c#
using System;
using System.Threading.Tasks;

class ParallelismExample
{
    static void Main()
    {
        Parallel.Invoke(
            () => DoTask("Task 1"),
            () => DoTask("Task 2")
        );
    }

    static void DoTask(string name)
    {
        for (int i = 0; i < 5; i++)
        {
            Console.WriteLine($"{name} - iteration {i}");
        }
    }
}
```

## Diff b/w Interface and Abstract class

| Feature                   | Interface                                              | Abstract Class                                        |
|---------------------------|--------------------------------------------------------|-------------------------------------------------------|
| Instantiation             | Cannot be instantiated.                                | Cannot be instantiated.                               |
| Implementation            | Cannot have any implementation, only method signatures. | Can have both abstract methods and concrete methods.   |
| Fields                    | Cannot have fields.                                    | Can have fields.                                      |
| Constructors/Destructors  | Cannot have constructors or destructors.               | Can have constructors and destructors.                |
| Access Modifiers          | Members are implicitly public.                         | Members can have various access modifiers.            |
| Inheritance                | A class can implement multiple interfaces.            | A class can inherit from only one abstract class.     |
| Default Behavior          | Cannot provide default behavior.                       | Can provide default behavior.                         |
| Property Definitions      | Can define properties, but not their accessors.       | Can define properties with accessors.                 |
| Multiple Inheritance      | Supports multiple inheritance (a class can implement multiple interfaces). | Does not support multiple inheritance (a class can inherit only one abstract class). |
| Versioning                | Adding new members to an interface breaks existing implementers. | New methods can be added as abstract or virtual, allowing subclasses to optionally override them. |
| Purpose                   | Defines a contract that implementing classes must follow. | Serves as a base class to define common behavior and provide a common structure. |

## Diff b/w list and arrayList

| Feature                 | `List<T>`                        | `ArrayList`                       |
|-------------------------|----------------------------------|---------------------------------|
| Type Safety             | Type-safe, stores elements of a specific type. | Not type-safe, stores elements of any type (object). |
| Performance             | Generally better performance due to type-safety. | Can suffer performance penalties due to boxing and unboxing when storing value types. |
| Generics                | Supports generics.               | Does not support generics.       |
| Namespace               | System.Collections.Generic       | System.Collections              |
| Requires Casting        | No casting needed when retrieving elements. | Requires casting when retrieving non-object types. |
| Methods and Properties  | Provides a range of methods and properties designed for generic collections. | Provides methods and properties common to all non-generic collections. |
| Introduced in Version   | .NET 2.0 (with generics)         | .NET 1.0 (before generics were introduced) |
| Null Values             | Can store null if the type T is a reference type. | Can store null.                  |
| Capacity Management     | Automatically resizes. Has a `Capacity` property to manage the underlying array size. | Automatically resizes. Has a `Capacity` property to manage the underlying array size. |
| Sorting                 | Provides a `Sort` method that works with `IComparer<T>` or Comparison<T> delegates. | Provides a `Sort` method that requires an `IComparer` implementation. |
| Thread-Safety           | Not thread-safe (like most collection classes). Use `Concurrent` collections for thread-safe operations. | Not thread-safe. |

## IEnumerable, ICollection and IList

In C#, `ICollection`, `IEnumerable`, and `IList` are interfaces that represent different levels of collection functionality in the System.Collections and System.Collections.Generic namespaces.

Here's a brief overview of each, along with their differences:

1. `IEnumerable` (or `IEnumerable<T>` for generics):

- This is the most basic interface of the three. It allows the implementing collection to be enumerated, which means you can iterate through the collection using a `foreach` loop.
- It defines a single method, `GetEnumerator()`, which returns an `IEnumerator` (or `IEnumerator<T>` for generics) that provides the ability to iterate through the collection.
- All collections that can be iterated over implement this interface.

2. `ICollection` (or `ICollection<T>` for generics):

- This interface extends `IEnumerable` and represents a general collection that can be enumerated.
- `ICollection` provides additional functionality, such as the ability to get the count of elements (`Count` property), add or remove items from the collection (if not read-only), and check if the collection contains a specific item.
- It also includes methods for copying the elements to an array (`CopyTo`) and getting a value indicating whether the collection is read-only.

3. `IList` (or `IList<T>` for generics):

- `IList` extends `ICollection` and represents a collection of objects that can be individually accessed by index.
- It provides functionality for adding, removing, and inserting items at a specified index, as well as retrieving items by their index.
- `IList` also has an `IndexOf` method that returns the index of a specific item in the list, and an `IsFixedSize` property indicating whether the list has a fixed size.

In summary:

- `IEnumerable` is for iteration.
- `ICollection` adds counting, adding, and removing capabilities, as well as the ability to test for containment and to copy the collection to an array.
- `IList` includes all of the above, plus the ability to manipulate the collection by index.

| Feature/Method       | IEnumerable | ICollection | IList       |
|----------------------|-------------|-------------|-------------|
| Enumeration          | Yes         | Yes         | Yes         |
| Counting Elements    | No          | Yes         | Yes         |
| Adding Elements      | No          | Yes*        | Yes*        |
| Removing Elements    | No          | Yes*        | Yes*        |
| Clearing Collection  | No          | Yes*        | Yes*        |
| Contains             | No          | Yes         | Yes         |
| Copy To Array        | No          | Yes         | Yes         |
| Read-Only Collection | No          | Yes         | Yes         |
| Access by Index      | No          | No          | Yes         |
| Insert at Index      | No          | No          | Yes*        |
| Remove at Index      | No          | No          | Yes*        |
| Index Of             | No          | No          | Yes         |
| Fixed Size           | No          | No          | Yes**       |

## Dynamic, Object and Reflection DIFF

| Aspect          | Dynamic                           | Object                             | Reflection                            |
|-----------------|-----------------------------------|------------------------------------|---------------------------------------|
| Type checking   | At runtime                        | At compile time (unless casting)   | At runtime                            |
| Performance     | Slower (runtime type checking)    | Faster (statically typed)          | Slower (overhead of metadata)         |
| Complexity      | Simpler (easy syntax)             | Simple (base type for all objects) | More complex (API understanding)      |
| Control         | Less control (runtime binding)    | Moderate control (type casting)    | More control (detailed type manipulation) |
| Error detection | At runtime                        | At compile time and runtime (when casting) | Mostly at runtime                      |
| Use Cases       | Interop with dynamic languages, handling unknown types at compile time | General OOP, storing mixed types in non-generic collections | Dynamic type creation and manipulation, advanced scenarios like plugin architectures |

## Diff b/w MetaData and Manifest

| Aspect        | Metadata                                                         | Manifest                                                         |
|---------------|------------------------------------------------------------------|------------------------------------------------------------------|
| Definition    | Information describing the types, members, and references in an assembly. | Part of the metadata containing assembly identity and file list. |
| Contains      | - Type definitions<br>- Member signatures<br>- Custom attributes<br>- Security information | - Assembly's identity (name, version, culture)<br>- File list<br>- Assembly references<br>- Assembly-level attributes |
| Used by       | - CLR for loading and execution<br>- Tools for reflection and inspection | - CLR for resolving assembly dependencies<br>- Versioning and compatibility checks |
| Location      | Stored in metadata tables within the assembly.                   | A specific section within the metadata of the assembly.          |
| Accessibility | Can be accessed using reflection in code.                        | Can be viewed using tools like ILDASM or reflection in code.     |
| Example       | `Type.GetTypeInfo()`, `MemberInfo[]` members = type.GetMembers() | `AssemblyName name = assembly.GetName()`                         |

Imagine a .NET assembly as a book. The book represents the compiled code, which is the assembly.

1. Metadata is like the detailed table of contents and index of the book. It includes information about every chapter, section, and significant term used in the book. In the context of an assembly, these would be the classes, methods, properties, fields, and other types, as well as their signatures and attributes.

2. The Manifest is like the summary page of the book that contains the book's title, edition, a list of authors, and the ISBN. In terms of an assembly, this includes the assembly's name, version, culture, and other assembly-level information.

Here's a code example to illustrate how you might encounter metadata and manifest information in a .NET Core application.

```c#
using System;
using System.Reflection;

// Define a simple class with some metadata (class name, method, property)
public class ExampleClass
{
    public string ExampleProperty { get; set; }

    public void ExampleMethod()
    {
        Console.WriteLine("This is an example method.");
    }
}

class Program
{
    static void Main(string[] args)
    {
        // Getting the assembly of the ExampleClass
        Assembly assembly = typeof(ExampleClass).Assembly;

        // Accessing the Manifest: Assembly Name
        Console.WriteLine("Assembly Name: " + assembly.GetName().Name);

        // Accessing the Manifest: Version
        Console.WriteLine("Version: " + assembly.GetName().Version);

        // Accessing the Metadata: Types
        Type[] types = assembly.GetTypes();
        foreach (var type in types)
        {
            Console.WriteLine("Type: " + type.Name);
            // Accessing the Metadata: Members (methods, properties, fields, etc.)
            MemberInfo[] members = type.GetMembers();
            foreach (var member in members)
            {
                Console.WriteLine("Member: " + member.Name);
            }
        }
    }
}
```

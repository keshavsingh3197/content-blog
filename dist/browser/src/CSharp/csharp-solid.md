# Solid Prinicipal

## `S` is for Single Responsibility Principle (SRP)
- A class should have only one responsibility.
- **A class should have only one reason to change.**
- This principle helps in achieving separation of concerns in a software system.
```C#
❌ Bad
class Invoice
{
    public void Calculate() { }
    public void Print() { }
}
✅ Good
class Invoice { public void Calculate() { } }

class InvoicePrinter { public void Print() { } }

👉 Benefit: Easy to modify without breaking other logic
```

## O is for Open/Closed Principle (OCP)
- **Software entities (classes, modules, functions, etc.) should be open for extension but closed for modification.**
- This means that the behavior of a class can be extended without modifying its source code.
```c#
❌ Bad
class Discount
{
    public double GetDiscount(string type)
    {
        if(type == "VIP") return 20;
        return 10;
    }
}
✅ Good
interface IDiscount
{
    double GetDiscount();
}

class VIPDiscount : IDiscount
{
    public double GetDiscount() => 20;
}

👉 Add new types without changing old code
```

## L is for Liskov Substitution Principle (LSP)
-	**Subtypes must be substitutable for their base type.**

> 👉 Rule: Child class should replace parent without breaking

Example:
- A derived class must be correctly substitutable for its base class. 
- When you derived a class from a base class then the derived class should correctly implement all the methods of the base class. 
- It should not remove some methods by throwing **NotImplementedException**

```c#
❌ Bad
class Bird
{
    public virtual void Fly() { }
}

class Ostrich : Bird
{
    public override void Fly()
    {
        throw new Exception("Can't fly");
    }
}
✅ Good
class Bird { }

interface IFlyable
{
    void Fly();
}

class Sparrow : Bird, IFlyable
{
    public void Fly() { }
}

class Ostrich : Bird
{

}
👉 Avoid breaking behavior
```

## I is for Interface Segregation Principle (ISP)
- **Clients should not be forced to depend on methods they do not use.**
> 👉 Rule: Don’t force unused methods
- This principle helps in creating focused and specialized interfaces, which are easier to understand and implement. 

```
❌ Bad
interface IWorker
{
    void Work();
    void Eat();
}
✅ Good
interface IWork { void Work(); }
interface IEat { void Eat(); }

👉 Small, specific interfaces
```

## D is for Dependency Inversion Principle (DIP)
- **High-level modules should not depend on low-level modules. Both should depend on abstraction.**
> 👉 Rule: Depend on abstraction, not concrete classes

### High Level Module (Abstraction/Interface)
- It is a module (class) that uses other modules (classes) to perform a task.

### Low Level Module / Concrete Class
- It contains a detailed implementation of some specific task that can be used by other modules.

> The high-level modules are generally the core business logic of an application whereas the low-level modules are input/output, database, file system, web API, or other external modules that interact with users, hardware, or other systems.

- Abstraction is something that is not concrete.
- Abstraction should not depend on detail but details should depend on abstraction.

```
For example, an abstract class or interface contains methods declarations that need to be implemented in concrete classes. Those concrete classes depend on the abstract class or interface but not vice-versa.
```
```c#
❌ Bad
class MyService
{
    private EmailService _email = new EmailService();
}
✅ Good
class MyService
{
    private readonly IMessageService _service;

    public MyService(IMessageService service)
    {
        _service = service;
    }
}

👉 Makes code testable & flexible
```


## ⚡ One-Line Summary

| Principle | 	Meaning |
| --------- | --------- |
| S |	One class = one job |
| O	| Extend, don’t modify |
| L	| Child = replaceable |
| I	| Small interfaces |
| D	| Depend on abstraction |

## 🔥 Real-Life Analogy
```
SRP → One employee = one role
OCP → Add new feature without breaking old system
LSP → Replacement part should fit perfectly
ISP → Don’t give unnecessary responsibilities
DIP → Use interface (plug), not specific device
```

## 🧠 Final Summary

👉 SOLID = Write code that is easy to change without breaking everything

# Class and Object

## Class

- A class is a user-defined data type.
- It consists of data members and member functions, which can be accessed and used by creating an instance of that class.
- It represents the set of properties or methods that are common to all objects of one type.
- A class is like a blueprint for an object.

```text
For Example: Consider the Class of Cars. There may be many cars with different names and brands but all of them will share some common properties like all of them will have 4 wheels, Speed Limit, Mileage range, etc. So here, Car is the class, and wheels, speed limits, mileage are their properties.
```

## Object

- It is a basic unit of Object-Oriented Programming and represents the real-life entities.
- An Object is an instance of a Class.
- When a class is defined, no memory is allocated but when it is instantiated (i.e. an object is created) memory is allocated.
- An object has an identity, state, and behavior.
- Each object contains data and code to manipulate the data.
- Objects can interact without having to know details of each other’s data or code, it is sufficient to know the type of message accepted and type of response returned by the objects.

```text
For example “Dog” is a real-life Object, which has some characteristics like color, Breed, Bark, Sleep, and Eats.
```

![]()

## Difference b/w class and object

| Class | Object |
| ----- | ------ |
| A class is a blueprint or template for creating objects | An object is an instance of a class |
| A class defines the structure, properties, and behavior (methods) that an object can have | An object is a specific instance of a class with its own set of values for the properties defined in the class. |
| When a class is created, no memory is allocated | Objects are allocated memory space whenever they are created.|
| The class has to be declared first and only once. | An object is created many times as per requirement. |
| A class is a logical entity. | An object is a physical entity. |
| It is declared with the class keyword | It is created with a class name in C++ and with the new keywords in Java. |
| Class does not contain any values which can be associated with the field. | Each object has its own values, which are associated with it. |
| A class is used to bind data as well as methods together as a single unit. | Objects are like a variable of the class. |

### References

- [https://www.geeksforgeeks.org/difference-between-class-and-object/](https://www.geeksforgeeks.org/difference-between-class-and-object/)

---

## Interface and Abstraction

Interface | Abstraction
------ | -----
| **Interface** keyword is used.  | **abstract** keyword is used to define an abstract class. |
| Interface is not a class | Abstract is a class. |
| Interface is implemented | Abstract classes are inherited. |
| A class can inherit from more than one interface. ex. ```public class AV : IAV1, IAV2, IAV3{}``` | A class can extend only one abstract class. |
| Allow multiple inheritance.| Abstract classes do not allow multiple inheritances |
| In interfaces, the body is definitely not found. The body is created in the inherited subclass. | Methods in abstract classes can have bodies or are marked abstract and override in the inheriting class. |
| Does not contain the constructor and static members. | Can contain the constructor and static members. |
| All elements in Interface must be implemented in the subclass. | In abstract classes, only abstract elements must be overridden in subclasses. Unsigned members do not have to be in subclasses. In this way, code clutter is avoided by keeping only the common features in the subclasses. |
| An interface can not have an access modifier, by default all are public. and we define these in implemented class. | All access modifier is accepted.  |
---

## Polymorphism

- Polymorphism means "one name many forms"
- In other words, one object has many forms or has one name with multiple functionalities.

### Types of Polymorphism

_There are two types of polymorphism in C#:_

- Static / Compile Time Polymorphism / Early binding
  - Overloading is the concept in which method names are the same with different parameters.
  - The method/function has the same name but different signatures in overloading.

```c#
public class TestData
{
    public int Add(int a, int b, int c)
    {
        return a + b + c;
    }
    public int Add(int a, int b)
    {
        return a + b;
    }
}
```

- Dynamic / Runtime Polymorphism / late binding
  - When overriding a method, you change the behavior of the method for the derived class.

![Late binding](https://camo.githubusercontent.com/40913eb9b10c9753e24d704451994e1b0887620b59c525eabc7c90639a84c867/68747470733a2f2f66346e33783663352e737461636b7061746863646e2e636f6d2f55706c6f616446696c652f6666326630382f756e6465727374616e64696e672d706f6c796d6f72706869736d2d696e2d432d53686172702f496d616765732f706c6f796d6f72706869736d2e6a7067)

### Other points about polymorphism

```text
    Method Overriding differs from shadowing.
    Using the "new" keyword, we can hide the base class member."
    We can prevent a derived class from overriding virtual members.
    We can access a base class virtual member from the derived class
```

***In C#, by default, all the members of a class are sealed and cannot be redefined in the derived class. Use the virtual keyword with a member of the base class to make it overridable, and use the override keyword in the derived class to indicate that this member of the base class is being redefined in the derived class***

### Rules for Overriding

```text
    A method, property, indexer, or event can be overridden in the derived class.
    Static methods cannot be overridden.
    Must use virtual keyword in the base class methods to indicate that the methods can be overridden.
    Must use the override keyword in the derived class to override the base class method.
```

References:

- [https://www.c-sharpcorner.com/UploadFile/ff2f08/understanding-polymorphism-in-C-Sharp/](https://www.c-sharpcorner.com/UploadFile/ff2f08/understanding-polymorphism-in-C-Sharp/)
- [https://www.tutorialsteacher.com/csharp/method-overriding](https://www.tutorialsteacher.com/csharp/method-overriding)

---

## Constructor

- In c#, Constructor is a method that will invoke automatically whenever an instance of _class_ or _struct_ is created

- The constructor will have the same name as the class or struct, and it is useful to initialize and set default values for the data members of the new object.

- If we create a class without any constructor, the compiler will automatically generate one default constructor for that class. **So, there is always one constructor that will exist in every class**.

---

### C# Constructor Types

In c#, we have different types of constructors available; those are

 ```text
    Default Constructor
    Parameterized Constructor
    Copy Constructor
    Static Constructor
    Private Constructor
```

#### 1. C# Default Constructor

In c#, if we create a constructor without any parameters, we will call it a default constructor. Every instance of the class will be initialized without any parameter values.

```c#
     class User
     {
         public string name, location;
         // Default Constructor
         public User()
         {
            name = "Suresh Dasari";
            location = "Hyderabad";
         }
     }
```

#### 2. C# Parameterized Constructor

In c#, if we create a constructor with at least one parameter, we will call it a parameterized constructor. Every instance of the class will be initialized with parameter values.

```c#
    class User
    {
        public string name, location;
        // Parameterized Constructor
        public User(string a, string b)
        {
           name = a;
           location = b;
        }
    }
```

#### 3. C# Copy Constructor

In c#, Copy Constructor is a parameterized constructor that contains a parameter of the same class type

```C#
// Example 1
class User
{
     // Parameterized Constructor
     public User(string a, string b)
     {
         // your code
     }
     // Copy Constructor
     public User(User user) {
        // your code
     }
}

// Example 2
     class User
     {
        public string name, location;
        // Parameterized Constructor
        public User(string a, string b)
        {
            name = a;
            location = b;
        }
        // Copy Constructor
        public User(User user)
        {
            name = user.name;
            location = user.location;
        }
     }
```

#### 4. C# Static Constructor

- In c#, Static Constructor is useful to perform a particular action only once throughout the application.
- If we declare a constructor as static, it will be invoked only once, irrespective of the number of class instances.
- It will be called automatically before the first instance is created.

The following are the properties of static constructor in the c# programming language.

```text
- The static constructor in c# won’t accept any parameters and access modifiers.
- The static constructor will invoke automatically whenever we create the first instance of a class.
- CLR will invoke the static constructor, so we don’t have control over the static constructor execution order in c#.
- In c#, only one static constructor is allowed to create.
```

- C# Static Constructor Syntax

```c#
class User
{
    // Static Constructor
    static User()
    {
       // Your Custom Code
    }
} 
```

```c#
using System;

namespace Tutlane
{
     class User
     {
        // Static Constructor
        static User()
        {
           Console.WriteLine("I am Static Constructor");
        }
        // Default Constructor
        public User()
        {
           Console.WriteLine("I am Default Constructor");
        }
     }
     class Program
     {
         static void Main(string[] args)
         {
             // Both Static and Default constructors will invoke for the first instance
             User user = new User();
             // Only the Default constructor will invoke
             User user1 = new User();
             Console.WriteLine("\nPress Enter Key to Exit..");
             Console.ReadLine();
         }
     }
}
```

> Executed endpoint many time but static cons called only one time.

![Static Constructor](/CSharp/Asset/static_constructor.png)

![static constructor](https://www.tutlane.com/images/csharp/csharp_static_constructor_example_result.PNG)

#### 5. C# Private Constructor

- It is useful in classes that contain only static members.
- If a class contains one or more private constructors and no public constructors, then the other classes are not allowed to create an instance for that particular class except nested classes.

```c#
public class PrivateConstUser
{
    public int Num1 { get; set; }
    public int Num2 { get; set; }
    public int Total { get; set; }
    public static string name, location;

    // Prevent an automatic generation of the default constructor
    private PrivateConstUser()
    {
        Console.WriteLine("I am private no parameter constructor");
    }

    private PrivateConstUser(string a)
    {
        Console.WriteLine("I am private pamaterized constructor, {0}", a);
    }

    PrivateConstUser(string a, int b)
    {
        Console.WriteLine("I am private pamaterized constructor, {0}:{1}", a, b);
    }

    public PrivateConstUser(int a, int b)
    {
        Num1 = a;
        Num2 = b;
        Total = a + b;
    }

    public PrivateConstUser(string a, string b)
    {
        name = a;
        location = b;
    }
}

//_______PRIVATE CONST_______
PrivateConstUser privateConst = new(2, 3);
PrivateConstUser privateConst2 = new("Keshav", "Dholpur");
Console.WriteLine($"Total a+b = {privateConst.Total}");
Console.WriteLine($"Name: {PrivateConstUser.name}, Location: {PrivateConstUser.location}");

/*Output:
Total a+b = 5
Name: Keshav, Location: Dholpur
*/
```

### C# Constructor Overloading

In c#, we can overload the constructor by creating another constructor with the same method name but with different parameters.

### C# Constructor Chaining

In c#, Constructor Chaining is an approach to invoke one constructor from another constructor. To achieve constructor chaining, we need to use _this_ keyword after our constructor definition.

```c#

using System;

namespace Tutlane
{
     class User
     {
         public User()
         {
             Console.Write("Hi, ");
         }
         public User(string a): this()
         {
             Console.Write(a);
         }
         public User(string a, string b): this("welcome")
         {
             Console.Write(a + " " + b);
         }
     }
     class Program
     {
        static void Main(string[] args)
        {
            User user1 = new User(" to", "tutlane");
            Console.WriteLine();
            Console.WriteLine("\nPress Enter Key to Exit..");
            Console.ReadLine();
        }
     }
} 

/*Output:
Hi, welcome to tutlane
*/
```

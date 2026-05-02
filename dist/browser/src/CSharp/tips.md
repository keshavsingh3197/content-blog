# Tips

## Pattern Matching

```c#
/// <summary>
/// Declaration Pattern
/// </summary>
public class PatternMatchings
{
    public void Run()
    {
        TypePattern();
        PropertyPattern();
        ListPattern();
        PositionalPattern();
        RelationalPattern(25);
        VarPattern();
        CombinedPattern();
        SwitchExpressionsWithPattern(21);
        ExtendedPatternsInLINQ();
    }

    /// <summary>
    /// 1. Type Patterns
    /// Type patterns are the simplest form of a declaration pattern.They check if an expression is of a specific type and, if so, declare a variable of that type.
    /// </summary>
    public void TypePattern()
    {
        object obj = "Hello, .NET 8!.(TypePattern)";
        if (obj is string message)
        {
            Console.WriteLine(message);
        }
    }

    /// <summary>
    /// 2. Property Patterns
    /// Property patterns allow you to match on specific properties of an object and declare variables for those properties.
    /// This is helpful when you want to check values deeply within complex objects.
    /// </summary>
    public void PropertyPattern()
    {
        var person = new { Name = "Alice", Age = 30, salary = 456 };
        if (person is { Name: "Join" or "Alice", Age: >= 18, salary: < 500 } adultPerson)
        {
            Console.WriteLine($"{adultPerson.Name} is an adult.(PropertyPattern)");  // Output: Alice is an adult.
        }
    }

    /// <summary>
    /// 3. List Patterns
    /// List patterns enable you to match on collections by specifying a pattern for each element, or using [_, ..] to represent arbitrary values or a range.
    /// </summary>
    public void ListPattern()
    {
        int[] numbers = { 1, 2, 9, 14, 26, 45 };

        if (numbers is [1, 2, _])
        {
            Console.WriteLine("The list starts with 1, 2");  // Output: The list starts with 1, 2
        }

        if (numbers is [_, > 1 and < 5, ..])
        {
            Console.WriteLine("2nd number in list is >1 and <5");  // Output: The list starts with 1, 2
        }

        if (numbers is [_, _, 9, .., 45])
        {
            Console.WriteLine("3rd number is 9 and last number is 45");  // Output: The list starts with 1, 2
        }

        Console.WriteLine(numbers is [1, 2, 9, 14, 26, 45] ? "All nmbers are matching." : "Numbers are not matching.");
        Console.WriteLine(numbers is [1, 2, 9, 14, 26, 45, 56] ? "All nmbers are matching." : "Numbers are not matching.");
    }

    /// <summary>
    /// 4. Positional Patterns
    /// Positional patterns work well with record types or any type that has deconstructors. 
    /// You can use this pattern to match on specific parts of an object directly.
    /// </summary>
    public void PositionalPattern()
    {
        // Here, Car is assumed to be a record or a class with a deconstructor.

        // class with a deconstructor
        var car = new Car(3, 4);
        Console.WriteLine(car is (3, 4) ? "Point is at (3, 4)" : "Point is not at (3, 4)");
        Console.WriteLine(car is (13, 44) ? "Point is at (3, 4)" : "Point is not at (3, 4)");

        // With record
        var point = new PointXY(7, 8);
        Console.WriteLine(point is (7, 8) ? "Point is at (7, 8)" : "Point is not at (7, 8)");
        Console.WriteLine(point is (8, 9) ? "Point is at (7, 8)" : "Point is not at (7, 8)");
    }

    /// <summary>
    /// 5. Relational Patterns
    /// With relational patterns, you can match variables against specific ranges or conditions using comparison operators.
    /// </summary>
    public void RelationalPattern(int age)
    {
        if (age is >= 18 and < 65)
        {
            Console.WriteLine("Adult not yet retired");  // Output: Adult not yet retired
        }
        else
        {
            Console.WriteLine("Adult retired");
        }
    }

    /// <summary>
    /// 6. Var Patterns
    /// `var` patterns allow you to capture a variable without type-checking, useful for capturing intermediate values or simplifying expressions.
    /// </summary>
    public void VarPattern()
    {
        object obj = "Hello, world!. (VarPattern)";
        if (obj is var anyObj)
        {
            Console.WriteLine(anyObj);  // Output: Hello, world!
        }
    }

    /// <summary>
    /// 7. Combined Patterns
    /// You can combine multiple patterns with logical operators (and, or, not) to create more complex matching logic.
    /// </summary>
    public void CombinedPattern()
    {
        var data = new { Name = "John", Age = 20 };
        if (data is { Name: "John" or "Jane", Age: >= 18 } person)
        {
            Console.WriteLine($"{person.Name} is an adult named John or Jane.");  // Output: John is an adult named John or Jane.
        }
    }

    /// <summary>
    /// 8. Switch Expressions with Patterns
    /// Pattern matching can also be used directly within switch expressions to provide concise and readable control flow based on types or values.
    /// </summary>
    public void SwitchExpressionsWithPattern(int age)
    {
        object shape = new Circle(5);
        var area = shape switch
        {
            Circle c => Math.PI * c.Radius * c.Radius,
            Rectangle r => r.Width * r.Height,
            _ => 0
        };
        Console.WriteLine($"Area: {area}");

        // 2nd
        var result = age switch
        {
            (< 5) => "child below 5 not allowed.",
            (> 5 and < 18) => "not eligible for marriage",
            (> 18 and < 30) => "eligible for marriage",
            _ => "Enjoy rest of your life"
        };
        Console.WriteLine(result);
    }

    /// <summary>
    /// 9. Extended Patterns in LINQ
    /// Pattern matching can also be used directly within switch expressions to provide concise and readable control flow based on types or values.
    /// </summary>
    public void ExtendedPatternsInLINQ()
    {
        var numbers = new List<object> { 1, "hello", 2.5, 3, 7 };
        var integers = numbers.OfType<int>()
                              .Where(n => n is > 0 and < 10);

        Console.WriteLine("ExtendedPatternsInLINQ: {0}", integers);
    }
}

public record PointXY(int x, int y);

public class Circle(int r)
{
    public readonly int Radius = r;
}
public class Car
{
    public int PointX { get; set; }
    public int PointY { get; set; }
    public Car(int x, int y)
    {
        PointX = x;
        PointY = y;
    }
    public void Deconstruct(out int x, out int y)
    {
        x = PointX;
        y = PointY;
    }
}
```

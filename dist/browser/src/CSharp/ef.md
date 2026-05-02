# EF

- Entity Framework Core is an open-source object-relational mapping (ORM) framework for .NET that enables developers to work with databases using .NET objects, eliminating the need for most of the data-access code that developers typically need to write.

## 2. What are the different approaches in Entity Framework?

> There are three approaches in Entity Framework:

- Database-First: Starts with an existing database, and EF generates the model based on the database schema.
- Model-First: Starts with creating a visual model, and EF generates both the database schema and the code based on the model.
- Code-First: Starts with writing code to define the model, and EF generates the database schema based on the model.

## 3. What are migrations in EF Core, and how do you use them?

Answer: Migrations in EF Core are a way to manage and apply changes to the database schema over time. They represent code-based schema changes and allow for versioning of the database. To use migrations, you typically run the following commands in the Package Manager Console or .NET CLI:

- `Add-Migration <MigrationName>` or `dotnet ef migrations add <MigrationName>`: This command scaffolds a migration, creating a new migration class with Up and Down methods that represent the changes to be applied to the database.
- `Update-Database` or `dotnet ef database update`: This command applies the pending migrations to the database.

---

## Lazy, Eager and Explicit loading

### Lazy Loading

- Lazy loading is delaying the loading of related data, until you specifically request for it. It is the opposite of eager loading.

> Package: Microsoft.EntityFrameworkCore.Proxies

```c#
// how to enable lazy loading:
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    optionsBuilder.UseLazyLoadingProxies().UseSqlServer(myConnectionString);
}

// navigation properties must be declared as `virtual`:
public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }
    public virtual List<Post> Posts { get; set; }
}

// When you access the `Posts` property, EF Core will automatically query the database to load the posts if they haven't been loaded already:

using (var context = new BloggingContext())
{
    var blog = context.Blogs.Single(b => b.BlogId == 1);
    var posts = blog.Posts; // Triggers a database query if Posts are not loaded
}

```

### Eager Loading  [opposite of lazy loading]

- Eager loading is the process whereby a query for one type of entity also loads related entities as part of the query, so that we don't need to execute a separate query for related entities. Eager loading is achieved using the `Include()` method.

```c#
using (var context = new BloggingContext())
{
    var blogs = context.Blogs.Include(b => b.Posts).ToList();
    // Posts are loaded along with blogs, no lazy loading required
}
```

### Explicit Loading

- Even with lazy loading disabled (in EF 6), it is still possible to lazily load related entities, but it must be done with an explicit call. Use the Load() method to load related entities explicitly.

```c#
using (var context = new BloggingContext())
{
    var blog = context.Blogs.Single(b => b.BlogId == 1);
    context.Entry(blog).Collection(b => b.Posts).Load(); // Explicitly loading the posts
    // Now the Posts collection is populated
}
```

In summary:

- Lazy Loading: Loads related entities on-demand when the navigation property is accessed. It can lead to the N+1 query problem if not managed carefully.
- Eager Loading: Loads related entities upfront using the `Include` method. This can result in complex queries and possibly retrieving more data than needed.
- Explicit Loading: Gives you control over when to load related entities by explicitly calling the `Load` method.

---

## IEnumerable & IQueryable

### IEnumerable

- `IEnumerable` is part of the `System.Collections` namespace. When you use an `IEnumerable`, you're working with an in-memory collection of objects. All filtering, ordering, and other query operations are done in the application's process. This means that when you're querying a database, the query is executed and the data is loaded into memory before any operations are performed.

```c#
IEnumerable<Product> products = context.Products
                                       .Where(p => p.Price > 100)
                                       .ToList(); // Database query happens here

var filteredProducts = products.Where(p => p.Name.StartsWith("B"))
                               .ToList(); // Filtering happens in memory
```

> In this example, the initial database query is executed when `ToList()` is called, and all products with a price greater than 100 are retrieved from the database. The second filtering operation (where the product name starts with "B") is performed in memory on the already retrieved data.

### IQueryable

- `IQueryable` is part of the `System.Linq` namespace and 
- is designed to work with out-of-process data sources, like a database.
- When you use an `IQueryable`, query operations like filtering and ordering are translated into the query language of the data source (for example, SQL for a relational database) and executed by the data source itself.

```c#
IQueryable<Product> products = context.Products
                                      .Where(p => p.Price > 100);

var filteredProducts = products.Where(p => p.Name.StartsWith("B"))
                               .ToList(); // Database query happens her
```

> In this example, no data is retrieved from the database until `ToList()` is called. At that point, both the price and name filters are translated into SQL and executed by the database. This can be more efficient, especially when working with large datasets, as only the filtered data is loaded into memory.

### Summary

- IEnumerable
  - Uses LINQ to Objects.
  - Executes query operations in memory.
  - Suitable for querying small collections and in-memory data.
  - Does not support lazy loading.

- IQueryable
  - Uses LINQ to Entities or LINQ to SQL.
  - Translates query operations into the query language of the data source (e.g., SQL).
  - Suitable for querying large datasets and databases.
  - Supports lazy loading, as the query execution is deferred until the data is actually needed (e.g., when calling `ToList` or enumerating the results).

---

## How do you handle concurrency in EF Core? with example nd diagram

- Concurrency control is essential when multiple users are accessing and modifying data to ensure data consistency.
- EF Core handles concurrency using optimistic concurrency control by including a property in the model that EF Core uses to detect concurrent updates.

### Example

> Let's assume we have an `Order` entity that includes a `Timestamp` property for concurrency checking:

```c#
public class Order
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; }
    public DateTime Date { get; set; }
    // Concurrency token for EF Core
    [Timestamp]
    public byte[] Timestamp { get; set; }
}
```

> The `[Timestamp]` attribute indicates that the `Timestamp` property is a concurrency token. EF Core uses this property to detect if the row has changed since it was retrieved. When an update is attempted, EF Core includes the original value of the `Timestamp` property in the `WHERE` clause of the `UPDATE` statement. If no rows are affected by the `UPDATE` (because the `Timestamp` has changed), EF Core throws a `DbUpdateConcurrencyException`.

### Diagram

```text
+---------------------------+
|          Order            |
+---------------------------+
| - OrderId: int            |
| - OrderNumber: string     |
| - Date: DateTime          |
| - Timestamp: byte[]       | <-- Concurrency token
+---------------------------+
```

### Handling Concurrency in Code

```c#
using (var context = new MyDbContext())
{
    try
    {
        // Retrieve an order by ID
        var order = context.Orders.Single(o => o.OrderId == 1);
        
        // Modify the order
        order.OrderNumber = "UpdatedOrderNumber";
        
        // Save changes
        context.SaveChanges();
    }
    catch (DbUpdateConcurrencyException ex)
    {
        // A concurrency exception is caught
        foreach (var entry in ex.Entries)
        {
            if (entry.Entity is Order)
            {
                // Here you can choose how to handle the concurrency conflict:
                // 1. Override the current values with the new values (client wins)
                // 2. Refresh the original values to reflect the current database values (database wins)
                // 3. Custom logic (merge changes, throw a custom exception, etc.)
                
                // As an example, let's override the current values (client wins)
                var currentValues = entry.CurrentValues;
                var databaseValues = entry.GetDatabaseValues();

                foreach (var property in currentValues.Properties)
                {
                    var currentValue = currentValues[property];
                    var databaseValue = databaseValues[property];

                    // TODO: Decide which value should be saved
                    currentValues[property] = currentValue; // Use client value
                }
                
                // Save the resolved values back to the database
                context.SaveChanges();
            }
            else
            {
                throw new NotSupportedException("Don't know how to handle concurrency conflicts for " + entry.Metadata.Name);
            }
        }
    }
}
```

> In the code above, when a concurrency conflict is detected, you have the option to handle it as you see fit. The example demonstrates how the client's changes can "win" by overriding the values in the database with the values from the client. Alternatively, you could refresh the values from the database or implement some logic to merge the changes.
=>
> Concurrency handling in EF Core ensures that data integrity is maintained even when multiple users or processes attempt to modify data concurrently. By using concurrency tokens, you can prevent the last-in-wins scenario and handle conflicts according to the needs of your application.

### How many way we can handle the concurrency issue

> In Entity Framework Core (EF Core), there are two primary ways to handle concurrency with built-in attributes and one additional way using Fluent API. Here's a summary:

#### 1. `[Timestamp]` Attribute

- The `[Timestamp]` attribute is used to designate a property as a concurrency token that EF Core will use for concurrency checks. It's typically applied to a `byte[]` property, and the database is responsible for generating and updating this value every time a row is updated.

```c#
public class MyEntity
{
    public int Id { get; set; }
    
    [Timestamp]
    public byte[] RowVersion { get; set; }
}
```

#### 2. `[ConcurrencyCheck]` Attribute

- The `[ConcurrencyCheck]` attribute is used to specify that a property should be included in the concurrency check during `UPDATE` and `DELETE` operations. Unlike the `[Timestamp]` attribute, it can be applied to properties of various data types, not just `byte[]`.

```c#
public class MyEntity
{
    public int Id { get; set; }
    
    [ConcurrencyCheck]
    public string SomeProperty { get; set; }
}
```

#### 3. Fluent API Configuration

- Fluent API provides another way to configure concurrency tokens in EF Core. You can use the `IsConcurrencyToken()` method to configure a property as a concurrency token in the `OnModelCreating` method of your `DbContext`.

```c#
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<MyEntity>()
        .Property(e => e.SomeProperty)
        .IsConcurrencyToken();
}
```

#### Additional Considerations

Beyond these methods, there are other considerations when working with concurrency:

- Database Support: Some databases have specific data types or mechanisms for handling concurrency (e.g., `rowversion` in SQL Server).
- Custom Concurrency Handling: While the above methods are provided by EF Core, developers can implement custom concurrency handling mechanisms. This might involve using other properties (e.g., a `LastUpdated` timestamp) and manually checking for concurrency conflicts in application logic.
- Handling Conflicts: When a concurrency conflict is detected (typically through a `DbUpdateConcurrencyException`), you must resolve it according to the needs of your application. This might involve refreshing the entity with database values, letting the user decide what to do, or implementing custom merging logic.

The `[Timestamp]` and `[ConcurrencyCheck]` attributes, along with Fluent API configuration, are the conventional ways provided by EF Core to handle concurrency, but developers are free to extend or customize this behavior as needed for their specific applications.

---

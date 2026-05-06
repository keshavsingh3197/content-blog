# Migration

## 🚀 Migrating Database First → Code First (Entity Framework Core)

### 🔹 Key Concept (Must Say in Interview)

> Database First → DB is source of truth  
> Code First → Code is source of truth  

✔ In both cases, we use:
- Models (Entities)
- DbContext  

But:
- DB First → Generated from DB  
- Code First → Written manually  

---

#### 🔹 Step 1: Existing Database Example

```sql
Employee
--------
Id (int)
Name (nvarchar)
Salary (decimal)
CreatedDate (datetime)
```

#### 🔹 Step 2: Create Models (Manually)

```c#
public class Employee
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Salary { get; set; }
    public DateTime CreatedDate { get; set; }
}
```

#### 🔹 Step 3: Create DbContext

```c#
public class AppDbContext : DbContext
{
    public DbSet<Employee> Employees { get; set; }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }
}
```

#### 🔹 Step 4: Configure Connection String

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.;Database=DevDb;Trusted_Connection=True;"
}
```

#### 🔹 Step 5: Register DbContext (.NET 6/7/8)

```c#
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
```

#### 🔹 Step 6: Create Baseline Migration (IMPORTANT)

```sh
Add-Migration InitialCreate -IgnoreChanges
```

> 👉 Why use -IgnoreChanges?
- Prevents EF from generating table creation scripts
- Avoids modifying existing database
- Creates an empty migration (baseline)

- Generated migration:

```c#
protected override void Up(MigrationBuilder migrationBuilder)
{
    // Empty
}

protected override void Down(MigrationBuilder migrationBuilder)
{
}
```

#### 🔹 Step 7: Apply Migration

```sh
Update-Database
```

> ✔ What happens:

- Creates __EFMigrationsHistory table
- Marks migration as applied
- DOES NOT change existing tables

#### 🔹 Step 8: Now You Are in Code First 🎯

> From here onward:

- Modify C# models
- Use migrations for DB changes

#### 🔹 Step 9: Example Change

- Add new property:

```c#
public string Department { get; set; }
```

- Run:

```sh
Add-Migration AddDepartment
Update-Database
```

- ✔ Column will be added to DB

#### 🔹 Key Interview Points ⭐

- Always match models with existing DB schema
- Use baseline migration (-IgnoreChanges)
- Avoid data loss
- Use migrations only for future changes

#### 🔹 Common Mistakes ❌
- Running Update-Database without baseline
- Schema mismatch between model & DB
- Ignoring constraints/indexes
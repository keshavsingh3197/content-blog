# Filter
Filters allow code to run before or after request processing stages in ASP.NET Core.
```
👉 Used for:

Authorization
Logging
Caching
Error handling

👉 Helps avoid duplicate code (cross-cutting concerns).
```

## 🔄 How Filters Work
- Run inside MVC pipeline (after action is selected)
- Called Filter Pipeline
```
Request → Middleware → Routing → Filters → Action → Response
```

## 🧩 Filter Types (Execution Order)

- Each filter type is executed at a different stage in the filter pipeline:

- 1. Authorization Filter
  - Runs first
  - Checks if user is allowed
  - Can stop request if unauthorized
- 2. Resource Filter
  - Runs after authorization
  - Executes:
    - Before model binding
    - After full pipeline
  - Used for caching / performance
- 3. Action Filter
  - Runs before & after action method
  - Can:
    - Modify inputs
    - Modify outputs
- 4. Exception Filter
  - Runs only when exception occurs
  - Handles unhandled errors globally
- 5. Result Filter
  - Runs before & after result execution
  - Runs only if action succeeds
  - Used for response formatting


### 📍 Where to Apply Filters

- 1. Global
```
builder.Services.AddControllers(options =>
{
    options.Filters.Add<GlobalFilter>();
});
```
- 2. Controller Level
```
[MyFilter]
public class HomeController : Controller
{
}
```
- 3. Action Level
```
[MyFilter]
public IActionResult Index()
{
    return View();
}
```

### ⚡ Key Points
- Filters run after routing, before action execution
- Multiple filters → execution order based on scope
- Can short-circuit request (stop pipeline early)

## 🧠 One-Line Summary
```
👉 Filters = Run logic before/after controller execution to handle common concerns
```
## References

- [https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters)

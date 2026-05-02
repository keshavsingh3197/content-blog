# Action Filter

- IActionFilter
- IAsyncActionFilter
- ActionFilterAttribute

## IActionFilter

- Type: `Synchronous`
- Methods:
    + `OnActionExecuting`(ActionExecutingContext context): Runs before the action method executes.
    + `OnActionExecuted`(ActionExecutedContext context): Runs after the action method executes.

- Usage: Implement this interface for synchronous operations that need to run before and after an action method.

Example:

```c#
public class MyActionFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        // Code to run before the action executes
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        // Code to run after the action executes
    }
}
```

## IAsyncActionFilter

- Type: `Asynchronous`
- Method:
    + `OnActionExecutionAsync`(ActionExecutingContext context, ActionExecutionDelegate next): Runs both before and after the action method executes.

- Usage: Implement this interface for asynchronous operations that need to run before and after an action method.

Example:

```C#
public class MyAsyncActionFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Code to run before the action executes
        await next(); // This calls the action method
        // Code to run after the action executes
    }
}
```

## ActionFilterAttribute

- Type: Can be `both synchronous and asynchronous`
- Inheritance: Inherits from Attribute, IActionFilter, IAsyncActionFilter, IResultFilter, IAsyncResultFilter, and IOrderedFilter.
- Methods:
    + `OnActionExecuting`(ActionExecutingContext context): Runs before the action method executes.
    + `OnActionExecuted`(ActionExecutedContext context): Runs after the action method executes.
    + `OnActionExecutionAsync`(ActionExecutingContext context, ActionExecutionDelegate next): Runs both before and after the action method executes.

- Usage: Use this class to create custom action filters that can be applied as attributes to controllers or actions. It provides a more convenient way to implement both synchronous and asynchronous logic.

Example:

```C#
public class MyActionFilterAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        // Code to run before the action executes
    }

    public override void OnActionExecuted(ActionExecutedContext context)
    {
        // Code to run after the action executes
    }

    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Code to run before the action executes
        await next(); // This calls the action method
        // Code to run after the action executes
    }
}
```

## Summary

- `IActionFilter`: For synchronous operations.
- `IAsyncActionFilter`: For asynchronous operations.
- `ActionFilterAttribute`: Combines both synchronous and asynchronous capabilities and can be used as an attribute for easier application.

## References

- [MSSDIN](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-8.0#action-filters)
using System.Text.Json;
using Blog.Admin.Api.Services;

namespace Blog.Admin.Api.Middleware;

/// <summary>
/// Converts exceptions to safe JSON responses. Expected auth errors map to their
/// status codes with a friendly message; everything else fails closed as a generic
/// 500 with no stack trace, path, or internal detail leaked to the caller.
/// </summary>
public sealed class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AuthException ex)
        {
            await WriteAsync(context, ex.StatusCode, ex.Message);
        }
        catch (UnauthorizedAccessException)
        {
            await WriteAsync(context, StatusCodes.Status401Unauthorized, "Not authenticated.");
        }
        catch (Exception ex)
        {
            // Log full detail server-side; return nothing sensitive to the client.
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);
            await WriteAsync(context, StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.");
        }
    }

    private static async Task WriteAsync(HttpContext context, int status, string message)
    {
        if (context.Response.HasStarted) return;
        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = message }));
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Blog.Admin.Api.Controllers;

internal static class ControllerExtensions
{
    /// <summary>The authenticated user's id from the "sub" claim (inbound mapping is disabled).</summary>
    public static string GetUserId(this ClaimsPrincipal principal) =>
        principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
        ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("Missing subject claim.");
}

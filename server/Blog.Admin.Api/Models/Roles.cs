namespace Blog.Admin.Api.Models;

/// <summary>
/// The fixed set of roles in the system. Access is default-deny: a user can do
/// nothing unless a role explicitly grants it (enforced by [Authorize(Roles = ...)]).
/// </summary>
public static class Roles
{
    public const string Admin = "Admin";     // Full control incl. user & role management.
    public const string Editor = "Editor";   // Manage content and media.
    public const string Viewer = "Viewer";   // Read-only access to the admin.

    public static readonly IReadOnlySet<string> All =
        new HashSet<string>(StringComparer.Ordinal) { Admin, Editor, Viewer };

    public static bool IsValid(string role) => All.Contains(role);
}

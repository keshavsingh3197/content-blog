using System.ComponentModel.DataAnnotations;

namespace Blog.Admin.Api.Dtos;

// ---- Users & roles ----

public sealed record CreateUserRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MaxLength(120)] string DisplayName,
    [property: Required, MinLength(12), MaxLength(256)] string Password,
    List<string>? Roles);

public sealed record UpdateUserRequest(
    [property: MaxLength(120)] string? DisplayName,
    List<string>? Roles,
    bool? IsActive);

public sealed record ResetPasswordRequest(
    [property: Required, MinLength(12), MaxLength(256)] string NewPassword);

public sealed record UserListItem(
    string Id,
    string Email,
    string DisplayName,
    IReadOnlyList<string> Roles,
    bool IsActive,
    bool TwoFactorEnabled,
    DateTime? LastLoginAt,
    DateTime CreatedAt);

// ---- Content ----

public sealed record CreateContentRequest(
    [property: Required, MaxLength(200)] string Title,
    [property: MaxLength(200)] string? Slug,
    [property: MaxLength(200)] string? Folder,
    string? Body,
    List<string>? Tags,
    int Order,
    bool Published);

public sealed record UpdateContentRequest(
    [property: MaxLength(200)] string? Title,
    [property: MaxLength(200)] string? Slug,
    [property: MaxLength(200)] string? Folder,
    string? Body,
    List<string>? Tags,
    int? Order,
    bool? Published);

public sealed record ContentListItem(
    string Id,
    string Title,
    string Slug,
    string Folder,
    IReadOnlyList<string> Tags,
    int Order,
    bool Published,
    DateTime UpdatedAt);

// ---- Media ----

public sealed record MediaListItem(
    string Id,
    string FileName,
    string ContentType,
    long Size,
    string Url,
    DateTime CreatedAt);

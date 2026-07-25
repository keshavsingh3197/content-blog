using System.ComponentModel.DataAnnotations;

namespace Blog.Admin.Api.Dtos;

// ---- Users & roles ----

public sealed record CreateUserRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [MaxLength(60)] string? Username,
    [Required, MaxLength(120)] string DisplayName,
    [Phone, MaxLength(20)] string? PhoneNumber,
    [Required, MinLength(12), MaxLength(256)] string Password,
    List<string>? Roles);

public sealed record UpdateUserRequest(
    [MaxLength(60)] string? Username,
    [MaxLength(120)] string? DisplayName,
    [Phone, MaxLength(20)] string? PhoneNumber,
    List<string>? Roles,
    bool? IsActive);

public sealed record ResetPasswordRequest(
    [Required, MinLength(12), MaxLength(256)] string NewPassword);

public sealed record UserListItem(
    string Id,
    string Email,
    string? Username,
    string DisplayName,
    string? PhoneNumber,
    IReadOnlyList<string> Roles,
    bool IsActive,
    bool TwoFactorEnabled,
    DateTime? LastLoginAt,
    DateTime CreatedAt);

// ---- Content ----

public sealed record CreateContentRequest(
    [Required, MaxLength(200)] string Title,
    [MaxLength(200)] string? Slug,
    [MaxLength(200)] string? Folder,
    string? Body,
    List<string>? Tags,
    int Order,
    bool Published);

public sealed record UpdateContentRequest(
    [MaxLength(200)] string? Title,
    [MaxLength(200)] string? Slug,
    [MaxLength(200)] string? Folder,
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

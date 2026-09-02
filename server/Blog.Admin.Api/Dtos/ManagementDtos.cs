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

// ---- Links ----

/// <summary>
/// What an anonymous caller gets from the public link list: what the blog needs to render a link
/// and nothing else. The stored document also carries who created/updated it and when, which is of
/// no use to a reader — so it is projected away rather than served to the world.
/// </summary>
public sealed record LinkDto(
    string Id,
    string Title,
    string Url,
    string? Category,
    string? Description,
    string? Icon,
    int Order);

public sealed record CreateLinkRequest(
    [Required, MaxLength(160)] string Title,
    [Required, Url, MaxLength(2048)] string Url,
    [MaxLength(60)] string? Category,
    [MaxLength(300)] string? Description,
    [MaxLength(60)] string? Icon,
    int Order,
    bool Visible);

public sealed record UpdateLinkRequest(
    [MaxLength(160)] string? Title,
    [Url, MaxLength(2048)] string? Url,
    [MaxLength(60)] string? Category,
    [MaxLength(300)] string? Description,
    [MaxLength(60)] string? Icon,
    int? Order,
    bool? Visible);

// ---- Media ----

public sealed record MediaListItem(
    string Id,
    string FileName,
    string ContentType,
    long Size,
    string Url,
    DateTime CreatedAt);

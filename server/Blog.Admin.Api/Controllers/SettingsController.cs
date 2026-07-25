using System.Text;
using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Models;
using Blog.Admin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Blog.Admin.Api.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize(Roles = Roles.Admin)]
public sealed class SettingsController : ControllerBase
{
    private readonly SettingsService _settings;
    public SettingsController(SettingsService settings) => _settings = settings;

    [HttpGet]
    public ActionResult<SettingsView> Get() => Ok(_settings.ToView());

    [HttpPut]
    public async Task<ActionResult<SettingsView>> Update(UpdateSettingsRequest request)
        => Ok(await _settings.ApplyAsync(request));

    /// <summary>Download a JSON backup. Secret fields stay AES-encrypted in the file.</summary>
    [HttpGet("export")]
    public IActionResult Export()
    {
        var bytes = Encoding.UTF8.GetBytes(_settings.ExportJson());
        return File(bytes, "application/json", "blog-admin-settings.json");
    }

    [HttpPost("import")]
    public async Task<ActionResult<SettingsView>> Import(ImportSettingsRequest request)
    {
        await _settings.ImportJsonAsync(request.Json);
        return Ok(_settings.ToView());
    }
}

public sealed record ImportSettingsRequest(string Json);

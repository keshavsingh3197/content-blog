using Blog.Admin.Api.Configuration;
using Microsoft.Extensions.Options;

namespace Blog.Admin.Api.Services;

/// <summary>
/// Periodically reloads the cached <see cref="AppSettings"/> from Mongo so settings edited by the
/// central admin console (or another API instance) converge on this process within the poll interval,
/// without stitching together a pub/sub bus. The writing path still refreshes its own cache
/// immediately; this bounds how stale an idle long-running instance can become.
/// </summary>
public sealed class SettingsRefreshService : BackgroundService
{
    private readonly SettingsService _settings;
    private readonly SettingsRefreshOptions _opts;
    private readonly ILogger<SettingsRefreshService> _logger;

    public SettingsRefreshService(SettingsService settings, IOptions<SettingsRefreshOptions> opts,
        ILogger<SettingsRefreshService> logger)
    {
        _settings = settings;
        _opts = opts.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(Math.Max(1, _opts.IntervalSeconds));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _settings.ReloadAsync();
            }
            catch (Exception ex)
            {
                // Keep serving the last-known-good cache; retry on the next tick.
                _logger.LogWarning(ex, "Settings refresh failed; keeping cached settings.");
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}

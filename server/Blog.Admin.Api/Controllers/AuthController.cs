using Blog.Admin.Api.Dtos;
using Blog.Admin.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Blog.Admin.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    public AuthController(AuthService auth) => _auth = auth;

    /// <summary>Step 1: verify email + password. May return a two-factor challenge.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
        => Ok(await _auth.LoginAsync(request));

    /// <summary>Step 2: verify a TOTP, email, or backup code and receive tokens.</summary>
    [HttpPost("2fa/verify")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthTokens>> VerifyTwoFactor(TwoFactorVerifyRequest request)
        => Ok(await _auth.VerifyTwoFactorAsync(request));

    /// <summary>Sends the email-fallback OTP for a pending two-factor session.</summary>
    [HttpPost("2fa/email/send")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> SendEmailOtp(SendEmailOtpRequest request)
    {
        await _auth.SendEmailOtpAsync(request);
        return Accepted(); // Do not reveal whether the mailbox exists.
    }

    /// <summary>Exchanges a valid refresh token for a fresh token pair (rotation).</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthTokens>> Refresh(RefreshRequest request)
        => Ok(await _auth.RefreshAsync(request.RefreshToken));

    /// <summary>Server-side session invalidation.</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(LogoutRequest request)
    {
        await _auth.LogoutAsync(User.GetUserId(), request.RefreshToken);
        return NoContent();
    }

    // ---- Authenticator enrollment (self-service, requires a valid session) ----

    [HttpPost("2fa/enroll/start")]
    [Authorize]
    public async Task<ActionResult<EnrollStartResponse>> StartEnrollment()
        => Ok(await _auth.StartEnrollmentAsync(User.GetUserId()));

    [HttpPost("2fa/enroll/confirm")]
    [Authorize]
    public async Task<ActionResult<EnrollConfirmResponse>> ConfirmEnrollment(EnrollConfirmRequest request)
        => Ok(await _auth.ConfirmEnrollmentAsync(User.GetUserId(), request.Code));

    [HttpPost("2fa/disable")]
    [Authorize]
    public async Task<IActionResult> DisableTwoFactor(DisableTwoFactorRequest request)
    {
        await _auth.DisableTwoFactorAsync(User.GetUserId(), request.Password);
        return NoContent();
    }
}

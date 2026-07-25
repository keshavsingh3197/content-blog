<#
  Seed an admin straight into MongoDB. Needs mongosh (MongoDB Shell) on PATH.
  The password hash is computed natively with .NET — no other dependencies.

  Usage:
    ./seed-admin.ps1 -Uri "<mongodb-uri>" -Email admin@keshavsingh.in -Password "a-strong-password" [-DisplayName "Keshav Singh"]
#>
param(
  [Parameter(Mandatory)][string]$Uri,
  [Parameter(Mandatory)][string]$Email,
  [Parameter(Mandatory)][string]$Password,
  [string]$DisplayName = "Administrator",
  [string]$Database = "blog_admin"
)

# PBKDF2-HMAC-SHA256, 210k iters, 16-byte salt, 32-byte key -> "iter.saltB64.keyB64"
$salt = [byte[]]::new(16)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
$kdf  = [Security.Cryptography.Rfc2898DeriveBytes]::new(
          $Password, $salt, 210000, [Security.Cryptography.HashAlgorithmName]::SHA256)
$hash = "210000.$([Convert]::ToBase64String($salt)).$([Convert]::ToBase64String($kdf.GetBytes(32)))"
$mail = $Email.ToLower()

# Upsert (won't overwrite an existing user's password).
$js = @"
db.getSiblingDB("$Database").users.updateOne(
  { Email: "$mail" },
  { `$setOnInsert: {
    Email:"$mail", DisplayName:"$DisplayName", PasswordHash:"$hash",
    Roles:["Admin"], MustChangePassword:false, TwoFactorEnabled:false,
    TotpSecretEncrypted:null, BackupCodeHashes:[], EmailOtpHash:null,
    EmailOtpExpiresAt:null, EmailOtpAttempts:0, IsActive:true,
    FailedLoginAttempts:0, LockoutUntil:null, LastLoginAt:null,
    CreatedAt:new Date(), UpdatedAt:new Date() } },
  { upsert: true })
"@

$js | mongosh $Uri --quiet
Write-Host "OK - seeded admin $mail (2FA off -> enrol on first login)"

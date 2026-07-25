#!/usr/bin/env bash
# Seed an admin straight into MongoDB. Needs: mongosh and python3 on PATH.
# Usage: ./seed-admin.sh "<mongodb-uri>" <email> <password> [displayName] [database]
set -euo pipefail

URI=${1:?mongodb uri required}
EMAIL=$(printf '%s' "${2:?email required}" | tr '[:upper:]' '[:lower:]')
PASS=${3:?password required}
NAME=${4:-Administrator}
DB=${5:-blog_admin}

# PBKDF2-HMAC-SHA256, 210k iters -> "iter.saltB64.keyB64" (matches the API).
HASH=$(python3 - "$PASS" <<'PY'
import sys, os, hashlib, base64
salt = os.urandom(16)
key = hashlib.pbkdf2_hmac('sha256', sys.argv[1].encode(), salt, 210000, 32)
print("210000." + base64.b64encode(salt).decode() + "." + base64.b64encode(key).decode())
PY
)

mongosh "$URI" --quiet --eval "
db.getSiblingDB('$DB').users.updateOne(
  { Email: '$EMAIL' },
  { \$setOnInsert: {
    Email:'$EMAIL', DisplayName:'$NAME', PasswordHash:'$HASH',
    Roles:['Admin'], MustChangePassword:false, TwoFactorEnabled:false,
    TotpSecretEncrypted:null, BackupCodeHashes:[], EmailOtpHash:null,
    EmailOtpExpiresAt:null, EmailOtpAttempts:0, IsActive:true,
    FailedLoginAttempts:0, LockoutUntil:null, LastLoginAt:null,
    CreatedAt:new Date(), UpdatedAt:new Date() } },
  { upsert: true })"

echo "OK - seeded admin $EMAIL (2FA off -> enrol on first login)"

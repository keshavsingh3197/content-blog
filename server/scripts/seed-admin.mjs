#!/usr/bin/env node
/**
 * Seed (or verify) an admin user directly in MongoDB — useful for bootstrapping
 * without going through the API's built-in seeder.
 *
 * It writes the password using the SAME scheme the API verifies:
 *   PBKDF2-HMAC-SHA256, 210,000 iterations, 16-byte salt, 32-byte key,
 *   stored as "iterations.saltBase64.hashBase64".
 *
 * Usage (args):
 *   node seed-admin.mjs "<mongodb-uri>" <email> <password> [displayName]
 *
 * Usage (env vars):
 *   MONGO_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] [MONGO_DB=blog_admin] \
 *   node seed-admin.mjs
 *
 * The new user starts WITHOUT 2FA so they are forced to enrol an authenticator
 * on first sign-in.
 */
import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL || process.argv[2];
const email = (process.env.ADMIN_EMAIL || process.argv[3] || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || process.argv[4];
const displayName = process.env.ADMIN_NAME || process.argv[5] || 'Administrator';
const dbName = process.env.MONGO_DB || 'blog_admin';

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  console.error('Usage: node seed-admin.mjs "<mongodb-uri>" <email> <password> [displayName]');
  console.error('   or set MONGO_URL / ADMIN_EMAIL / ADMIN_PASSWORD env vars.\n');
  process.exit(1);
}

if (!uri) fail('MongoDB connection string is required.');
if (!email || !email.includes('@')) fail('A valid admin email is required.');
if (!password || password.length < 12) fail('A password of at least 12 characters is required.');

/** Matches Blog.Admin.Api.Security.PasswordHasher. */
function hashPassword(pw) {
  const iterations = 210_000;
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(pw, salt, iterations, 32, 'sha256');
  return `${iterations}.${salt.toString('base64')}.${key.toString('base64')}`;
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const users = client.db(dbName).collection('users');

  // Ensure the unique email index exists (harmless if already there).
  await users.createIndex({ Email: 1 }, { unique: true, name: 'ux_user_email' });

  const existing = await users.findOne({ Email: email });
  if (existing) {
    // Don't clobber an existing account's password; just make sure it's an active Admin.
    await users.updateOne(
      { _id: existing._id },
      { $addToSet: { Roles: 'Admin' }, $set: { IsActive: true, UpdatedAt: new Date() } },
    );
    console.log(`\n✓ User ${email} already existed — ensured Admin role & active.`);
    console.log('  (Password left unchanged. Use the admin UI or delete the doc to reset it.)\n');
  } else {
    const now = new Date();
    await users.insertOne({
      Email: email,
      DisplayName: displayName,
      PasswordHash: hashPassword(password),
      Roles: ['Admin'],
      MustChangePassword: false,
      TwoFactorEnabled: false,     // forces authenticator enrolment on first login
      TotpSecretEncrypted: null,
      BackupCodeHashes: [],
      EmailOtpHash: null,
      EmailOtpExpiresAt: null,
      EmailOtpAttempts: 0,
      IsActive: true,
      FailedLoginAttempts: 0,
      LockoutUntil: null,
      LastLoginAt: null,
      CreatedAt: now,
      UpdatedAt: now,
    });
    console.log(`\n✓ Created admin ${email} in "${dbName}.users".`);
    console.log('  Sign in, then you will be required to set up two-factor auth.\n');
  }

  // Convenience: print fresh secrets you can paste into Render env vars.
  console.log('— Optional: fresh secrets for your backend env (set once, keep safe) —');
  console.log(`  Jwt__SigningKey     = ${crypto.randomBytes(48).toString('base64')}`);
  console.log(`  Encryption__DataKey = ${crypto.randomBytes(32).toString('base64')}\n`);
} catch (err) {
  fail(`MongoDB error: ${err.message}`);
} finally {
  await client.close();
}

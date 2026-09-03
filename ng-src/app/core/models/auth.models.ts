// Identity types issued by the central IdP (admin.keshavsingh.in).
//
// These live in core, not admin: the public site needs them too - signed-in
// commenting reads the session - and core must not depend on the admin feature.
//
// Role names are a cross-app contract shared with KeshavSingh.Core. Renaming one
// silently breaks authorization in every app in the family.

export type Role = 'Admin' | 'Editor' | 'Viewer';

export interface UserProfile {
  id: string;
  email: string;
  username?: string | null;
  displayName: string;
  roles: Role[];
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
}

/**
 * Session returned by the central IdP's /sso/session. No refresh token here — it lives only in
 * the HttpOnly SSO cookie.
 */
export interface SsoSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: UserProfile;
}

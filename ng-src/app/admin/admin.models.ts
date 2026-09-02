// Types shared across the admin UI. Mirror the API DTOs.
//
// Login, 2FA-enrollment and settings shapes used to live here. They belonged to endpoints this
// app no longer has — identity is the provider's, and the settings screen is gone.

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

export interface ContentListItem {
  id: string;
  title: string;
  slug: string;
  folder: string;
  tags: string[];
  order: number;
  published: boolean;
  updatedAt: string;
}

export interface ContentTopic extends ContentListItem {
  body: string;
}

export interface MediaListItem {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface Link {
  id: string;
  title: string;
  url: string;
  category?: string | null;
  description?: string | null;
  icon?: string | null;
  order: number;
  visible: boolean;
  updatedAt?: string;
}

// Types shared across the admin UI. Mirror the API DTOs.

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

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: UserProfile;
}

export interface LoginResponse {
  twoFactorRequired: boolean;
  twoFactorToken?: string;
  emailFallbackAvailable: boolean;
  smsFallbackAvailable: boolean;
  tokens?: AuthTokens;
}

export type TwoFactorMethod = 'Totp' | 'Email' | 'BackupCode' | 'Sms';

export interface EnrollStartResponse {
  secret: string;
  otpAuthUri: string;
  qrCodePngDataUrl: string;
}

export interface UserListItem {
  id: string;
  email: string;
  username?: string | null;
  displayName: string;
  phoneNumber?: string | null;
  roles: Role[];
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
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

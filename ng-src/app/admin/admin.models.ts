// Types shared across the admin UI. Mirror the API DTOs.
//
// Login, 2FA-enrollment and settings shapes used to live here. They belonged to endpoints this
// app no longer has — identity is the provider's, and the settings screen is gone.
//
// Identity types (Role, UserProfile, SsoSession) moved to core/models/auth.models.ts — the public
// site needs them as well, and core cannot depend on this feature. Re-exported here so admin code
// keeps importing them from one place.
export type { Role, UserProfile, SsoSession } from '../core/models/auth.models';

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

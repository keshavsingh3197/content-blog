import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../api.config';
import {
  ContentListItem, ContentTopic, Link, MediaListItem, Role, UserListItem,
} from '../admin.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private base = inject(API_BASE);

  // ---- Users & roles ----
  listUsers(): Observable<UserListItem[]> {
    return this.http.get<UserListItem[]>(`${this.base}/users`);
  }
  createUser(body: {
    email: string; username?: string | null; displayName: string;
    phoneNumber?: string | null; password: string; roles: Role[];
  }) {
    return this.http.post<UserListItem>(`${this.base}/users`, body);
  }
  updateUser(id: string, body: {
    username?: string | null; displayName?: string; phoneNumber?: string | null;
    roles?: Role[]; isActive?: boolean;
  }) {
    return this.http.put<UserListItem>(`${this.base}/users/${id}`, body);
  }
  resetPassword(id: string, newPassword: string) {
    return this.http.post<void>(`${this.base}/users/${id}/reset-password`, { newPassword });
  }
  deleteUser(id: string) {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }
  listRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.base}/roles`);
  }

  // ---- Content ----
  listContent(q?: string): Observable<ContentListItem[]> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<ContentListItem[]>(`${this.base}/content${query}`);
  }
  getContent(id: string): Observable<ContentTopic> {
    return this.http.get<ContentTopic>(`${this.base}/content/${id}`);
  }
  createContent(body: Partial<ContentTopic>) {
    return this.http.post<ContentTopic>(`${this.base}/content`, body);
  }
  updateContent(id: string, body: Partial<ContentTopic>) {
    return this.http.put<ContentTopic>(`${this.base}/content/${id}`, body);
  }
  deleteContent(id: string) {
    return this.http.delete<void>(`${this.base}/content/${id}`);
  }

  // ---- Media ----
  listMedia(): Observable<MediaListItem[]> {
    return this.http.get<MediaListItem[]>(`${this.base}/media`);
  }
  uploadMedia(file: File): Observable<MediaListItem> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MediaListItem>(`${this.base}/media`, form);
  }
  deleteMedia(id: string) {
    return this.http.delete<void>(`${this.base}/media/${id}`);
  }

  // ---- Links ----
  listLinks(): Observable<Link[]> {
    return this.http.get<Link[]>(`${this.base}/links?all=true`);
  }
  createLink(body: Partial<Link>) {
    return this.http.post<Link>(`${this.base}/links`, body);
  }
  updateLink(id: string, body: Partial<Link>) {
    return this.http.put<Link>(`${this.base}/links/${id}`, body);
  }
  deleteLink(id: string) {
    return this.http.delete<void>(`${this.base}/links/${id}`);
  }

  mediaUrl(url: string): string {
    // API returns a relative path like /api/media/{id}/raw; make it absolute.
    return url.startsWith('http') ? url : `${this.base.replace(/\/api$/, '')}${url}`;
  }
}

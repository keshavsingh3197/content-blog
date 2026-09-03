import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../../core/api.config';
import { ContentListItem, ContentTopic, Link, MediaListItem } from '../admin.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private base = inject(API_BASE);

  // No user, role or settings methods: those endpoints are gone from the API. Accounts and roles
  // are managed at the identity provider, which the console links out to.

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

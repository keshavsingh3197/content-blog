import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../api.config';

export interface Comment {
  id: string;
  path: string;
  displayName: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  /** True when the signed-in reader wrote this one — the UI offers edit and delete only then. */
  isMine: boolean;
}

export interface CommentThread {
  path: string;
  count: number;
  comments: Comment[];
}

/** A comment as a moderator sees it, including the ones readers cannot. */
export interface ModeratedComment {
  id: string;
  path: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  isHidden: boolean;
  isDeleted: boolean;
  hiddenReason: string | null;
}

export interface CommentBan {
  userId: string;
  displayName: string;
  reason: string | null;
  createdAt: string;
}

/**
 * Reader comments, served by the blog's own resource API.
 *
 * Reading a thread needs no account; posting needs a token from the identity provider, which a
 * person only holds once an admin has approved their account request. Bodies are plain text in both
 * directions — the component binds them through interpolation and never through `innerHTML`.
 *
 * Nothing here swallows errors: the comment form has to be able to tell the reader that their post
 * did not go through.
 */
@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_BASE);

  thread(path: string): Observable<CommentThread> {
    return this.http.get<CommentThread>(`${this.api}/comments`, { params: { path } });
  }

  post(path: string, body: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.api}/comments`, { path, body });
  }

  update(id: string, body: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.api}/comments/${id}`, { body });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/comments/${id}`);
  }

  // ---- Moderation (Admin) ----

  moderationList(path?: string, limit = 100): Observable<ModeratedComment[]> {
    const params: Record<string, string> = { limit: String(limit) };
    if (path) params['path'] = path;
    return this.http.get<ModeratedComment[]>(`${this.api}/comments/moderation`, { params });
  }

  hide(id: string, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.api}/comments/${id}/hide`, { reason: reason ?? null });
  }

  unhide(id: string): Observable<void> {
    return this.http.post<void>(`${this.api}/comments/${id}/unhide`, {});
  }

  bans(): Observable<CommentBan[]> {
    return this.http.get<CommentBan[]>(`${this.api}/comments/bans`);
  }

  ban(userId: string, reason?: string): Observable<CommentBan> {
    return this.http.post<CommentBan>(`${this.api}/comments/bans`, { userId, reason: reason ?? null });
  }

  unban(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/comments/bans/${userId}`);
  }
}

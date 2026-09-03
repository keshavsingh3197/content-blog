import { ApplicationConfig } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';
import { provideMarkdown } from 'ngx-markdown';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAnimations(),
    // Rendered markdown — including the admin preview bound with [data] — is sanitized by default:
    // ngx-markdown's default `sanitize` is SecurityContext.HTML, which runs DOMpurify over the HTML
    // before it is bound, so content cannot inject raw HTML/script. Left at that default on purpose
    // (the option is a DI token here, not a plain enum), so keep it default-on if this ever returns.
    provideMarkdown({ loader: HttpClient }),
  ]
};

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
import { CONFIG_KEYS, RuntimeConfigService } from '../../services/runtime-config.service';

/** A social link, from the `blog.social` config document. */
interface SocialLink {
  label: string;
  icon: string;
  url: string;
}

/**
 * A footer link. Either `path` (an in-site route, with optional `query`) or `url` (external) — never
 * both. `labelKey` is a translation key, so the link text follows the chosen language.
 */
interface FooterLink {
  labelKey: string;
  path?: string;
  query?: Record<string, string>;
  url?: string;
}

/** A titled group of footer links, from the `blog.footer.groups` config document. */
interface FooterGroup {
  titleKey: string;
  icon: string;
  links: FooterLink[];
}

/**
 * The site footer. Every piece of it is a runtime value: the copy comes from the translation
 * catalogue, and the link groups, social links and contact address from the config registry — so a
 * new footer link is an edit on the Localization screen, not a deploy.
 *
 * External URLs are bound through `[href]`, which Angular sanitises, so a configured link cannot
 * carry a `javascript:` payload even though an admin typed it.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="site-footer">
      <div class="footer-top">
        <div class="container">
          <div class="row">
            <div class="col-sm-6 col-lg-4 my-4">
              <h4 class="text-white fw-bold mb-3"><i class="fas fa-code me-2"></i>{{ brandName() }}</h4>
              <p class="text-white-65">{{ i18n.t('blog.footer.about') }}</p>
              <div class="nav footer-social-icons mt-3">
                <a *ngFor="let s of social()" [href]="s.url" target="_blank" rel="noopener"
                   [attr.aria-label]="s.label" [title]="s.label">
                  <i [ngClass]="s.icon"></i>
                </a>
              </div>
            </div>

            <div class="col-sm-6 col-lg-3 my-4" *ngFor="let group of groups()">
              <h5 class="text-white h6 mb-4"><i [ngClass]="group.icon" class="me-2"></i>{{ i18n.t(group.titleKey) }}</h5>
              <ul class="list-unstyled footer-links">
                <li *ngFor="let link of group.links">
                  <a *ngIf="link.path; else externalLink"
                     [routerLink]="[link.path]" [queryParams]="link.query">{{ i18n.t(link.labelKey) }}</a>
                  <ng-template #externalLink>
                    <a [href]="link.url" target="_blank" rel="noopener">{{ i18n.t(link.labelKey) }}</a>
                  </ng-template>
                </li>
              </ul>
            </div>

            <div class="col-sm-6 col-lg-3 my-4">
              <h5 class="text-white h6 mb-4"><i class="fas fa-envelope me-2"></i>{{ i18n.t('blog.footer.contact') }}</h5>
              <p class="text-white-65 mb-2">{{ i18n.t('blog.footer.reachOut') }}</p>
              <a [href]="'mailto:' + contactEmail()" class="text-white text-decoration-none">
                {{ contactEmail() }}
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container">
          <div class="row align-items-center py-3">
            <div class="col-md-6 text-center text-md-start">
              <p class="mb-0 text-white-65">
                &copy; {{ currentYear }}
                <a [href]="portfolioUrl()" class="text-white text-decoration-none fw-medium">{{ brandName() }}</a>.
                {{ i18n.t('blog.footer.rights') }}
              </p>
            </div>
            <div class="col-md-6 text-center text-md-end mt-2 mt-md-0">
              <small class="text-white-65">
                <i class="fas fa-heart text-danger"></i> {{ i18n.t('blog.footer.builtWith') }}
              </small>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  protected readonly i18n = inject(I18nService);
  private readonly config = inject(RuntimeConfigService);

  readonly currentYear = new Date().getFullYear();

  brandName(): string {
    return this.i18n.configText(CONFIG_KEYS.brandName, 'Content Blog');
  }

  /**
   * Config-driven, with an empty fallback: the seeded entries are the single source, and an empty
   * footer section makes a config problem visible rather than hiding it behind a stale copy.
   */
  social(): SocialLink[] {
    return this.config.json<SocialLink[]>(CONFIG_KEYS.blogSocial, []);
  }

  groups(): FooterGroup[] {
    return this.config.json<FooterGroup[]>(CONFIG_KEYS.blogFooterGroups, []);
  }

  contactEmail(): string {
    return this.config.text(CONFIG_KEYS.blogContactEmail);
  }

  portfolioUrl(): string {
    return this.config.text(CONFIG_KEYS.urlPortfolio, '/');
  }
}

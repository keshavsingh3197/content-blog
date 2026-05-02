import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
              <h4 class="text-white fw-bold mb-3"><i class="fas fa-code me-2"></i>Content Blog</h4>
              <p class="text-white-65">
                Comprehensive programming tutorials covering C#, Azure, AWS, Docker,
                Kubernetes, and modern development practices.
              </p>
              <div class="nav footer-social-icons mt-3">
                <a href="https://www.linkedin.com/in/keshavsingh4522/" target="_blank" rel="noopener" aria-label="LinkedIn">
                  <i class="fab fa-linkedin-in"></i>
                </a>
                <a href="https://github.com/keshavsingh4522" target="_blank" rel="noopener" aria-label="GitHub">
                  <i class="fab fa-github"></i>
                </a>
                <a href="https://x.com/Keshavsingh4522" target="_blank" rel="noopener" aria-label="X / Twitter">
                  <i class="fab fa-x-twitter"></i>
                </a>
                <a href="https://www.instagram.com/keshavsingh3197/" target="_blank" rel="noopener" aria-label="Instagram">
                  <i class="fab fa-instagram"></i>
                </a>
              </div>
            </div>
            <div class="col-sm-6 col-lg-2 my-4">
              <h5 class="text-white h6 mb-4"><i class="fas fa-book me-2"></i>Learn</h5>
              <ul class="list-unstyled footer-links">
                <li><a [routerLink]="['/file']" [queryParams]="{path:'src/CSharp/csharp.md'}">C# Programming</a></li>
                <li><a [routerLink]="['/file']" [queryParams]="{path:'src/Azure/azure.md'}">Azure Cloud</a></li>
                <li><a [routerLink]="['/file']" [queryParams]="{path:'src/AWS/aws.md'}">AWS Services</a></li>
                <li><a [routerLink]="['/file']" [queryParams]="{path:'src/SQL/sql.md'}">SQL Database</a></li>
              </ul>
            </div>
            <div class="col-sm-6 col-lg-3 my-4">
              <h5 class="text-white h6 mb-4"><i class="fas fa-tools me-2"></i>Tools &amp; Tech</h5>
              <ul class="list-unstyled footer-links">
                <li><a [routerLink]="['/file']" [queryParams]="{path:'src/GOF/GOF.md'}">Design Patterns</a></li>
                <li><a [routerLink]="['/file']" [queryParams]="{path:'src/Networking/network.md'}">Networking</a></li>
                <li><a href="https://www.keshavsingh.net" target="_blank" rel="noopener">Portfolio</a></li>
                <li><a href="https://github.com/keshavsingh4522/content-blog" target="_blank" rel="noopener">Source Code</a></li>
              </ul>
            </div>
            <div class="col-sm-6 col-lg-3 my-4">
              <h5 class="text-white h6 mb-4"><i class="fas fa-envelope me-2"></i>Contact</h5>
              <p class="text-white-65 mb-2">Feel free to reach out:</p>
              <a href="mailto:keshavsingh4522@gmail.com" class="text-white text-decoration-none">
                keshavsingh4522&#64;gmail.com
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
                <a href="https://www.keshavsingh.net" class="text-white text-decoration-none fw-medium">Keshav Singh</a>.
                All rights reserved.
              </p>
            </div>
            <div class="col-md-6 text-center text-md-end mt-2 mt-md-0">
              <small class="text-white-65">
                Built with <i class="fas fa-heart text-danger"></i> using Angular &amp; Bootstrap
              </small>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
}

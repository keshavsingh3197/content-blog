import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

/** How long `.reveal`'s transition runs, in ms. Must match the duration in `_animations.scss`. */
const REVEAL_DURATION = 500;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/**
 * Fade-and-lift an element the first time it scrolls into view.
 *
 * `IntersectionObserver` rather than a scroll handler: the callback fires only at the threshold
 * crossing, off the main scroll path, and the observer disconnects itself once the element has been
 * revealed — a reveal is a one-shot, and an element that re-hides on scroll-back reads as a bug.
 *
 * Three things make this safe to sprinkle across the page:
 *
 * - **Reduced motion is honoured up front.** The class is never applied, so there is no hidden
 *   starting state and nothing that could be left invisible.
 * - **It fails visible.** Where `IntersectionObserver` is missing, the element is revealed
 *   immediately rather than waiting for an observer that will never fire. An animation that does
 *   not run is a missing flourish; an element stuck at `opacity: 0` is missing content.
 * - **It cleans up after itself.** Once the transition has finished, both classes come off. The
 *   elements this is used on — cards, list rows — carry their own hover transition, and leaving
 *   `.reveal` in place would keep overriding it with the reveal's much slower one for the rest of
 *   the session. See the specificity note in `_animations.scss`.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Stagger, in milliseconds — pass the loop index times a step for a cascade down a card grid. */
  @Input('appReveal') delay: number | string = 0;

  private readonly element = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;
  private cleanupTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // Reduced motion: never apply the class, so there is no hidden starting state to animate away.
    if (prefersReducedMotion()) return;

    const node = this.element.nativeElement;
    // Applied imperatively rather than as a `[class.reveal]` host binding, because this directive
    // takes the class off again when the transition ends — and a host binding owns the class for
    // the element's lifetime, so the two would be fighting over it.
    node.classList.add('reveal');
    const ms = Number(this.delay);
    const delayMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;

    // Set through the CSSOM rather than a `[style.--reveal-delay]` binding: custom properties are
    // not part of the typed style-binding surface, so this keeps it out of the template contract.
    node.style.setProperty('--reveal-delay', `${delayMs}ms`);

    if (typeof IntersectionObserver === 'undefined') {
      this.reveal(node, delayMs);
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.disconnect();
          this.reveal(node, delayMs);
        }
      },
      // A small negative bottom margin means the reveal starts just before the element is fully in
      // view, so the reader sees it arrive rather than catching it mid-fade.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.disconnect();
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
  }

  private reveal(node: HTMLElement, delayMs: number): void {
    node.classList.add('reveal-in');

    // A timer rather than `transitionend`: that event fires once per animated property and does
    // not fire at all if the element is display:none when the transition would have started, both
    // of which leave the classes behind. The end state is identical to the element's own default,
    // so removing the classes is invisible.
    this.cleanupTimer = setTimeout(() => {
      node.classList.remove('reveal', 'reveal-in');
      node.style.removeProperty('--reveal-delay');
      this.cleanupTimer = undefined;
    }, delayMs + REVEAL_DURATION + 50);
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}

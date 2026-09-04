import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'blog.reader';

/** Text-size steps, as a multiplier on the article's base font size. */
export const TEXT_SCALES = [0.9, 1, 1.1, 1.25, 1.4] as const;

/** Measure steps, in `ch`. The middle value is the design default from `_tokens.scss`. */
export const MEASURE_STEPS = [72, 88, 105, 120, 140] as const;

interface StoredPrefs {
  textScale?: number;
  measure?: number;
}

/**
 * Per-reader typography for the article body: text size and line length.
 *
 * These are accessibility controls as much as taste ones — a 105-character measure is comfortable
 * on a desktop and punishing for someone who needs 140% text — and browser zoom is a blunt
 * substitute, because it scales the chrome and the code blocks along with the prose.
 *
 * Both values are applied as custom properties on `<html>`, so the stylesheet stays declarative:
 * `_markdown.scss` and `_content-layout.scss` read `--reader-text-scale` and `--reader-measure`
 * and need no knowledge of this service. Storage is guarded the same way {@link ThemeService} is.
 */
@Injectable({ providedIn: 'root' })
export class ReaderPrefsService {
  readonly textScale = signal<number>(1);
  readonly measure = signal<number>(105);

  /** True while either value differs from the design default — the reset control keys off this. */
  readonly isCustomised = () => this.textScale() !== 1 || this.measure() !== 105;

  constructor() {
    const stored = read();
    if (stored.textScale !== undefined) this.textScale.set(nearest(stored.textScale, TEXT_SCALES));
    if (stored.measure !== undefined) this.measure.set(nearest(stored.measure, MEASURE_STEPS));

    effect(() => {
      const root = document.documentElement;
      root.style.setProperty('--reader-text-scale', String(this.textScale()));
      // Only override the responsive default when the reader has actually chosen a width; at the
      // default the breakpoint ladder in _reset.scss should keep widening the measure on large
      // displays, which a hardcoded value here would freeze.
      if (this.measure() === 105) root.style.removeProperty('--reader-measure');
      else root.style.setProperty('--reader-measure', `${this.measure()}ch`);

      write({ textScale: this.textScale(), measure: this.measure() });
    });
  }

  /** Move the text size by `delta` steps, clamped to the ends of the scale. */
  stepText(delta: number): void {
    this.textScale.set(step(this.textScale(), TEXT_SCALES, delta));
  }

  stepMeasure(delta: number): void {
    this.measure.set(step(this.measure(), MEASURE_STEPS, delta));
  }

  reset(): void {
    this.textScale.set(1);
    this.measure.set(105);
  }
}

/** The value `steps` places away from `current`, stopping at either end rather than wrapping. */
function step(current: number, steps: readonly number[], delta: number): number {
  const index = steps.indexOf(nearest(current, steps));
  return steps[Math.min(steps.length - 1, Math.max(0, index + delta))];
}

/** The closest allowed value, so a hand-edited storage entry cannot set an arbitrary size. */
function nearest(value: number, steps: readonly number[]): number {
  return steps.reduce((best, candidate) =>
    Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best
  );
}

function read(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const { textScale, measure } = parsed as StoredPrefs;
    return {
      textScale: typeof textScale === 'number' && Number.isFinite(textScale) ? textScale : undefined,
      measure: typeof measure === 'number' && Number.isFinite(measure) ? measure : undefined,
    };
  } catch {
    return {};
  }
}

function write(prefs: StoredPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Not persistable in this browser; the choice still applies for the session.
  }
}

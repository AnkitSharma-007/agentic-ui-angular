import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Marked } from 'marked';

// Two-layer defence: marked is configured without raw-HTML passthrough,
// and the output is bound via [innerHTML] so Angular's DomSanitizer runs.
const renderer = new Marked({ gfm: true, breaks: true });

@Component({
  selector: 'app-markdown',
  template: `<div class="md" [innerHTML]="rendered()"></div>`,
  styleUrl: './markdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownComponent {
  readonly source = input.required<string>();

  // rAF-coalesced commit of `source` so a streaming response doesn't re-parse
  // the entire cumulative buffer on every token (O(n²) → ~60Hz).
  private readonly throttledSource = signal<string>('');
  protected readonly rendered = computed<string>(
    () => renderer.parse(this.throttledSource(), { async: false }) as string,
  );

  constructor() {
    // First tick is synchronous so initial mount + tests render immediately.
    let synchronous = true;
    let rafHandle: number | null = null;

    effect(() => {
      const src = this.source();
      if (synchronous) {
        synchronous = false;
        this.throttledSource.set(src);
        return;
      }
      if (rafHandle !== null) return;
      rafHandle = requestAnimationFrame(() => {
        rafHandle = null;
        this.throttledSource.set(this.source());
      });
    });

    inject(DestroyRef).onDestroy(() => {
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
    });
  }
}

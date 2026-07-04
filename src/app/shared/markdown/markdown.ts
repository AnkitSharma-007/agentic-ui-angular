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
import { Marked, type Tokens } from 'marked';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only schemes that can't execute script. URLs with no scheme (relative,
// anchors, protocol-relative) pass through; a scheme not in this set (e.g.
// javascript:, data:, vbscript:) makes the link unsafe.
const SAFE_LINK_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
function safeHref(raw: string): string | null {
  const href = raw.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1]?.toLowerCase();
  if (scheme && !SAFE_LINK_SCHEMES.has(scheme)) return null;
  return href;
}

// Defence-in-depth: model output is fully attacker-influenceable, so we don't
// rely on Angular's [innerHTML] DomSanitizer alone. marked is configured to
// render raw HTML as inert escaped text (never parsed) and to drop links with
// an unsafe scheme, adding rel="noopener noreferrer" + target to the rest.
const renderer = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html(token: Tokens.HTML | Tokens.Tag): string {
      return escapeHtml(token.text);
    },
    link(token: Tokens.Link): string {
      const text = this.parser.parseInline(token.tokens);
      const href = safeHref(token.href);
      if (href === null) return text; // unsafe scheme: keep the text, drop the link
      const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
      return `<a href="${escapeHtml(href)}"${title} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

// Exported so the hardening can be unit-tested against marked's raw output,
// before Angular's sanitizer runs on the bound [innerHTML].
export function renderMarkdown(source: string): string {
  return renderer.parse(source, { async: false }) as string;
}

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
  protected readonly rendered = computed<string>(() => renderMarkdown(this.throttledSource()));

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

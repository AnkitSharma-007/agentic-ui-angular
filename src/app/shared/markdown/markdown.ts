import { Component, computed, input } from '@angular/core';
import { Marked, type Tokens } from 'marked';
import { coalesceWithRaf } from '../util/raf-coalesce';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Allow only non-script schemes; relative/anchor URLs pass, others (javascript:, data:) are unsafe.
const SAFE_LINK_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
function safeHref(raw: string): string | null {
  const href = raw.trim();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1]?.toLowerCase();
  if (scheme && !SAFE_LINK_SCHEMES.has(scheme)) return null;
  return href;
}

// Defence-in-depth on attacker-influenceable model output: escape raw HTML, drop unsafe links, harden safe ones.
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

// Exported for unit tests against marked output before Angular's [innerHTML] sanitizer.
export function renderMarkdown(source: string): string {
  return renderer.parse(source, { async: false }) as string;
}

@Component({
  selector: 'app-markdown',
  template: `<div class="md" [innerHTML]="rendered()"></div>`,
  styleUrl: './markdown.scss',
})
export class MarkdownComponent {
  readonly source = input.required<string>();

  // rAF-coalesced source commits avoid O(n²) re-parsing on every streaming token.
  private readonly throttledSource = coalesceWithRaf(() => this.source(), '');
  protected readonly rendered = computed<string>(() => renderMarkdown(this.throttledSource()));
}

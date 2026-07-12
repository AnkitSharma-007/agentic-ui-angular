import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MarkdownComponent, renderMarkdown } from './markdown';

describe('MarkdownComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renders headings, code, and links from markdown', async () => {
    const fixture = TestBed.createComponent(MarkdownComponent);
    fixture.componentRef.setInput('source', '# Hello\n\nA `code` snippet and [link](https://example.com).');
    await fixture.whenStable();

    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toMatch(/<h1[^>]*>Hello/);
    expect(html).toContain('<code>code</code>');
    expect(html).toMatch(/<a [^>]*href="https:\/\/example.com"/);
  });

  it('renders blockquotes', async () => {
    const fixture = TestBed.createComponent(MarkdownComponent);
    fixture.componentRef.setInput('source', '> quoted');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).innerHTML).toMatch(/<blockquote/);
  });

  it('does not execute raw HTML in the source', async () => {
    const fixture = TestBed.createComponent(MarkdownComponent);
    fixture.componentRef.setInput('source', 'before <script>alert(1)</script> after');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).innerHTML.toLowerCase()).not.toContain(
      '<script',
    );
  });

  it('neutralizes an event-handler image and javascript: link end-to-end', async () => {
    const fixture = TestBed.createComponent(MarkdownComponent);
    fixture.componentRef.setInput(
      'source',
      '<img src=x onerror="alert(1)"> and [tap](javascript:alert(1))',
    );
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    const jsAnchors = Array.from(el.querySelectorAll('a')).filter((a) =>
      a.getAttribute('href')?.toLowerCase().startsWith('javascript:'),
    );
    expect(jsAnchors).toEqual([]);
  });
});

describe('renderMarkdown — hardening (H3)', () => {
  it('renders raw HTML as inert escaped text, not parsed markup', () => {
    const out = renderMarkdown('before <script>alert(1)</script> after');
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;script&gt;');
  });

  it('escapes an onerror image payload instead of emitting an <img>', () => {
    const out = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(out.toLowerCase()).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });

  it('drops a javascript: link but keeps its text', () => {
    const out = renderMarkdown('[click me](javascript:alert(1))');
    expect(out).not.toContain('javascript:');
    expect(out).not.toMatch(/<a\s/);
    expect(out).toContain('click me');
  });

  it('drops a data:text/html link', () => {
    const out = renderMarkdown('[x](data:text/html,<script>alert(1)</script>)');
    expect(out).not.toContain('href="data:');
    expect(out).not.toMatch(/<a\s/);
  });

  it('adds rel="noopener noreferrer" + target to safe links', () => {
    const out = renderMarkdown('[safe](https://example.com)');
    expect(out).toMatch(/<a [^>]*href="https:\/\/example\.com"/);
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it('preserves inline formatting inside a safe link', () => {
    const out = renderMarkdown('[**bold**](https://example.com)');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('allows relative and anchor links', () => {
    expect(renderMarkdown('[a](/docs)')).toMatch(/href="\/docs"/);
    expect(renderMarkdown('[b](#section)')).toMatch(/href="#section"/);
  });
});

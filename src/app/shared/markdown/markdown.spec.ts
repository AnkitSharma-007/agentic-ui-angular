import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MarkdownComponent } from './markdown';

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
    // Angular's DomSanitizer strips <script>; the rendered HTML should not
    // contain an executable script tag.
    expect((fixture.nativeElement as HTMLElement).innerHTML.toLowerCase()).not.toContain(
      '<script',
    );
  });
});

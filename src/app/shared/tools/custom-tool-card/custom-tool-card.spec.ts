import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { CustomToolCardComponent } from './custom-tool-card';

describe('CustomToolCardComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('falls back to "Custom tool" when no result is supplied', async () => {
    const fixture = TestBed.createComponent(CustomToolCardComponent);
    fixture.componentRef.setInput('args', { text: 'hi', lang: 'fr' });
    fixture.componentRef.setInput('status', 'running');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Custom tool');
    expect(fixture.nativeElement.textContent).toContain('Running');
  });

  it('renders the toolName + description from the result', async () => {
    const fixture = TestBed.createComponent(CustomToolCardComponent);
    fixture.componentRef.setInput('args', { text: 'hi' });
    fixture.componentRef.setInput('status', 'complete');
    fixture.componentRef.setInput('result', {
      toolName: 'translate',
      toolDescription: 'Translate text.',
      args: { text: 'hi' },
      response: { translated: 'salut' },
    });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('translate');
    expect(fixture.nativeElement.textContent).toContain('Translate text.');
    expect(fixture.nativeElement.textContent).toContain('salut');
  });

  it('renders args as a key/value list', async () => {
    const fixture = TestBed.createComponent(CustomToolCardComponent);
    fixture.componentRef.setInput('args', { count: 42, isEnabled: true });
    fixture.componentRef.setInput('status', 'running');
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('count');
    expect(text).toContain('42');
    expect(text).toContain('isEnabled');
    expect(text).toContain('true');
  });

  it('renders the error state with the supplied message', async () => {
    const fixture = TestBed.createComponent(CustomToolCardComponent);
    fixture.componentRef.setInput('args', {});
    fixture.componentRef.setInput('status', 'error');
    fixture.componentRef.setInput('errorMessage', 'Schema mismatch');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Schema mismatch');
  });

  it('renders an array response as a titled list instead of raw JSON', async () => {
    const fixture = TestBed.createComponent(CustomToolCardComponent);
    fixture.componentRef.setInput('args', { city: 'Goa' });
    fixture.componentRef.setInput('status', 'complete');
    fixture.componentRef.setInput('result', {
      toolName: 'searchRestaurants',
      response: [
        { name: 'Vinayak Family Restaurant', cuisine: 'Goan Seafood', priceRange: '400-800' },
        { name: 'Gunpowder', cuisine: 'South Indian' },
      ],
    });
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    // Title surfaced as a heading, fields as key/value rows.
    expect(text).toContain('Vinayak Family Restaurant');
    expect(text).toContain('cuisine');
    expect(text).toContain('Goan Seafood');
    expect(text).toContain('Gunpowder');
    // Raw JSON is hidden behind a toggle, not shown by default.
    expect(text).toContain('Show raw JSON');
    expect(fixture.nativeElement.querySelector('pre.response')).toBeNull();
  });

  it('reveals raw JSON when the toggle is clicked', async () => {
    const fixture = TestBed.createComponent(CustomToolCardComponent);
    fixture.componentRef.setInput('args', {});
    fixture.componentRef.setInput('status', 'complete');
    fixture.componentRef.setInput('result', {
      response: { temperature: 29, unit: 'C' },
    });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('pre.response')).toBeNull();

    const toggle = fixture.nativeElement.querySelector('.raw-toggle') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    toggle.click();
    await fixture.whenStable();

    const pre = fixture.nativeElement.querySelector('pre.response') as HTMLElement;
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('temperature');
    expect(pre.textContent).toContain('29');
  });

  it('renders a nested array-of-objects field as a list, not raw JSON', async () => {
    const fixture = TestBed.createComponent(CustomToolCardComponent);
    fixture.componentRef.setInput('args', { city: 'Goa', type: 'Vegan' });
    fixture.componentRef.setInput('status', 'complete');
    fixture.componentRef.setInput('result', {
      toolName: 'searchVegetarianDining',
      response: {
        city: 'Goa',
        spots: [
          { name: 'Bean Me Up', type: 'Vegan', specialty: 'Tofu Scramble', rating: 4.7 },
          { name: 'Zest Café', type: 'Vegan-friendly', rating: 4.8 },
        ],
      },
    });
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    // Top-level scalar + nested list items are all humanised.
    expect(text).toContain('city');
    expect(text).toContain('spots');
    expect(text).toContain('Bean Me Up');
    expect(text).toContain('Tofu Scramble');
    expect(text).toContain('Zest Café');
    // The nested array must NOT be dumped as a raw JSON blob by default.
    expect(text).not.toContain('{"name"');
    expect(fixture.nativeElement.querySelector('pre.response')).toBeNull();
  });

  it('renders a primitive response as plain text', async () => {
    const fixture = TestBed.createComponent(CustomToolCardComponent);
    fixture.componentRef.setInput('args', {});
    fixture.componentRef.setInput('status', 'complete');
    fixture.componentRef.setInput('result', { response: 'All systems nominal.' });
    await fixture.whenStable();

    const el = fixture.nativeElement.querySelector('.response-text') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.textContent).toContain('All systems nominal.');
  });
});

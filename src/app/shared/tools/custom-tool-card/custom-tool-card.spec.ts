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
});

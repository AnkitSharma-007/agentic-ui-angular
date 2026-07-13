import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelPickerCardComponent } from './model-picker-card';
import { GeminiService } from '../../../core/services/gemini.service';

interface ModelPickerInternals {
  selectModel(
    id: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite',
  ): void;
}

describe('ModelPickerCardComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('selectModel delegates to GeminiService', async () => {
    const gemini = TestBed.inject(GeminiService);
    const select = vi.spyOn(gemini, 'selectModel');

    const fixture = TestBed.createComponent(ModelPickerCardComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ModelPickerInternals;
    inst.selectModel('gemini-3.1-pro-preview');
    expect(select).toHaveBeenCalledWith('gemini-3.1-pro-preview');
  });
});

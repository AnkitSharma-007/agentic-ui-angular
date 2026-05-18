import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingComponent } from './onboarding';
import { GeminiService } from '../../core/services/gemini.service';
import { ApiKeyService } from '../../core/services/api-key.service';

interface OnboardingInternals {
  readonly candidateKey: { set: (v: string) => void };
  readonly remember: { set: (v: boolean) => void };
  readonly passphrase: { set: (v: string) => void };
  readonly passphraseConfirm: { set: (v: string) => void };
  readonly canTest: () => boolean;
  readonly canSave: () => boolean;
  test(): Promise<void>;
  save(): Promise<void>;
  statusKind: string;
  errorMessage: string | null;
}

describe('OnboardingComponent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders the setup mode by default', async () => {
    const fixture = TestBed.createComponent(OnboardingComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeDefined();
  });

  it('canTest is false until a key is entered', async () => {
    const fixture = TestBed.createComponent(OnboardingComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as OnboardingInternals;
    expect(inst.canTest()).toBe(false);
    inst.candidateKey.set('sk-1234');
    expect(inst.canTest()).toBe(true);
  });

  it('canSave gates passphrase length and confirmation when remember=true', async () => {
    const fixture = TestBed.createComponent(OnboardingComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as OnboardingInternals;

    inst.candidateKey.set('sk-1234');
    expect(inst.canSave()).toBe(true);

    inst.remember.set(true);
    expect(inst.canSave()).toBe(false);

    inst.passphrase.set('short');
    inst.passphraseConfirm.set('short');
    expect(inst.canSave()).toBe(false);

    inst.passphrase.set('longenough');
    inst.passphraseConfirm.set('different');
    expect(inst.canSave()).toBe(false);

    inst.passphraseConfirm.set('longenough');
    expect(inst.canSave()).toBe(true);
  });

  it('test() resolves to tested-ok on success', async () => {
    const gemini = TestBed.inject(GeminiService);
    vi.spyOn(gemini, 'testConnection').mockResolvedValue(true);

    const fixture = TestBed.createComponent(OnboardingComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as OnboardingInternals;

    inst.candidateKey.set('sk-1234');
    await inst.test();
    expect(inst.statusKind).toBe('tested-ok');
  });

  it('test() surfaces a humanised error on failure', async () => {
    const gemini = TestBed.inject(GeminiService);
    vi.spyOn(gemini, 'testConnection').mockRejectedValue(new Error('401 unauthorized'));

    const fixture = TestBed.createComponent(OnboardingComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as OnboardingInternals;

    inst.candidateKey.set('sk-1234');
    await inst.test();
    expect(inst.statusKind).toBe('error');
    expect(inst.errorMessage).toMatch(/Authentication failed/);
  });

  it('save() (session mode) stores the key in ApiKeyService', async () => {
    const apiKey = TestBed.inject(ApiKeyService);

    const fixture = TestBed.createComponent(OnboardingComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as OnboardingInternals;

    inst.candidateKey.set('sk-1234');
    await inst.save();

    expect(apiKey.key()).toBe('sk-1234');
    expect(apiKey.storage()).toBe('session');
  });
});

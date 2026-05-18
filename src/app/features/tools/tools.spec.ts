import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolsComponent } from './tools';
import { CustomToolsService } from '../../core/custom-tools/custom-tools.service';

// `templatePreview` is rAF-coalesced. We flush Angular's effect queue first
// (so the component schedules its rAF) and then wait a frame for the commit.
async function flushPreviewFrame(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

interface ToolsInternals {
  readonly name: { (): string; set: (v: string) => void };
  readonly description: { (): string; set: (v: string) => void };
  readonly parameters: { (): readonly { name: string; type: string }[]; set: (v: readonly unknown[]) => void };
  readonly responseTemplate: { (): string; set: (v: string) => void };
  readonly nameError: () => string | null;
  readonly canSave: () => boolean;
  readonly templatePreview: () => { ok: boolean; text: string };
  addParameter(): void;
  removeParameter(idx: number): void;
  updateParameterName(idx: number, value: string): void;
  loadExample(): void;
  save(): Promise<void>;
}

describe('ToolsComponent', () => {
  beforeEach(() => {
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('starts in a non-saveable state', async () => {
    const fixture = TestBed.createComponent(ToolsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ToolsInternals;
    expect(inst.canSave()).toBe(false);
  });

  it('addParameter / removeParameter mutate the parameter list', async () => {
    const fixture = TestBed.createComponent(ToolsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ToolsInternals;
    inst.addParameter();
    inst.addParameter();
    expect(inst.parameters()).toHaveLength(2);
    inst.removeParameter(0);
    expect(inst.parameters()).toHaveLength(1);
  });

  it('nameError flags invalid identifiers', async () => {
    const fixture = TestBed.createComponent(ToolsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ToolsInternals;
    inst.name.set('1bad');
    expect(inst.nameError()).toMatch(/Letters, digits/);
    inst.name.set('translate');
    expect(inst.nameError()).toBeNull();
  });

  it('templatePreview substitutes sample values for declared parameters', async () => {
    const fixture = TestBed.createComponent(ToolsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ToolsInternals;
    inst.addParameter();
    inst.updateParameterName(0, 'city');
    inst.responseTemplate.set('{"q": {{city}}}');
    await flushPreviewFrame(fixture);
    const preview = inst.templatePreview();
    expect(preview.ok).toBe(true);
    expect(preview.text).toContain('example');
  });

  it('loadExample populates a complete fixture', async () => {
    const fixture = TestBed.createComponent(ToolsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ToolsInternals;
    inst.loadExample();
    await flushPreviewFrame(fixture);
    expect(inst.name()).toBe('searchWeather');
    expect(inst.parameters().length).toBeGreaterThan(0);
    expect(inst.canSave()).toBe(true);
  });

  it('save() forwards a built spec to CustomToolsService.save', async () => {
    const service = TestBed.inject(CustomToolsService);
    const save = vi.spyOn(service, 'save').mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(ToolsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ToolsInternals;
    inst.loadExample();
    await flushPreviewFrame(fixture);
    await inst.save();

    expect(save).toHaveBeenCalledOnce();
    const spec = save.mock.calls[0][0];
    expect(spec.name).toBe('searchWeather');
    expect(spec.parameters.length).toBe(2);
  });

  it('renders the storage-unavailable banner and hides the editor when IDB is blocked', async () => {
    const service = TestBed.inject(CustomToolsService);
    (service as unknown as { _unavailable: { set: (v: boolean) => void } })._unavailable.set(true);

    const fixture = TestBed.createComponent(ToolsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.unavailable-card')).not.toBeNull();
    expect(host.querySelector('.layout')).toBeNull();
  });
});

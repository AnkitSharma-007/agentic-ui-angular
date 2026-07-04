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

interface BuilderForm {
  name: string;
  description: string;
  parameters: { name: string; type: string; description: string; required: boolean }[];
  responseTemplate: string;
}

interface ToolsInternals {
  readonly builderModel: {
    (): BuilderForm;
    set: (v: BuilderForm) => void;
    update: (fn: (m: BuilderForm) => BuilderForm) => void;
  };
  readonly nameError: () => string | null;
  readonly canSave: () => boolean;
  readonly templatePreview: () => { ok: boolean; text: string };
  addParameter(): void;
  removeParameter(idx: number): void;
  loadExample(): void;
  save(): Promise<void>;
}

function patchBuilder(inst: ToolsInternals, next: Partial<BuilderForm>): void {
  inst.builderModel.update((m) => ({ ...m, ...next }));
}

function setParamName(inst: ToolsInternals, index: number, name: string): void {
  inst.builderModel.update((m) => ({
    ...m,
    parameters: m.parameters.map((p, i) => (i === index ? { ...p, name } : p)),
  }));
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
    expect(inst.builderModel().parameters).toHaveLength(2);
    inst.removeParameter(0);
    expect(inst.builderModel().parameters).toHaveLength(1);
  });

  it('nameError flags invalid identifiers', async () => {
    const fixture = TestBed.createComponent(ToolsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ToolsInternals;
    patchBuilder(inst, { name: '1bad' });
    expect(inst.nameError()).toMatch(/Letters, digits/);
    patchBuilder(inst, { name: 'translate' });
    expect(inst.nameError()).toBeNull();
  });

  it('templatePreview substitutes sample values for declared parameters', async () => {
    const fixture = TestBed.createComponent(ToolsComponent);
    await fixture.whenStable();
    const inst = fixture.componentInstance as unknown as ToolsInternals;
    inst.addParameter();
    setParamName(inst, 0, 'city');
    patchBuilder(inst, { responseTemplate: '{"q": {{city}}}' });
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
    expect(inst.builderModel().name).toBe('searchWeather');
    expect(inst.builderModel().parameters.length).toBeGreaterThan(0);
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

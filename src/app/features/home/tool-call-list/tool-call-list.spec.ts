import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolCallListComponent } from './tool-call-list';
import { ToolRegistry } from '../../../core/registry/tool-registry';
import type { ToolManifest } from '../../../core/registry/tool-descriptor';

// Mock tool reference so componentFor is truthy after load — not a real Angular component.
function makeMockTool(name: string): {
  manifest: ToolManifest;
  loadSpy: ReturnType<typeof vi.fn>;
} {
  const component = class MockComponent {} as unknown as new () => unknown;
  const loadSpy = vi.fn(async () => ({
    name,
    description: `mock ${name}`,
    declaration: { name, description: 'mock', parameters: { type: 'OBJECT', properties: {} } },
    argsSchema: { safeParse: () => ({ success: true, data: {} }) },
    component,
    execute: async () => ({}),
  }));
  return {
    manifest: {
      name,
      description: `mock ${name}`,
      declaration: { name, description: 'mock', parameters: { type: 'OBJECT', properties: {} } },
      load: loadSpy,
    } as unknown as ToolManifest,
    loadSpy,
  };
}

describe('ToolCallListComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retryToolLoad re-attempts a failed lazy module and clears the failed flag (M19)', async () => {
    const registry = TestBed.inject(ToolRegistry);
    const tool = makeMockTool('flakyTool');
    tool.loadSpy.mockRejectedValueOnce(new Error('network blip'));
    registry.register(tool.manifest);

    const fixture = TestBed.createComponent(ToolCallListComponent);
    fixture.componentRef.setInput('calls', []);
    const instance = fixture.componentInstance as unknown as {
      retryToolLoad: (name: string) => void;
    };
    await fixture.whenStable();

    await expect(registry.loadImpl('flakyTool')).rejects.toThrow('network blip');
    expect(registry.hasFailed('flakyTool')).toBe(true);

    // Retry after rejection clears failedNames.
    instance.retryToolLoad('flakyTool');
    await vi.waitFor(() => expect(registry.hasFailed('flakyTool')).toBe(false));
    expect(registry.componentFor('flakyTool')).not.toBeNull();
  });
});

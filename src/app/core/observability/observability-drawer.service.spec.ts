import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ObservabilityDrawerService } from './observability-drawer.service';

describe('ObservabilityDrawerService', () => {
  let drawer: ObservabilityDrawerService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    drawer = TestBed.inject(ObservabilityDrawerService);
  });

  it('starts closed', () => {
    expect(drawer.isOpen()).toBe(false);
  });

  it('open() / close() flip the signal', () => {
    drawer.open();
    expect(drawer.isOpen()).toBe(true);
    drawer.close();
    expect(drawer.isOpen()).toBe(false);
  });

  it('toggle() inverts the current state', () => {
    drawer.toggle();
    expect(drawer.isOpen()).toBe(true);
    drawer.toggle();
    expect(drawer.isOpen()).toBe(false);
  });
});

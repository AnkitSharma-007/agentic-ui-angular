import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FlightOptionsCardComponent } from './flight-options-card';
import type {
  FlightOption,
  SearchFlightsArgs,
  SearchFlightsResult,
} from './flight-options-card.types';

const FIXTURE_ARGS: SearchFlightsArgs = {
  from: 'BLR',
  to: 'GOA',
  date: '2026-06-15',
  passengers: 2,
};

const FIXTURE_FLIGHT: FlightOption = {
  id: 'indigo-1',
  airline: 'IndiGo',
  departAt: '2026-06-15T06:00:00.000Z',
  arriveAt: '2026-06-15T07:35:00.000Z',
  durationMinutes: 95,
  stops: 0,
  price: { amount: 4500, currency: 'INR' },
};

const FIXTURE_RESULT: SearchFlightsResult = {
  flights: [FIXTURE_FLIGHT],
  source: 'mock',
  searchedAt: '2026-06-15T05:00:00.000Z',
};

describe('FlightOptionsCardComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders the running state without throwing', async () => {
    const fixture = TestBed.createComponent(FlightOptionsCardComponent);
    fixture.componentRef.setInput('args', FIXTURE_ARGS);
    fixture.componentRef.setInput('status', 'running');
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Flight options');
    expect(text).toContain('BLR → GOA');
    expect(text.toLowerCase()).toContain('running');
  });

  it('renders the complete state with the flight list', async () => {
    const fixture = TestBed.createComponent(FlightOptionsCardComponent);
    fixture.componentRef.setInput('args', FIXTURE_ARGS);
    fixture.componentRef.setInput('status', 'complete');
    fixture.componentRef.setInput('result', FIXTURE_RESULT);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('IndiGo');
    expect(text).toContain('1 found');
    expect(text).toContain('non-stop');
  });

  it('renders the error state with a fallback message', async () => {
    const fixture = TestBed.createComponent(FlightOptionsCardComponent);
    fixture.componentRef.setInput('args', FIXTURE_ARGS);
    fixture.componentRef.setInput('status', 'error');
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text.toLowerCase()).toContain('failed');
    expect(text).toContain('Tool execution failed');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { HotelOptionsCardComponent } from './hotel-options-card';
import type {
  HotelOption,
  SearchHotelsArgs,
  SearchHotelsResult,
} from './hotel-options-card.types';

const FIXTURE_ARGS: SearchHotelsArgs = {
  city: 'Goa',
  checkIn: '2026-06-15',
  checkOut: '2026-06-17',
  guests: 2,
  vegetarianFriendly: true,
};

const FIXTURE_HOTEL: HotelOption = {
  id: 'taj',
  name: 'Taj Cidade de Goa',
  neighbourhood: 'Vainguinim Beach',
  rating: 4.6,
  reviewCount: 1240,
  amenities: ['Pool', 'Beach access'],
  vegetarianFriendly: true,
  price: { amountPerNight: 12000, currency: 'INR' },
};

const FIXTURE_RESULT: SearchHotelsResult = {
  hotels: [FIXTURE_HOTEL],
  source: 'mock',
  searchedAt: '2026-06-14T00:00:00.000Z',
  nights: 2,
};

describe('HotelOptionsCardComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('renders the complete state with hotel data', async () => {
    const fixture = TestBed.createComponent(HotelOptionsCardComponent);
    fixture.componentRef.setInput('args', FIXTURE_ARGS);
    fixture.componentRef.setInput('status', 'complete');
    fixture.componentRef.setInput('result', FIXTURE_RESULT);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Taj Cidade de Goa');
    expect(text).toContain('Goa');
    expect(text).toContain('4.6');
    expect(text).toContain('veg-friendly');
  });

  it('renders the running state without throwing', async () => {
    const fixture = TestBed.createComponent(HotelOptionsCardComponent);
    fixture.componentRef.setInput('args', FIXTURE_ARGS);
    fixture.componentRef.setInput('status', 'running');
    await fixture.whenStable();
    expect((fixture.nativeElement.textContent ?? '').toLowerCase()).toContain('running');
  });

  it('singularises "guest" when there is one guest', async () => {
    const fixture = TestBed.createComponent(HotelOptionsCardComponent);
    fixture.componentRef.setInput('args', { ...FIXTURE_ARGS, guests: 1, vegetarianFriendly: false });
    fixture.componentRef.setInput('status', 'running');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('1 guest');
    expect(fixture.nativeElement.textContent).not.toContain('1 guests');
  });
});

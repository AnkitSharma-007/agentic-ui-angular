import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActivityListComponent } from './activity-list';
import type { Activity } from './find-activities.descriptor';

const FIXTURE_ACTIVITIES: readonly Activity[] = [
  {
    name: 'Sunset cruise',
    category: 'beach',
    description: 'Catch the sunset from a chartered boat.',
    durationHours: 2,
    priceRange: '₹1500–2500',
    rating: 4.5,
    bestTime: 'evening',
    highlight: true,
  },
  {
    name: 'Spice plantation tour',
    category: 'nature',
    description: 'Guided walk through a working spice farm.',
    durationHours: 3,
    priceRange: '₹800–1200',
    rating: 4.2,
    bestTime: 'morning',
    highlight: false,
  },
];

describe('ActivityListComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideAnimationsAsync()],
    });
  });

  it('renders the running state with a Searching label', async () => {
    const fixture = TestBed.createComponent(ActivityListComponent);
    fixture.componentRef.setInput('args', { city: 'Goa' });
    fixture.componentRef.setInput('status', 'running');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('What to do in Goa');
    expect(fixture.nativeElement.textContent).toContain('Searching');
  });

  it('falls back to the generic title when no city is known', async () => {
    const fixture = TestBed.createComponent(ActivityListComponent);
    fixture.componentRef.setInput('args', {});
    fixture.componentRef.setInput('status', 'running');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Activity finder');
  });

  it('renders the complete state with activity rows and the totals footer', async () => {
    const fixture = TestBed.createComponent(ActivityListComponent);
    fixture.componentRef.setInput('args', { city: 'Goa' });
    fixture.componentRef.setInput('status', 'complete');
    fixture.componentRef.setInput('result', {
      city: 'Goa',
      activities: FIXTURE_ACTIVITIES,
      totalDurationHours: 5,
    });
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Sunset cruise');
    expect(text).toContain('Spice plantation tour');
    expect(text).toContain('2 found');
    expect(text).toContain('5.0h total');
    expect(text).toContain('activities');
  });

  it('renders the error state with the supplied message', async () => {
    const fixture = TestBed.createComponent(ActivityListComponent);
    fixture.componentRef.setInput('args', { city: 'Goa' });
    fixture.componentRef.setInput('status', 'error');
    fixture.componentRef.setInput('errorMessage', 'API down');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('API down');
  });

  it('renders the pending_approval state with the interruptReason in a banner', async () => {
    const fixture = TestBed.createComponent(ActivityListComponent);
    fixture.componentRef.setInput('args', { city: 'Goa' });
    fixture.componentRef.setInput('status', 'pending_approval');
    fixture.componentRef.setInput('interruptReason', 'Confirm before searching.');
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const text = host.textContent ?? '';
    expect(text).toContain('awaiting approval');
    expect(text).toContain('Confirm before searching.');
    expect(host.querySelector('.tool-pending-banner')).not.toBeNull();
    expect(host.querySelector('.status.pending')).not.toBeNull();
  });

  it('renders the rejected state with the interruptReason in a banner', async () => {
    const fixture = TestBed.createComponent(ActivityListComponent);
    fixture.componentRef.setInput('args', { city: 'Goa' });
    fixture.componentRef.setInput('status', 'rejected');
    fixture.componentRef.setInput('interruptReason', 'User cancelled the search.');
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const text = host.textContent ?? '';
    expect(text).toContain('cancelled');
    expect(text).toContain('User cancelled the search.');
    expect(host.querySelector('.tool-rejected-banner')).not.toBeNull();
    expect(host.querySelector('.status.rejected')).not.toBeNull();
  });

  it('falls back to default copy when no interruptReason is provided', async () => {
    const fixture = TestBed.createComponent(ActivityListComponent);
    fixture.componentRef.setInput('args', { city: 'Goa' });
    fixture.componentRef.setInput('status', 'pending_approval');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain(
      'Waiting for your approval to look up activities.',
    );
  });
});

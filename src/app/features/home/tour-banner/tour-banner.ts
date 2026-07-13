import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

const TOUR_DISMISSED_KEY = 'atlas.tour.dismissed';

@Component({
  selector: 'app-tour-banner',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './tour-banner.html',
  styleUrl: './tour-banner.scss',
})
export class TourBannerComponent {
  protected readonly visible = signal(!hasTourBeenDismissed());

  protected dismiss(): void {
    this.visible.set(false);
    markTourDismissed();
  }
}

function hasTourBeenDismissed(): boolean {
  try {
    return localStorage.getItem(TOUR_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function markTourDismissed(): void {
  try {
    localStorage.setItem(TOUR_DISMISSED_KEY, '1');
  } catch {
    // ignore — banner will simply reappear next visit
  }
}

import { type EnvironmentProviders, provideAppInitializer, inject } from '@angular/core';
import { ToolRegistry } from './tool-registry';
import { CustomToolsService } from '../custom-tools/custom-tools.service';
import { bookingConfirmationCardManifest } from '../../shared/tools/booking-confirmation-card/booking-confirmation-card.manifest';
import { comparisonTableManifest } from '../../shared/tools/comparison-table/comparison-table.manifest';
import { flightOptionsCardManifest } from '../../shared/tools/flight-options-card/flight-options-card.manifest';
import { hotelOptionsCardManifest } from '../../shared/tools/hotel-options-card/hotel-options-card.manifest';
import { itineraryMapManifest } from '../../shared/tools/itinerary-map/itinerary-map.manifest';
import { findActivitiesManifest } from '../../shared/tools/activity-list/find-activities.manifest';
import { handoffToManifest } from '../../shared/tools/handoff-tool/handoff-tool.manifest';
import { proposeToolManifest } from '../../shared/tools/propose-tool/propose-tool.manifest';

const BUILT_IN_MANIFESTS = [
  bookingConfirmationCardManifest,
  comparisonTableManifest,
  flightOptionsCardManifest,
  hotelOptionsCardManifest,
  itineraryMapManifest,
  findActivitiesManifest,
  handoffToManifest,
  proposeToolManifest,
];

export function provideTools(): EnvironmentProviders {
  return provideAppInitializer(() => {
    const registry = inject(ToolRegistry);
    for (const manifest of BUILT_IN_MANIFESTS) {
      registry.register(manifest);
    }
    // Return (don't `void`) the promise so bootstrap awaits IndexedDB
    // rehydration — otherwise the first agent turn can start before custom
    // tools are registered and the model won't see them (startup race, H6).
    // Built-ins are registered first, so `load()` never shadows them.
    return inject(CustomToolsService).load();
  });
}

import { type EnvironmentProviders, provideAppInitializer, inject } from '@angular/core';
import { ToolRegistry } from './tool-registry';
import type { ToolManifest } from './tool-descriptor';
import { CustomToolsService } from '../custom-tools/custom-tools.service';

// Lazy-load built-in manifests so verbose Gemini schemas stay out of main chunk;
// initializer awaits parallel resolution with IndexedDB rehydration.
const BUILT_IN_MANIFEST_LOADERS: ReadonlyArray<() => Promise<ToolManifest>> = [
  () =>
    import('../../shared/tools/booking-confirmation-card/booking-confirmation-card.manifest').then(
      (m) => m.bookingConfirmationCardManifest,
    ),
  () =>
    import('../../shared/tools/comparison-table/comparison-table.manifest').then(
      (m) => m.comparisonTableManifest,
    ),
  () =>
    import('../../shared/tools/flight-options-card/flight-options-card.manifest').then(
      (m) => m.flightOptionsCardManifest,
    ),
  () =>
    import('../../shared/tools/hotel-options-card/hotel-options-card.manifest').then(
      (m) => m.hotelOptionsCardManifest,
    ),
  () =>
    import('../../shared/tools/itinerary-map/itinerary-map.manifest').then(
      (m) => m.itineraryMapManifest,
    ),
  () =>
    import('../../shared/tools/activity-list/find-activities.manifest').then(
      (m) => m.findActivitiesManifest,
    ),
  () =>
    import('../../shared/tools/handoff-tool/handoff-tool.manifest').then(
      (m) => m.handoffToManifest,
    ),
  () =>
    import('../../shared/tools/propose-tool/propose-tool.manifest').then(
      (m) => m.proposeToolManifest,
    ),
];

export function provideTools(): EnvironmentProviders {
  return provideAppInitializer(async () => {
    const registry = inject(ToolRegistry);
    const customTools = inject(CustomToolsService);

    const manifests = await Promise.all(
      BUILT_IN_MANIFEST_LOADERS.map((load) => load()),
    );
    for (const manifest of manifests) {
      registry.register(manifest);
    }

    // Await IndexedDB so first turn sees custom tools; built-ins register first so load() never shadows them.
    await customTools.load();
  });
}

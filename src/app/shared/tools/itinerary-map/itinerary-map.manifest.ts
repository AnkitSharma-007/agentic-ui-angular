import type { ToolManifest, ToolMeta } from '../../../core/registry/tool-descriptor';
import type {
  RenderItineraryArgs,
  RenderItineraryResult,
} from './itinerary-map.types';

export const RENDER_ITINERARY_META: ToolMeta = {
  name: 'renderItinerary',
  // The map is a single, replaceable surface — if the agent re-renders the
  // itinerary, only the latest card should show (N4, previously hard-coded in
  // home.ts as a `'renderItinerary'` string literal).
  singleton: true,
  description:
    'Render the trip on an interactive map with markers for each waypoint and a line between them.',
  declaration: {
    name: 'renderItinerary',
    description:
      'Render the trip on an interactive map. Call this AT MOST ONCE per turn, and only ' +
      'as the final tool call after every flight has been chosen and every booking ' +
      'confirmed. Never call it in parallel with `letUserChoose` or `bookFlight`. ' +
      'Provide latitude/longitude for each waypoint, since you know the coordinates of ' +
      'well-known cities, airports, and attractions. The `kind` field MUST be exactly ' +
      'one of: "origin" (departure city), "destination" (anchor city), "stay" ' +
      '(hotels/accommodation), or "stop" (attractions or transit waypoints). No other ' +
      'values are accepted.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description:
            'Short trip title, e.g. "Weekend in Goa" or "Bengaluru → Goa". Shown above the map.',
        },
        waypoints: {
          type: 'ARRAY',
          description:
            'Between 1 and 12 waypoints, in the order they should be visited. ' +
            'Every waypoint MUST include latitude and longitude. Use the ' +
            'coordinates you know for well-known cities, airports, and attractions.',
          items: {
            type: 'OBJECT',
            description: 'A single map marker.',
            properties: {
              name: {
                type: 'STRING',
                description:
                  'Display name shown on the map, e.g. "Bengaluru (BLR)" or "Baga Beach".',
              },
              lat: {
                type: 'NUMBER',
                description: 'Latitude in decimal degrees, between -90 and 90.',
              },
              lng: {
                type: 'NUMBER',
                description: 'Longitude in decimal degrees, between -180 and 180.',
              },
              kind: {
                type: 'STRING',
                enum: ['origin', 'destination', 'stay', 'stop'],
                description:
                  'Marker kind. "origin" for the departure city, "destination" for the ' +
                  'trip anchor city, "stay" for hotels/accommodation, "stop" for ' +
                  'attractions or transit waypoints.',
              },
              note: {
                type: 'STRING',
                description:
                  'Optional short note shown in the marker popup (≤140 chars).',
              },
            },
            required: ['name', 'lat', 'lng', 'kind'],
          },
        },
      },
      required: ['title', 'waypoints'],
    },
  },
};

export const itineraryMapManifest: ToolManifest<
  RenderItineraryArgs,
  RenderItineraryResult
> = {
  ...RENDER_ITINERARY_META,
  load: () =>
    import('./itinerary-map.descriptor').then((m) => m.itineraryMapDescriptor),
};

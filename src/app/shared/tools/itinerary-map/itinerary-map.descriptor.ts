import { z } from 'zod';
import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { deterministicJitter, wait } from '../mock-helpers';
import { ItineraryMapComponent } from './itinerary-map';
import { RENDER_ITINERARY_META } from './itinerary-map.manifest';
import type {
  RenderItineraryArgs,
  RenderItineraryResult,
  Waypoint,
} from './itinerary-map.types';

const KIND_SYNONYMS: Readonly<Record<string, 'origin' | 'destination' | 'stay' | 'stop'>> = {
  origin: 'origin',
  start: 'origin',
  source: 'origin',
  from: 'origin',
  departure: 'origin',
  destination: 'destination',
  end: 'destination',
  target: 'destination',
  to: 'destination',
  anchor: 'destination',
  stay: 'stay',
  hotel: 'stay',
  accommodation: 'stay',
  lodging: 'stay',
  stop: 'stop',
  waypoint: 'stop',
  attraction: 'stop',
  poi: 'stop',
  transit: 'stop',
};

function normalizeKind(value: unknown): 'origin' | 'destination' | 'stay' | 'stop' {
  if (typeof value !== 'string') return 'stop';
  const key = value.trim().toLowerCase();
  return KIND_SYNONYMS[key] ?? 'stop';
}

const waypointSchema = z.object({
  name: z.string().min(2),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  kind: z.preprocess(normalizeKind, z.enum(['origin', 'destination', 'stay', 'stop'])),
  note: z.string().max(140).optional(),
});

const renderItineraryArgsSchema = z.object({
  title: z.string().min(2).max(80),
  waypoints: z.array(waypointSchema).min(1).max(12),
});

// The "render" is a UI concern — the executor just validates input,
// computes the bounding box, and acks the canonical waypoint list.
async function renderItineraryExecutor(
  args: RenderItineraryArgs,
  ctx: { signal: AbortSignal },
): Promise<RenderItineraryResult> {
  const seed = `${args.title}|${args.waypoints.length}`;
  await wait(400 + deterministicJitter(seed, 300), ctx.signal);

  const waypoints = args.waypoints.slice();
  const bbox = computeBoundingBox(waypoints);

  return {
    status: 'rendered',
    title: args.title,
    waypoints,
    bbox,
    renderedAt: new Date().toISOString(),
  };
}

export const itineraryMapDescriptor: ToolDescriptor<
  RenderItineraryArgs,
  RenderItineraryResult
> = {
  ...RENDER_ITINERARY_META,
  argsSchema: renderItineraryArgsSchema,
  component: ItineraryMapComponent,
  execute: renderItineraryExecutor,
};

function computeBoundingBox(
  waypoints: readonly Waypoint[],
): RenderItineraryResult['bbox'] {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const w of waypoints) {
    if (w.lat > north) north = w.lat;
    if (w.lat < south) south = w.lat;
    if (w.lng > east) east = w.lng;
    if (w.lng < west) west = w.lng;
  }
  return { north, south, east, west };
}


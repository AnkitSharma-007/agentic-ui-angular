export type WaypointKind = 'origin' | 'destination' | 'stay' | 'stop';

export interface Waypoint {
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  readonly kind: WaypointKind;
  readonly note?: string;
}

export interface RenderItineraryArgs {
  readonly title: string;
  readonly waypoints: readonly Waypoint[];
}

export interface RenderItineraryResult {
  readonly status: 'rendered';
  readonly title: string;
  readonly waypoints: readonly Waypoint[];
  readonly bbox: {
    readonly north: number;
    readonly south: number;
    readonly east: number;
    readonly west: number;
  };
  readonly renderedAt: string;
}

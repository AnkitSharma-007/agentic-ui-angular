import type { ToolManifest, ToolMeta } from '../../../core/registry/tool-descriptor';
import type {
  SearchFlightsArgs,
  SearchFlightsResult,
} from './flight-options-card.types';

export const SEARCH_FLIGHTS_META: ToolMeta = {
  name: 'searchFlights',
  description: 'Search for available flights between two cities on a given date.',
  declaration: {
    name: 'searchFlights',
    description:
      'Search available flights between two cities on a given date. Returns up to 4 options sorted by departure time.',
    parameters: {
      type: 'OBJECT',
      properties: {
        from: { type: 'STRING', description: 'IATA city or airport name to depart from.' },
        to: { type: 'STRING', description: 'IATA city or airport name to arrive at.' },
        date: { type: 'STRING', description: 'Departure date in YYYY-MM-DD format.' },
        passengers: {
          type: 'INTEGER',
          description: 'Number of passengers, 1 to 9.',
        },
      },
      required: ['from', 'to', 'date', 'passengers'],
    },
  },
};

export const flightOptionsCardManifest: ToolManifest<
  SearchFlightsArgs,
  SearchFlightsResult
> = {
  ...SEARCH_FLIGHTS_META,
  load: () =>
    import('./flight-options-card.descriptor').then(
      (m) => m.flightOptionsCardDescriptor,
    ),
};

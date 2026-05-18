import type { ToolManifest, ToolMeta } from '../../../core/registry/tool-descriptor';
import type {
  SearchHotelsArgs,
  SearchHotelsResult,
} from './hotel-options-card.types';

export const SEARCH_HOTELS_META: ToolMeta = {
  name: 'searchHotels',
  description:
    'Search for hotels in a city for a given check-in / check-out window. Supports a vegetarian-friendly filter.',
  declaration: {
    name: 'searchHotels',
    description:
      'Search hotels in a city for a date range. Returns up to 4 options. Set `vegetarianFriendly` to true to restrict to veg-friendly stays.',
    parameters: {
      type: 'OBJECT',
      properties: {
        city: { type: 'STRING', description: 'City name to search hotels in.' },
        checkIn: { type: 'STRING', description: 'Check-in date in YYYY-MM-DD format.' },
        checkOut: { type: 'STRING', description: 'Check-out date in YYYY-MM-DD format.' },
        guests: {
          type: 'INTEGER',
          description: 'Number of guests, 1 to 8.',
        },
        vegetarianFriendly: {
          type: 'BOOLEAN',
          description:
            'Optional. If true, only return hotels flagged as vegetarian-friendly.',
        },
      },
      required: ['city', 'checkIn', 'checkOut', 'guests'],
    },
  },
};

export const hotelOptionsCardManifest: ToolManifest<
  SearchHotelsArgs,
  SearchHotelsResult
> = {
  ...SEARCH_HOTELS_META,
  load: () =>
    import('./hotel-options-card.descriptor').then(
      (m) => m.hotelOptionsCardDescriptor,
    ),
};

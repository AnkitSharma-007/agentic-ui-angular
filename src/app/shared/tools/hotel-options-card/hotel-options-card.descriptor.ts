import { z } from 'zod';
import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { deterministicJitter, wait } from '../mock-helpers';
import { HotelOptionsCardComponent } from './hotel-options-card';
import { SEARCH_HOTELS_META } from './hotel-options-card.manifest';
import type {
  HotelOption,
  SearchHotelsArgs,
  SearchHotelsResult,
} from './hotel-options-card.types';

const searchHotelsArgsSchema = z.object({
  city: z.string().min(2),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'checkIn must be YYYY-MM-DD'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'checkOut must be YYYY-MM-DD'),
  guests: z.number().int().min(1).max(8),
  vegetarianFriendly: z.boolean().optional(),
});

const MOCK_HOTELS: ReadonlyArray<{
  name: string;
  neighbourhood: string;
  baseRating: number;
  amenities: readonly string[];
  vegetarianFriendly: boolean;
  baseRate: number;
}> = [
  {
    name: 'The Anjuna Coastal Retreat',
    neighbourhood: 'Anjuna',
    baseRating: 4.6,
    amenities: ['Pool', 'Breakfast', 'Sea view'],
    vegetarianFriendly: true,
    baseRate: 6800,
  },
  {
    name: 'Palm Grove Boutique Stay',
    neighbourhood: 'Calangute',
    baseRating: 4.4,
    amenities: ['Pool', 'Yoga', 'Bike rental'],
    vegetarianFriendly: true,
    baseRate: 5200,
  },
  {
    name: 'Old Quarter House',
    neighbourhood: 'Fontainhas',
    baseRating: 4.7,
    amenities: ['Heritage', 'Café', 'Walkable'],
    vegetarianFriendly: false,
    baseRate: 7400,
  },
  {
    name: 'Sunset Beach Villas',
    neighbourhood: 'Vagator',
    baseRating: 4.5,
    amenities: ['Private beach', 'Spa', 'Breakfast'],
    vegetarianFriendly: true,
    baseRate: 8900,
  },
];

// Deliberately slower than searchFlights so the parallel-as-they-settle
// behaviour is visible to the user — flights land first, hotels second.
async function searchHotelsExecutor(
  args: SearchHotelsArgs,
  ctx: { signal: AbortSignal },
): Promise<SearchHotelsResult> {
  const seed = `${args.city}|${args.checkIn}|${args.checkOut}|${args.guests}`;
  await wait(1300 + deterministicJitter(seed, 600), ctx.signal);

  const nights = nightsBetween(args.checkIn, args.checkOut);
  const filtered = args.vegetarianFriendly
    ? MOCK_HOTELS.filter((h) => h.vegetarianFriendly)
    : MOCK_HOTELS;

  const hotels: HotelOption[] = filtered.map((h, idx) => buildHotel(args, h, idx));

  return {
    hotels,
    nights,
    source: 'mock',
    searchedAt: new Date().toISOString(),
  };
}

export const hotelOptionsCardDescriptor: ToolDescriptor<
  SearchHotelsArgs,
  SearchHotelsResult
> = {
  ...SEARCH_HOTELS_META,
  argsSchema: searchHotelsArgsSchema,
  component: HotelOptionsCardComponent,
  execute: searchHotelsExecutor,
};

function buildHotel(
  args: SearchHotelsArgs,
  template: (typeof MOCK_HOTELS)[number],
  idx: number,
): HotelOption {
  const ratingNudge = ((args.guests * 7 + idx * 3) % 6) / 10;
  const priceNudge = ((args.guests * 350 + idx * 175) % 1100) - 400;

  return {
    id: `${template.name.toLowerCase().replace(/[^\w]+/g, '-')}-${args.checkIn}`,
    name: template.name,
    neighbourhood: template.neighbourhood,
    rating: Math.min(5, Math.max(3.5, template.baseRating + ratingNudge - 0.3)),
    reviewCount: 120 + ((args.guests * 19 + idx * 41) % 580),
    amenities: template.amenities,
    vegetarianFriendly: template.vegetarianFriendly,
    price: {
      amountPerNight: template.baseRate + priceNudge,
      currency: 'INR',
    },
  };
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(checkIn);
  const b = Date.parse(checkOut);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  const diff = Math.round((b - a) / 86_400_000);
  // 0 for invalid ranges; the template gates the total on `nights() > 0`.
  return diff > 0 ? diff : 0;
}


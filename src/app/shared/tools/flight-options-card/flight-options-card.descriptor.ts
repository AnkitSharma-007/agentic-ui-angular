import { z } from 'zod';
import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { deterministicJitter, wait } from '../mock-helpers';
import { FlightOptionsCardComponent } from './flight-options-card';
import { SEARCH_FLIGHTS_META } from './flight-options-card.manifest';
import type {
  FlightOption,
  SearchFlightsArgs,
  SearchFlightsResult,
} from './flight-options-card.types';

const searchFlightsArgsSchema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  passengers: z.number().int().min(1).max(9),
});

const MOCK_AIRLINES = ['IndiGo', 'Vistara', 'Akasa Air', 'Air India Express'] as const;

// Deterministic mock: returns the same 4 flights for the same args so demos
// stay reproducible. The 800–1200ms delay is intentional skeleton-time.
async function searchFlightsExecutor(
  args: SearchFlightsArgs,
  ctx: { signal: AbortSignal },
): Promise<SearchFlightsResult> {
  const seed = `${args.from}|${args.to}|${args.date}|${args.passengers}`;
  await wait(800 + deterministicJitter(seed, 400), ctx.signal);

  const flights: FlightOption[] = MOCK_AIRLINES.map((airline, idx) =>
    buildFlight(args, airline, idx),
  );

  return {
    flights,
    source: 'mock',
    searchedAt: new Date().toISOString(),
  };
}

export const flightOptionsCardDescriptor: ToolDescriptor<
  SearchFlightsArgs,
  SearchFlightsResult
> = {
  ...SEARCH_FLIGHTS_META,
  argsSchema: searchFlightsArgsSchema,
  component: FlightOptionsCardComponent,
  execute: searchFlightsExecutor,
};

function buildFlight(args: SearchFlightsArgs, airline: string, idx: number): FlightOption {
  const baseHour = 6 + idx * 4;
  const departAt = new Date(`${args.date}T${pad(baseHour)}:${pad((idx * 25) % 60)}:00`);
  const durationMinutes = 95 + ((idx * 17) % 35);
  const arriveAt = new Date(departAt.getTime() + durationMinutes * 60_000);
  const basePrice = 4200 + ((args.passengers * 1300 + idx * 715) % 3500);

  return {
    id: `${airline.toLowerCase().replace(/\s+/g, '-')}-${args.date}-${idx}`,
    airline,
    departAt: departAt.toISOString(),
    arriveAt: arriveAt.toISOString(),
    durationMinutes,
    stops: idx === 2 ? 1 : 0,
    price: {
      amount: basePrice,
      currency: 'INR',
    },
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

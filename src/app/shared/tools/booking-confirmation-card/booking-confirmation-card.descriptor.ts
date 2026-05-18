import { z } from 'zod';
import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { deterministicJitter, hashString, wait } from '../mock-helpers';
import { BookingConfirmationCardComponent } from './booking-confirmation-card';
import { BOOK_FLIGHT_META } from './booking-confirmation-card.manifest';
import type { BookFlightArgs, BookFlightResult } from './booking-confirmation-card.types';

const bookFlightArgsSchema = z.object({
  flightId: z.string().min(3),
  airline: z.string().min(2),
  from: z.string().min(2),
  to: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  passengerName: z.string().min(2),
  price: z.number().positive(),
  currency: z.string().length(3),
});

async function bookFlightExecutor(
  args: BookFlightArgs,
  ctx: { signal: AbortSignal },
): Promise<BookFlightResult> {
  const seed = `${args.flightId}|${args.passengerName}`;
  await wait(600 + deterministicJitter(seed, 400), ctx.signal);

  return {
    status: 'confirmed',
    bookingRef: buildBookingRef(args),
    bookedAt: new Date().toISOString(),
    flightId: args.flightId,
    passengerName: args.passengerName,
    totalCharged: args.price,
    currency: args.currency,
  };
}

export const bookingConfirmationCardDescriptor: ToolDescriptor<
  BookFlightArgs,
  BookFlightResult
> = {
  ...BOOK_FLIGHT_META,
  argsSchema: bookFlightArgsSchema,
  component: BookingConfirmationCardComponent,
  execute: bookFlightExecutor,
};

function buildBookingRef(args: BookFlightArgs): string {
  const base36 = hashString(`${args.flightId}|${args.passengerName}|${args.date}`)
    .toString(36)
    .toUpperCase()
    .slice(0, 6)
    .padStart(6, 'X');
  return `${args.airline.slice(0, 2).toUpperCase()}-${base36}`;
}

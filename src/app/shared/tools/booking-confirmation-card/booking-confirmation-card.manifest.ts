import type { ToolManifest, ToolMeta } from '../../../core/registry/tool-descriptor';
import type {
  BookFlightArgs,
  BookFlightResult,
} from './booking-confirmation-card.types';

export const BOOK_FLIGHT_META: ToolMeta = {
  name: 'bookFlight',
  description:
    'Book a specific flight for a passenger. WRITE operation. Requires explicit user approval before running.',
  declaration: {
    name: 'bookFlight',
    description:
      'Book a specific flight previously surfaced by searchFlights. WRITE operation. The user will be asked to approve before this runs; if they reject, you will see `{ rejected: true, reason: ... }` and should re-plan.',
    parameters: {
      type: 'OBJECT',
      properties: {
        flightId: {
          type: 'STRING',
          description: 'The `id` of a flight returned by `searchFlights`.',
        },
        airline: { type: 'STRING', description: 'Airline display name from the flight option.' },
        from: { type: 'STRING', description: 'Departure city / airport.' },
        to: { type: 'STRING', description: 'Arrival city / airport.' },
        date: { type: 'STRING', description: 'Departure date YYYY-MM-DD.' },
        passengerName: { type: 'STRING', description: 'Full name on the booking.' },
        price: { type: 'NUMBER', description: 'Quoted fare amount as a number.' },
        currency: {
          type: 'STRING',
          description: 'ISO 4217 currency code (e.g. INR, USD).',
        },
      },
      required: ['flightId', 'airline', 'from', 'to', 'date', 'passengerName', 'price', 'currency'],
    },
  },
  interruptive: true,
  interruptReason:
    'This will charge the listed fare. Approve to book, or reject with a note so the agent can re-plan.',
};

export const bookingConfirmationCardManifest: ToolManifest<
  BookFlightArgs,
  BookFlightResult
> = {
  ...BOOK_FLIGHT_META,
  load: () =>
    import('./booking-confirmation-card.descriptor').then(
      (m) => m.bookingConfirmationCardDescriptor,
    ),
};

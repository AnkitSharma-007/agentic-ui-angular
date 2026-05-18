export interface SearchFlightsArgs {
  readonly from: string;
  readonly to: string;
  readonly date: string;
  readonly passengers: number;
}

export interface FlightPrice {
  readonly amount: number;
  readonly currency: string;
}

export interface FlightOption {
  readonly id: string;
  readonly airline: string;
  readonly departAt: string;
  readonly arriveAt: string;
  readonly durationMinutes: number;
  readonly stops: number;
  readonly price: FlightPrice;
}

export interface SearchFlightsResult {
  readonly flights: readonly FlightOption[];
  readonly source: 'mock';
  readonly searchedAt: string;
}

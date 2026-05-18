export interface BookFlightArgs {
  readonly flightId: string;
  readonly airline: string;
  readonly from: string;
  readonly to: string;
  readonly date: string;
  readonly passengerName: string;
  readonly price: number;
  readonly currency: string;
}

export interface BookFlightResult {
  readonly status: 'confirmed';
  readonly bookingRef: string;
  readonly bookedAt: string;
  readonly flightId: string;
  readonly passengerName: string;
  readonly totalCharged: number;
  readonly currency: string;
}

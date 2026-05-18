export interface SearchHotelsArgs {
  readonly city: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guests: number;
  readonly vegetarianFriendly?: boolean;
}

export interface HotelPrice {
  readonly amountPerNight: number;
  readonly currency: string;
}

export interface HotelOption {
  readonly id: string;
  readonly name: string;
  readonly neighbourhood: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly amenities: readonly string[];
  readonly vegetarianFriendly: boolean;
  readonly price: HotelPrice;
}

export interface SearchHotelsResult {
  readonly hotels: readonly HotelOption[];
  readonly source: 'mock';
  readonly searchedAt: string;
  readonly nights: number;
}

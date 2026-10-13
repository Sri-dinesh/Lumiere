export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface ShowSeat {
  seatCode: string;
  row: string;
  seatNumber: number;
  status: SeatStatus;
  heldByCurrentUser: boolean;
  holdExpiresAt: string | null;
}

export interface UserActiveHold {
  holdId: string;
  seatCodes: string[];
  expiresAt: string;
  secondsRemaining: number;
}

export interface SeatMapResponse {
  showId: string;
  movieId: string;
  movieTitle: string;
  screenId: number;
  startsAt: string;
  endsAt: string;
  pricePaise: number;
  totalSeats: number;
  availableCount: number;
  bookedCount: number;
  heldCount: number;
  seats: ShowSeat[];
  currentUserActiveHold: UserActiveHold | null;
}

export interface HoldResult {
  holdId: string;
  showId: string;
  seatCodes: string[];
  expiresAt: string;
  secondsRemaining: number;
  totalPaise: number;
}

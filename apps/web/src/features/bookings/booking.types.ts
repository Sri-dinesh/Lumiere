export interface BookingSummary {
  id: string;
  userId: string;
  showId: string;
  movieTitle: string;
  posterUrl: string | null;
  screenId: number;
  startsAt: string;
  endsAt: string;
  seatCodes: string[];
  totalPaise: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  cancelledAt: string | null;
  canCancel: boolean;
}

export interface BookingDetail {
  id: string;
  userId: string;
  showId: string;
  movieTitle: string;
  posterUrl: string | null;
  durationMinutes: number;
  rating: string;
  language: string;
  screenId: number;
  startsAt: string;
  endsAt: string;
  unitPricePaise: number;
  seatCodes: string[];
  totalPaise: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  cancelledAt: string | null;
  canCancel: boolean;
}

export interface PaymentSuccessData {
  bookingId: string;
  status: 'CONFIRMED';
  movie?: {
    id?: string;
    title?: string;
  };
  show?: {
    id?: string;
    startsAt?: string;
  };
  showId?: string;
  seats?: string[];
  seatCodes?: string[];
  totalPaise: number;
  currency?: string;
  bookedAt?: string;
  createdAt?: string;
  isIdempotentReplay?: boolean;
}

export interface PaymentFailureData {
  status: 'FAILED';
  retryable: boolean;
  message: string;
  expiresAt: string;
}

export type PaymentResponseData = PaymentSuccessData | PaymentFailureData;

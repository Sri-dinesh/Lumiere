import { apiClient } from '../../lib/api-client.js';
import type { BookingSummary, BookingDetail, PaymentResponseData } from './booking.types.js';

export interface HoldDetailResponse {
  id: string;
  userId: string;
  showId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RELEASED' | 'CONSUMED';
  expiresAt: string;
  secondsRemaining: number;
  movieTitle: string;
  startsAt: string;
  pricePaise: number;
  seatCodes: string[];
}

export async function fetchHoldDetail(holdId: string): Promise<HoldDetailResponse> {
  return apiClient<HoldDetailResponse>(`/api/v1/holds/${holdId}`);
}

export async function processPayment(
  holdId: string,
  outcome: 'success' | 'failure',
): Promise<PaymentResponseData> {
  return apiClient<PaymentResponseData>(`/api/v1/holds/${holdId}/payment`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  });
}

export async function listMyBookings(): Promise<BookingSummary[]> {
  return apiClient<BookingSummary[]>('/api/v1/bookings/me');
}

export async function getBookingById(bookingId: string): Promise<BookingDetail> {
  return apiClient<BookingDetail>(`/api/v1/bookings/${bookingId}`);
}

export async function cancelBooking(
  bookingId: string,
): Promise<{ bookingId: string; status: string; cancelledAt: string }> {
  return apiClient<{ bookingId: string; status: string; cancelledAt: string }>(
    `/api/v1/bookings/${bookingId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function releaseHold(holdId: string): Promise<void> {
  return apiClient<void>(`/api/v1/holds/${holdId}`, {
    method: 'DELETE',
  });
}

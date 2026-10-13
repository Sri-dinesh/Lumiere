import { apiClient } from '../../lib/api-client.js';
import type { SeatMapResponse, HoldResult } from './seat.types.js';

export async function fetchSeatMap(showId: string): Promise<SeatMapResponse> {
  return apiClient<SeatMapResponse>(`/api/v1/shows/${showId}/seats`);
}

export async function createHold(showId: string, seatCodes: string[]): Promise<HoldResult> {
  return apiClient<HoldResult>(`/api/v1/shows/${showId}/holds`, {
    method: 'POST',
    body: JSON.stringify({ seatCodes }),
  });
}

export async function releaseHold(holdId: string): Promise<void> {
  return apiClient<void>(`/api/v1/holds/${holdId}`, {
    method: 'DELETE',
  });
}

import { apiClient } from '../../lib/api-client.js';
import type { ShowDetail, AdminShow, CreateShowPayload, ShowReport } from './show.types.js';

export async function fetchShow(showId: string): Promise<ShowDetail> {
  return apiClient<ShowDetail>(`/api/v1/shows/${showId}`);
}

export async function fetchAdminShows(params?: {
  date?: string;
  movieId?: string;
}): Promise<AdminShow[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.movieId) query.set('movieId', params.movieId);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient<AdminShow[]>(`/api/v1/admin/shows${qs}`);
}

export async function createShow(payload: CreateShowPayload): Promise<AdminShow> {
  return apiClient<AdminShow>('/api/v1/admin/shows', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteShow(showId: string): Promise<void> {
  return apiClient<void>(`/api/v1/admin/shows/${showId}`, {
    method: 'DELETE',
  });
}

export async function fetchShowReport(showId: string): Promise<ShowReport> {
  return apiClient<ShowReport>(`/api/v1/admin/shows/${showId}/report`);
}

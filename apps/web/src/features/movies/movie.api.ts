import { apiClient } from '../../lib/api-client.js';
import type {
  Movie,
  MovieDetailResponse,
  CreateMoviePayload,
  UpdateMoviePayload,
} from './movie.types.js';

export interface MoviesListResponse {
  movies: Movie[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchMovies(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<Movie[]> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.search) query.set('search', params.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiClient<Movie[]>(`/api/v1/movies${qs}`);
}

export async function fetchMovieDetail(movieId: string): Promise<MovieDetailResponse> {
  return apiClient<MovieDetailResponse>(`/api/v1/movies/${movieId}`);
}

export async function createMovie(payload: CreateMoviePayload): Promise<Movie> {
  return apiClient<Movie>('/api/v1/admin/movies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMovie(movieId: string, payload: UpdateMoviePayload): Promise<Movie> {
  return apiClient<Movie>(`/api/v1/admin/movies/${movieId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteMovie(movieId: string): Promise<void> {
  return apiClient<void>(`/api/v1/admin/movies/${movieId}`, {
    method: 'DELETE',
  });
}

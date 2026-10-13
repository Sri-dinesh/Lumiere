export type MovieRating = 'U' | 'UA' | 'A';

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  posterUrl: string | null;
  language: string;
  durationMinutes: number;
  rating: MovieRating;
  createdAt: string;
  updatedAt: string;
}

export interface ShowProjection {
  id: string;
  startsAt: string;
  endsAt: string;
  localTime: string;
  pricePaise: number;
  availableCount: number;
}

export interface ShowsByDateGroup {
  localDate: string;
  shows: ShowProjection[];
}

export interface MovieDetailResponse {
  movie: Movie;
  showsByDate: ShowsByDateGroup[];
}

export interface CreateMoviePayload {
  title: string;
  description?: string;
  posterUrl?: string | null;
  language: string;
  durationMinutes: number;
  rating: MovieRating;
}

export type UpdateMoviePayload = Partial<CreateMoviePayload>;

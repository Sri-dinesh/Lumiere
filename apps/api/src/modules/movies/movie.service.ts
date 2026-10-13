import { sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { movieRepository, MovieRepository } from './movie.repository.js';
import { showRepository, ShowRepository } from '../shows/show.repository.js';
import type { CreateMovieInput, UpdateMovieInput, ListMoviesQuery } from './movie.schema.js';
import { formatUtcToCinemaLocal } from '../../lib/clock.js';
import { AppError } from '../../lib/errors.js';

export class MovieService {
  constructor(
    private readonly movieRepo: MovieRepository = movieRepository,
    private readonly showRepo: ShowRepository = showRepository,
  ) {}

  async listMovies(query: ListMoviesQuery) {
    return this.movieRepo.listMovies(query);
  }

  async getMovieDetail(movieId: string) {
    const movie = await this.movieRepo.getMovieById(movieId);
    if (!movie) {
      throw AppError.notFound('Movie not found');
    }

    const futureShows = await this.showRepo.getFutureShowsForMovie(movieId);

    // Group shows by cinema local date (Asia/Kolkata)
    const grouped = new Map<string, any[]>();

    for (const show of futureShows) {
      const { localDate, localTime } = formatUtcToCinemaLocal(show.startsAt);

      if (!grouped.has(localDate)) {
        grouped.set(localDate, []);
      }

      grouped.get(localDate)!.push({
        id: show.id,
        startsAt: show.startsAt.toISOString(),
        endsAt: show.endsAt.toISOString(),
        localTime,
        pricePaise: show.pricePaise,
        availableCount: show.availableCount,
      });
    }

    const showsByDate = Array.from(grouped.entries()).map(([localDate, shows]) => ({
      localDate,
      shows,
    }));

    return {
      movie,
      showsByDate,
    };
  }

  async createMovie(data: CreateMovieInput) {
    return this.movieRepo.createMovie(data);
  }

  async updateMovie(movieId: string, data: UpdateMovieInput) {
    const existing = await this.movieRepo.getMovieById(movieId);
    if (!existing) {
      throw AppError.notFound('Movie not found');
    }

    // If duration changes, recalculate future scheduled show intervals under screen lock (§3.8)
    if (data.durationMinutes && data.durationMinutes !== existing.durationMinutes) {
      return db.transaction(async (tx) => {
        // 1. Lock screen row first
        await tx.execute(sql`SELECT id FROM cinema_screens WHERE id = 1 FOR UPDATE`);

        // 2. Lock future shows for this movie in stable order
        const futureShowsRes = await tx.execute(sql`
          SELECT id, starts_at as "startsAt"
          FROM shows
          WHERE movie_id = ${movieId} AND starts_at > clock_timestamp()
          ORDER BY starts_at ASC
          FOR UPDATE
        `);

        // 3. Update future shows with new duration and endsAt
        for (const row of futureShowsRes.rows as any[]) {
          const startsAt = new Date(row.startsAt);
          const newEndsAt = new Date(startsAt.getTime() + data.durationMinutes! * 60 * 1000);

          await tx.execute(sql`
            UPDATE shows
            SET ends_at = ${newEndsAt},
                duration_minutes_snapshot = ${data.durationMinutes}
            WHERE id = ${row.id}
          `);
        }

        // 4. Update movie record
        return this.movieRepo.updateMovie(movieId, data, tx);
      });
    }

    return this.movieRepo.updateMovie(movieId, data);
  }

  async deleteMovie(movieId: string) {
    const existing = await this.movieRepo.getMovieById(movieId);
    if (!existing) {
      throw AppError.notFound('Movie not found');
    }

    return db.transaction(async (tx) => {
      // 1. Lock screen row
      await tx.execute(sql`SELECT id FROM cinema_screens WHERE id = 1 FOR UPDATE`);

      // 2. Lock shows for this movie
      await tx.execute(sql`
        SELECT id FROM shows WHERE movie_id = ${movieId} FOR UPDATE
      `);

      // 3. Guard: check booking history
      const bookingCount = await this.movieRepo.countBookingsForMovie(movieId, tx);
      if (bookingCount > 0) {
        throw AppError.conflict(
          'MOVIE_HAS_BOOKINGS',
          'Cannot delete a movie with existing booking history. Movie must be retained for audit records.',
        );
      }

      // 4. Guard: check active holds
      const activeHoldCount = await this.movieRepo.countActiveHoldsForMovie(movieId, tx);
      if (activeHoldCount > 0) {
        throw AppError.conflict(
          'ACTIVE_HOLDS_EXIST',
          'Cannot delete movie while active customer seat holds exist. Please wait for holds to expire.',
        );
      }

      // 5. Cascade delete unbooked shows and seats
      await this.movieRepo.deleteUnbookedShowsForMovie(movieId, tx);

      // 6. Delete movie
      await this.movieRepo.deleteMovie(movieId, tx);
    });
  }
}

export const movieService = new MovieService();

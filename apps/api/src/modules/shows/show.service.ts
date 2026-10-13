import { sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { shows, showSeats } from '../../db/schema/index.js';
import { showRepository, ShowRepository } from './show.repository.js';
import { movieRepository, MovieRepository } from '../movies/movie.repository.js';
import { generate80SeatRecords } from '../seats/seat.generator.js';
import { parseLocalToUtc } from '../../lib/clock.js';
import { AppError } from '../../lib/errors.js';
import type { CreateShowInput, ListShowsQuery } from './show.schema.js';

export class ShowService {
  constructor(
    private readonly showRepo: ShowRepository = showRepository,
    private readonly movieRepo: MovieRepository = movieRepository,
  ) {}

  async listAdminShows(filters?: ListShowsQuery) {
    return this.showRepo.listAdminShows(filters);
  }

  async getShowById(showId: string) {
    const show = await this.showRepo.getShowById(showId);
    if (!show) {
      throw AppError.notFound('Show not found');
    }
    return show;
  }

  async getShowSeatMap(showId: string, currentUserId?: string) {
    const seatMap = await this.showRepo.getShowSeatMap(showId, currentUserId);
    if (!seatMap) {
      throw AppError.notFound('Show not found');
    }
    return seatMap;
  }

  async getShowReport(showId: string) {
    const report = await this.showRepo.getShowReport(showId);
    if (!report) {
      throw AppError.notFound('Show not found');
    }
    return report;
  }

  async createShow(data: CreateShowInput) {
    const movie = await this.movieRepo.getMovieById(data.movieId);
    if (!movie) {
      throw AppError.notFound('Movie not found');
    }

    const startsAt = parseLocalToUtc(data.localDate, data.localTime);
    const endsAt = new Date(startsAt.getTime() + movie.durationMinutes * 60 * 1000);

    if (startsAt.getTime() <= Date.now()) {
      throw AppError.badRequest('Show must be scheduled for a future time');
    }

    return db.transaction(async (tx) => {
      // 1. Lock screen row 1 to prevent concurrent show scheduling collisions
      await tx.execute(sql`SELECT id FROM cinema_screens WHERE id = 1 FOR UPDATE`);

      // 2. Check for overlapping shows
      const conflict = await this.showRepo.findConflictingShow(startsAt, endsAt, 1, undefined, tx);
      if (conflict) {
        throw AppError.conflict(
          'SHOW_INTERVAL_COLLISION',
          'A show is already scheduled during this time slot on this screen.',
        );
      }

      // 3. Insert show
      const [show] = await tx
        .insert(shows)
        .values({
          movieId: data.movieId,
          screenId: 1,
          startsAt,
          endsAt,
          durationMinutesSnapshot: movie.durationMinutes,
          pricePaise: data.pricePaise,
        })
        .returning();

      if (!show) {
        throw AppError.internal('Failed to insert show');
      }

      // 4. Atomically insert 80 seats
      const seatRecords = generate80SeatRecords(show.id);
      await tx.insert(showSeats).values(seatRecords);

      return show;
    });
  }

  async deleteShow(showId: string) {
    return db.transaction(async (tx) => {
      // 1. Lock screen row and show row
      await tx.execute(sql`SELECT id FROM cinema_screens WHERE id = 1 FOR UPDATE`);

      const showRes = await tx.execute(sql`
        SELECT id FROM shows WHERE id = ${showId} FOR UPDATE
      `);
      if (showRes.rows.length === 0) {
        throw AppError.notFound('Show not found');
      }

      // 2. Guard: check booking history
      const bookingCount = await this.showRepo.countBookingsForShow(showId, tx);
      if (bookingCount > 0) {
        throw AppError.conflict(
          'SHOW_HAS_BOOKINGS',
          'Cannot delete a show with existing booking records.',
        );
      }

      // 3. Guard: check active holds
      const activeHoldCount = await this.showRepo.countActiveHoldsForShow(showId, tx);
      if (activeHoldCount > 0) {
        throw AppError.conflict(
          'ACTIVE_HOLDS_EXIST',
          'Cannot delete show with active customer seat holds. Please wait for holds to expire.',
        );
      }

      // 4. Delete seats, holds, and show
      await this.showRepo.deleteShow(showId, tx);
    });
  }
}

export const showService = new ShowService();

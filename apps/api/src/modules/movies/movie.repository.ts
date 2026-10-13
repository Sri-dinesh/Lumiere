import { eq, ilike, desc, count, sql } from 'drizzle-orm';
import { db, type DatabaseClient } from '../../db/client.js';
import { movies, shows, bookings } from '../../db/schema/index.js';
import type { CreateMovieInput, UpdateMovieInput, ListMoviesQuery } from './movie.schema.js';

export class MovieRepository {
  constructor(private readonly client: DatabaseClient = db) {}

  async listMovies(query: ListMoviesQuery) {
    const { page, limit, search } = query;
    const offset = (page - 1) * limit;

    const whereClause = search ? ilike(movies.title, `%${search}%`) : undefined;

    const [items, totalResult] = await Promise.all([
      this.client
        .select()
        .from(movies)
        .where(whereClause)
        .orderBy(desc(movies.createdAt))
        .limit(limit)
        .offset(offset),
      this.client.select({ count: count() }).from(movies).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      movies: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getMovieById(id: string) {
    const result = await this.client.select().from(movies).where(eq(movies.id, id)).limit(1);
    return result[0] || null;
  }

  async createMovie(data: CreateMovieInput) {
    const result = await this.client.insert(movies).values(data).returning();
    return result[0]!;
  }

  async updateMovie(id: string, data: UpdateMovieInput, tx?: any) {
    const dbClient = tx || this.client;
    const result = await dbClient
      .update(movies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(movies.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteMovie(id: string, tx?: any) {
    const dbClient = tx || this.client;
    await dbClient.delete(movies).where(eq(movies.id, id));
  }

  /**
   * Check if any booking history (including cancelled) exists across all shows for this movie.
   */
  async countBookingsForMovie(movieId: string, tx?: any): Promise<number> {
    const dbClient = tx || this.client;
    const result = await dbClient
      .select({ count: count() })
      .from(bookings)
      .innerJoin(shows, eq(bookings.showId, shows.id))
      .where(eq(shows.movieId, movieId));
    return result[0]?.count ?? 0;
  }

  /**
   * Check if any active unexpired holds exist across shows for this movie.
   */
  async countActiveHoldsForMovie(movieId: string, tx?: any): Promise<number> {
    const dbClient = tx || this.client;
    const result = await dbClient.execute(sql`
      SELECT count(*)::int as count
      FROM holds h
      JOIN shows s ON h.show_id = s.id
      WHERE s.movie_id = ${movieId}
        AND h.status = 'ACTIVE'
        AND h.expires_at > clock_timestamp()
    `);
    return (result.rows[0] as { count: number })?.count ?? 0;
  }

  /**
   * Clean up child hold_seats, holds, show_seats, and shows for unbooked movie shows.
   */
  async deleteUnbookedShowsForMovie(movieId: string, tx: any): Promise<void> {
    // 1. Clear hold pointers on show_seats
    await tx.execute(sql`
      UPDATE show_seats 
      SET hold_id = NULL, held_until = NULL 
      WHERE show_id IN (SELECT id FROM shows WHERE movie_id = ${movieId})
    `);

    // 2. Delete hold_seats
    await tx.execute(sql`
      DELETE FROM hold_seats
      WHERE show_id IN (SELECT id FROM shows WHERE movie_id = ${movieId})
    `);

    // 3. Delete holds
    await tx.execute(sql`
      DELETE FROM holds
      WHERE show_id IN (SELECT id FROM shows WHERE movie_id = ${movieId})
    `);

    // 4. Delete show_seats
    await tx.execute(sql`
      DELETE FROM show_seats
      WHERE show_id IN (SELECT id FROM shows WHERE movie_id = ${movieId})
    `);

    // 5. Delete shows
    await tx.execute(sql`
      DELETE FROM shows
      WHERE movie_id = ${movieId}
    `);
  }
}

export const movieRepository = new MovieRepository();

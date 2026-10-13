import { eq, sql } from 'drizzle-orm';
import { db, type DatabaseClient } from '../../db/client.js';
import { bookings } from '../../db/schema/index.js';

export interface FutureShowProjection {
  id: string;
  movieId: string;
  startsAt: Date;
  endsAt: Date;
  pricePaise: number;
  availableCount: number;
}

export class ShowRepository {
  constructor(private readonly client: DatabaseClient = db) {}

  /**
   * Retrieves all future shows for a movie with single-query availableCount calculation.
   */
  async getFutureShowsForMovie(movieId: string): Promise<FutureShowProjection[]> {
    const result = await this.client.execute(sql`
      WITH ct AS (SELECT clock_timestamp() AS t)
      SELECT 
        s.id,
        s.movie_id as "movieId",
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        s.price_paise as "pricePaise",
        COUNT(ss.seat_code) FILTER (
          WHERE ss.current_booking_id IS NULL 
            AND (ss.hold_id IS NULL OR ss.held_until <= ct.t)
        )::int as "availableCount"
      FROM shows s
      CROSS JOIN ct
      LEFT JOIN show_seats ss ON s.id = ss.show_id
      WHERE s.movie_id = ${movieId}
        AND s.starts_at > ct.t
      GROUP BY s.id, ct.t
      ORDER BY s.starts_at ASC
    `);

    return (result.rows as unknown as FutureShowProjection[]).map((row) => ({
      ...row,
      startsAt: new Date(row.startsAt),
      endsAt: new Date(row.endsAt),
    }));
  }

  async getShowById(showId: string) {
    const result = await this.client.execute(sql`
      WITH ct AS (SELECT clock_timestamp() AS t)
      SELECT 
        s.id,
        s.movie_id as "movieId",
        m.title as "movieTitle",
        s.screen_id as "screenId",
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        s.duration_minutes_snapshot as "durationMinutesSnapshot",
        s.price_paise as "pricePaise",
        COUNT(ss.seat_code) FILTER (
          WHERE ss.current_booking_id IS NULL 
            AND (ss.hold_id IS NULL OR ss.held_until <= ct.t)
        )::int as "availableCount"
      FROM shows s
      CROSS JOIN ct
      JOIN movies m ON s.movie_id = m.id
      LEFT JOIN show_seats ss ON s.id = ss.show_id
      WHERE s.id = ${showId}
      GROUP BY s.id, m.title, ct.t
      LIMIT 1
    `);

    const row = result.rows[0] as any;
    if (!row) return null;

    return {
      ...row,
      startsAt: new Date(row.startsAt),
      endsAt: new Date(row.endsAt),
    };
  }

  /**
   * Check for schedule collision under screen lock
   */
  async findConflictingShow(
    startsAt: Date,
    endsAt: Date,
    screenId = 1,
    excludeShowId?: string,
    tx?: any,
  ) {
    const dbClient = tx || this.client;
    const excludeClause = excludeShowId ? sql`AND id <> ${excludeShowId}` : sql``;

    const result = await dbClient.execute(sql`
      SELECT id, starts_at as "startsAt", ends_at as "endsAt"
      FROM shows
      WHERE screen_id = ${screenId}
        AND starts_at < ${endsAt}
        AND ends_at > ${startsAt}
        ${excludeClause}
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  async countBookingsForShow(showId: string, tx?: any): Promise<number> {
    const dbClient = tx || this.client;
    const result = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(eq(bookings.showId, showId));
    return result[0]?.count ?? 0;
  }

  async countActiveHoldsForShow(showId: string, tx?: any): Promise<number> {
    const dbClient = tx || this.client;
    const result = await dbClient.execute(sql`
      SELECT count(*)::int as count
      FROM holds
      WHERE show_id = ${showId}
        AND status = 'ACTIVE'
        AND expires_at > clock_timestamp()
    `);
    return (result.rows[0] as { count: number })?.count ?? 0;
  }

  async deleteShow(showId: string, tx: any): Promise<void> {
    // 1. Clear hold pointers on show_seats
    await tx.execute(sql`
      UPDATE show_seats
      SET hold_id = NULL, held_until = NULL
      WHERE show_id = ${showId}
    `);

    // 2. Delete hold_seats
    await tx.execute(sql`DELETE FROM hold_seats WHERE show_id = ${showId}`);

    // 3. Delete holds
    await tx.execute(sql`DELETE FROM holds WHERE show_id = ${showId}`);

    // 4. Delete show_seats
    await tx.execute(sql`DELETE FROM show_seats WHERE show_id = ${showId}`);

    // 5. Delete show
    await tx.execute(sql`DELETE FROM shows WHERE id = ${showId}`);
  }

  async listAdminShows(filters?: { date?: string; movieId?: string }) {
    const conditions = [];
    if (filters?.movieId) {
      conditions.push(sql`s.movie_id = ${filters.movieId}`);
    }
    if (filters?.date) {
      conditions.push(sql`date(timezone('Asia/Kolkata', s.starts_at)) = ${filters.date}::date`);
    }

    const whereClause =
      conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

    const result = await this.client.execute(sql`
      WITH ct AS (SELECT clock_timestamp() AS t)
      SELECT 
        s.id,
        s.movie_id as "movieId",
        m.title as "movieTitle",
        m.duration_minutes as "movieDurationMinutes",
        s.screen_id as "screenId",
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        s.price_paise as "pricePaise",
        COUNT(ss.seat_code) FILTER (
          WHERE ss.current_booking_id IS NOT NULL
        )::int as "bookedCount",
        COUNT(ss.seat_code) FILTER (
          WHERE ss.current_booking_id IS NULL AND (ss.hold_id IS NULL OR ss.held_until <= ct.t)
        )::int as "availableCount",
        COUNT(ss.seat_code)::int as "totalSeats"
      FROM shows s
      CROSS JOIN ct
      JOIN movies m ON s.movie_id = m.id
      LEFT JOIN show_seats ss ON s.id = ss.show_id
      ${whereClause}
      GROUP BY s.id, m.title, m.duration_minutes, ct.t
      ORDER BY s.starts_at ASC
    `);

    return (result.rows as any[]).map((row) => ({
      ...row,
      startsAt: new Date(row.startsAt),
      endsAt: new Date(row.endsAt),
    }));
  }

  async getShowSeatMap(showId: string, currentUserId?: string) {
    // 1. Fetch show header info
    const showInfoRes = await this.client.execute(sql`
      SELECT 
        s.id,
        s.movie_id as "movieId",
        m.title as "movieTitle",
        s.screen_id as "screenId",
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        s.price_paise as "pricePaise"
      FROM shows s
      JOIN movies m ON s.movie_id = m.id
      WHERE s.id = ${showId}
      LIMIT 1
    `);

    const showRow = showInfoRes.rows[0] as any;
    if (!showRow) return null;

    // 2. Fetch all 80 seats with dynamic status based on clock_timestamp()
    const seatsRes = await this.client.execute(sql`
      WITH ct AS (SELECT clock_timestamp() AS t)
      SELECT 
        ss.seat_code as "seatCode",
        ss.row_label as "row",
        ss.seat_number as "seatNumber",
        CASE 
          WHEN ss.current_booking_id IS NOT NULL THEN 'BOOKED'
          WHEN ss.hold_id IS NOT NULL AND ss.held_until > ct.t THEN 'HELD'
          ELSE 'AVAILABLE'
        END AS "status",
        CASE 
          WHEN ss.current_booking_id IS NULL 
               AND ss.hold_id IS NOT NULL 
               AND ss.held_until > ct.t 
               AND h.user_id = ${currentUserId || null}
          THEN TRUE
          ELSE FALSE
        END AS "heldByCurrentUser",
        CASE 
          WHEN ss.current_booking_id IS NULL AND ss.hold_id IS NOT NULL AND ss.held_until > ct.t
          THEN ss.held_until
          ELSE NULL
        END AS "holdExpiresAt"
      FROM show_seats ss
      CROSS JOIN ct
      LEFT JOIN holds h ON ss.hold_id = h.id
      WHERE ss.show_id = ${showId}
      ORDER BY ss.row_label ASC, ss.seat_number ASC
    `);

    const seats = (seatsRes.rows as any[]).map((s) => ({
      seatCode: s.seatCode,
      row: s.row,
      seatNumber: s.seatNumber,
      status: s.status as 'AVAILABLE' | 'HELD' | 'BOOKED',
      heldByCurrentUser: Boolean(s.heldByCurrentUser),
      holdExpiresAt: s.holdExpiresAt ? new Date(s.holdExpiresAt).toISOString() : null,
    }));

    let availableCount = 0;
    let bookedCount = 0;
    let heldCount = 0;

    for (const seat of seats) {
      if (seat.status === 'AVAILABLE') availableCount++;
      else if (seat.status === 'BOOKED') bookedCount++;
      else if (seat.status === 'HELD') heldCount++;
    }

    // 3. Check if current user has an active hold
    let currentUserActiveHold = null;
    if (currentUserId) {
      const activeHoldRes = await this.client.execute(sql`
        SELECT 
          h.id as "holdId",
          h.expires_at as "expiresAt",
          GREATEST(0, EXTRACT(EPOCH FROM (h.expires_at - clock_timestamp()))::int) as "secondsRemaining",
          array_agg(hs.seat_code ORDER BY hs.seat_code) as "seatCodes"
        FROM holds h
        JOIN hold_seats hs ON h.id = hs.hold_id
        WHERE h.show_id = ${showId}
          AND h.user_id = ${currentUserId}
          AND h.status = 'ACTIVE'
          AND h.expires_at > clock_timestamp()
        GROUP BY h.id, h.expires_at
        LIMIT 1
      `);

      const holdRow = activeHoldRes.rows[0] as any;
      if (holdRow) {
        currentUserActiveHold = {
          holdId: holdRow.holdId,
          seatCodes: holdRow.seatCodes as string[],
          expiresAt: new Date(holdRow.expiresAt).toISOString(),
          secondsRemaining: Number(holdRow.secondsRemaining),
        };
      }
    }

    return {
      showId: showRow.id,
      movieId: showRow.movieId,
      movieTitle: showRow.movieTitle,
      screenId: showRow.screenId,
      startsAt: new Date(showRow.startsAt).toISOString(),
      endsAt: new Date(showRow.endsAt).toISOString(),
      pricePaise: showRow.pricePaise,
      totalSeats: seats.length,
      availableCount,
      bookedCount,
      heldCount,
      seats,
      currentUserActiveHold,
    };
  }

  /**
   * Generates admin show report including occupancy, revenue, booked seats, and customer orders (Bonus B9).
   */
  async getShowReport(showId: string) {
    const showRes = await this.client.execute(sql`
      SELECT 
        s.id,
        s.movie_id as "movieId",
        m.title as "movieTitle",
        s.screen_id as "screenId",
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        s.price_paise as "pricePaise"
      FROM shows s
      JOIN movies m ON s.movie_id = m.id
      WHERE s.id = ${showId}
      LIMIT 1
    `);

    const show = showRes.rows[0] as any;
    if (!show) return null;

    // Confirmed bookings
    const bookingsRes = await this.client.execute(sql`
      SELECT 
        b.id as "bookingId",
        u.name as "customerName",
        u.email as "customerEmail",
        b.total_paise as "totalPaise",
        b.created_at as "bookedAt",
        array_agg(bs.seat_code ORDER BY bs.seat_code) as "seatCodes"
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN booking_seats bs ON b.id = bs.booking_id
      WHERE b.show_id = ${showId}
        AND b.status = 'CONFIRMED'
        AND bs.released_at IS NULL
      GROUP BY b.id, u.name, u.email, b.total_paise, b.created_at
      ORDER BY b.created_at DESC
    `);

    const bookingsList = (bookingsRes.rows as any[]).map((r) => ({
      bookingId: r.bookingId,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      totalPaise: Number(r.totalPaise),
      bookedAt: new Date(r.bookedAt).toISOString(),
      seatCodes: r.seatCodes as string[],
    }));

    let bookedCount = 0;
    let simulatedRevenuePaise = 0;
    for (const b of bookingsList) {
      bookedCount += b.seatCodes.length;
      simulatedRevenuePaise += b.totalPaise;
    }

    const totalSeats = 80;
    const occupancyPercent = Number(((bookedCount / totalSeats) * 100).toFixed(1));

    // Seats overview
    const seatsRes = await this.client.execute(sql`
      SELECT 
        ss.seat_code as "seatCode",
        ss.row_label as "row",
        ss.seat_number as "seatNumber",
        CASE 
          WHEN ss.current_booking_id IS NOT NULL THEN 'BOOKED'
          WHEN ss.hold_id IS NOT NULL AND ss.held_until > clock_timestamp() THEN 'HELD'
          ELSE 'AVAILABLE'
        END as "status"
      FROM show_seats ss
      WHERE ss.show_id = ${showId}
      ORDER BY ss.row_label ASC, ss.seat_number ASC
    `);

    const seats = (seatsRes.rows as any[]).map((s) => ({
      seatCode: s.seatCode,
      row: s.row,
      seatNumber: s.seatNumber,
      status: s.status as 'AVAILABLE' | 'HELD' | 'BOOKED',
    }));

    return {
      showId: show.id,
      movieTitle: show.movieTitle,
      screenId: show.screenId,
      startsAt: new Date(show.startsAt).toISOString(),
      endsAt: new Date(show.endsAt).toISOString(),
      pricePaise: Number(show.pricePaise),
      totalSeats,
      bookedCount,
      occupancyPercent,
      simulatedRevenuePaise,
      bookings: bookingsList,
      seats,
    };
  }
}

export const showRepository = new ShowRepository();

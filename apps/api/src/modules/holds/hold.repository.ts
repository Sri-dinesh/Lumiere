import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { db, type DatabaseClient } from '../../db/client.js';
import { holdSeats } from '../../db/schema/index.js';
import { AppError } from '../../lib/errors.js';

export interface CreateHoldParams {
  userId: string;
  showId: string;
  seatCodes: string[];
  requestKey?: string;
}

export interface HoldResult {
  holdId: string;
  showId: string;
  seatCodes: string[];
  expiresAt: string;
  secondsRemaining: number;
  totalPaise: number;
}

export class HoldRepository {
  constructor(private readonly client: DatabaseClient = db) {}

  /**
   * Concurrency-safe hold creation implementing:
   * 1. Show-row FOR UPDATE mutex lock
   * 2. Active hold per user per show check
   * 3. Deterministic seat-row FOR UPDATE lock
   * 4. 300s TTL using clock_timestamp()
   */
  async createHold(params: CreateHoldParams): Promise<HoldResult> {
    const { userId, showId, seatCodes, requestKey } = params;

    return db.transaction(async (tx) => {
      // 1. Lock show row
      const showRes = await tx.execute(sql`
        SELECT 
          id, 
          starts_at as "startsAt", 
          price_paise as "pricePaise",
          (starts_at <= clock_timestamp()) as "hasStarted"
        FROM shows
        WHERE id = ${showId}
        FOR UPDATE
      `);

      const show = showRes.rows[0] as any;
      if (!show) {
        throw AppError.notFound('Show not found');
      }

      if (show.hasStarted) {
        throw AppError.conflict(
          'SHOW_STARTED',
          'Cannot hold seats for a show that has already started.',
        );
      }

      // Eagerly expire any stale active holds for this user on this show
      await tx.execute(sql`
        UPDATE holds
        SET status = 'EXPIRED'
        WHERE show_id = ${showId}
          AND user_id = ${userId}
          AND status = 'ACTIVE'
          AND expires_at <= clock_timestamp()
      `);

      // 2. Check if user already has an active hold on this show
      const existingUserHoldRes = await tx.execute(sql`
        SELECT id
        FROM holds
        WHERE show_id = ${showId}
          AND user_id = ${userId}
          AND status = 'ACTIVE'
          AND expires_at > clock_timestamp()
        FOR UPDATE
      `);

      if (existingUserHoldRes.rows.length > 0) {
        throw AppError.conflict(
          'HOLD_ALREADY_ACTIVE',
          'You already have an active seat hold for this show. Please complete payment or release the current hold.',
        );
      }

      // 3. Lock requested seats in deterministic alphabetical order to avoid deadlocks
      const sortedSeats = [...seatCodes].sort();
      const seatInClause = sql.join(
        sortedSeats.map((code) => sql`${code}`),
        sql`, `,
      );

      const seatRowsRes = await tx.execute(sql`
        WITH ct AS (SELECT clock_timestamp() AS t)
        SELECT 
          ss.seat_code as "seatCode",
          ss.current_booking_id as "currentBookingId",
          ss.hold_id as "holdId",
          ss.held_until as "heldUntil",
          (ss.current_booking_id IS NOT NULL OR (ss.hold_id IS NOT NULL AND ss.held_until > ct.t)) as "isUnavailable"
        FROM show_seats ss
        CROSS JOIN ct
        WHERE ss.show_id = ${showId}
          AND ss.seat_code IN (${seatInClause})
        ORDER BY ss.seat_code ASC
        FOR UPDATE
      `);

      const lockedSeats = seatRowsRes.rows as any[];

      // Verify all requested seats exist in this show
      if (lockedSeats.length !== sortedSeats.length) {
        const foundSeatCodes = new Set(lockedSeats.map((s) => s.seatCode));
        const missingSeats = sortedSeats.filter((code) => !foundSeatCodes.has(code));
        throw AppError.badRequest(
          `The following seat codes do not exist for this show: ${missingSeats.join(', ')}`,
        );
      }

      // Check if any seat is unavailable
      const conflicting = lockedSeats.filter((s) => s.isUnavailable).map((s) => s.seatCode);
      if (conflicting.length > 0) {
        throw AppError.conflict(
          'SEAT_UNAVAILABLE',
          `The following seats are no longer available: ${conflicting.join(', ')}`,
          { conflictingSeats: conflicting },
        );
      }

      // 4. Insert active hold (300 seconds TTL based on clock_timestamp())
      const effectiveRequestKey =
        requestKey &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey)
          ? requestKey
          : randomUUID();

      const holdRes = await tx.execute(sql`
        INSERT INTO holds (user_id, show_id, status, unit_price_paise, expires_at, request_key)
        VALUES (${userId}, ${showId}, 'ACTIVE', ${show.pricePaise}, clock_timestamp() + interval '300 seconds', ${effectiveRequestKey})
        RETURNING id, expires_at as "expiresAt"
      `);

      const hold = holdRes.rows[0] as any;

      // 5. Insert hold_seats records
      const holdSeatValues = sortedSeats.map((seatCode) => ({
        holdId: hold.id,
        showId,
        seatCode,
      }));
      await tx.insert(holdSeats).values(holdSeatValues);

      // 6. Update show_seats pointers
      await tx.execute(sql`
        UPDATE show_seats
        SET hold_id = ${hold.id}, held_until = ${hold.expiresAt}
        WHERE show_id = ${showId}
          AND seat_code IN (${seatInClause})
      `);

      return {
        holdId: hold.id,
        showId,
        seatCodes: sortedSeats,
        expiresAt: new Date(hold.expiresAt).toISOString(),
        secondsRemaining: 300,
        totalPaise: Number(show.pricePaise) * sortedSeats.length,
      };
    });
  }

  async releaseHold(holdId: string, userId: string, isAdmin: boolean): Promise<{ showId: string }> {
    return db.transaction(async (tx) => {
      const holdRes = await tx.execute(sql`
        SELECT id, show_id as "showId", user_id as "userId", status
        FROM holds
        WHERE id = ${holdId}
        FOR UPDATE
      `);

      const hold = holdRes.rows[0] as any;
      if (!hold) {
        throw AppError.notFound('Hold reservation not found');
      }

      if (!isAdmin && hold.userId !== userId) {
        throw AppError.forbidden('You are not authorized to release this seat hold.');
      }

      if (hold.status === 'ACTIVE') {
        // Mark hold RELEASED
        await tx.execute(sql`
          UPDATE holds
          SET status = 'RELEASED'
          WHERE id = ${holdId}
        `);

        // Free show_seats pointers
        await tx.execute(sql`
          UPDATE show_seats
          SET hold_id = NULL, held_until = NULL
          WHERE show_id = ${hold.showId}
            AND hold_id = ${holdId}
        `);
      }

      return { showId: hold.showId };
    });
  }

  async extendHold(
    holdId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<{
    holdId: string;
    showId: string;
    expiresAt: string;
    secondsRemaining: number;
    isExtended: boolean;
  }> {
    const result = await db.transaction(async (tx) => {
      const initialHoldRes = await tx.execute(sql`
        SELECT show_id as "showId", user_id as "userId"
        FROM holds
        WHERE id = ${holdId}
        LIMIT 1
      `);

      const initialHold = initialHoldRes.rows[0] as any;
      if (!initialHold) {
        throw AppError.notFound('Hold reservation not found');
      }

      if (!isAdmin && initialHold.userId !== userId) {
        throw AppError.forbidden('You are not authorized to extend this hold reservation.');
      }

      const showId = initialHold.showId;

      // Maintain strict lock hierarchy: shows first, then holds
      await tx.execute(sql`
        SELECT id FROM shows WHERE id = ${showId} FOR UPDATE
      `);

      const holdRes = await tx.execute(sql`
        SELECT 
          id, 
          status, 
          is_extended as "isExtended", 
          expires_at as "expiresAt", 
          (expires_at <= clock_timestamp()) as "isExpired" 
        FROM holds 
        WHERE id = ${holdId} 
        FOR UPDATE
      `);

      const hold = holdRes.rows[0] as any;
      if (!hold) {
        throw AppError.notFound('Hold reservation not found');
      }

      if (hold.status !== 'ACTIVE') {
        throw AppError.conflict('HOLD_NOT_ACTIVE', 'Hold reservation is no longer active.');
      }

      if (hold.isExpired) {
        await tx.execute(sql`UPDATE holds SET status = 'EXPIRED' WHERE id = ${holdId}`);
        await tx.execute(sql`
          UPDATE show_seats 
          SET hold_id = NULL, held_until = NULL 
          WHERE show_id = ${showId} AND hold_id = ${holdId}
        `);
        return { isExpired: true, showId };
      }

      if (hold.isExtended) {
        throw AppError.conflict(
          'HOLD_ALREADY_EXTENDED',
          'Hold has already been extended. Only one 2-minute extension is permitted per hold.',
        );
      }

      const updateRes = await tx.execute(sql`
        UPDATE holds 
        SET 
          expires_at = expires_at + interval '120 seconds', 
          is_extended = true, 
          extended_at = clock_timestamp() 
        WHERE id = ${holdId} 
        RETURNING 
          expires_at as "expiresAt", 
          GREATEST(0, EXTRACT(EPOCH FROM (expires_at - clock_timestamp()))::int) as "secondsRemaining"
      `);

      const updated = updateRes.rows[0] as any;

      await tx.execute(sql`
        UPDATE show_seats 
        SET held_until = ${updated.expiresAt} 
        WHERE show_id = ${showId} AND hold_id = ${holdId}
      `);

      return {
        holdId,
        showId,
        expiresAt: new Date(updated.expiresAt).toISOString(),
        secondsRemaining: Number(updated.secondsRemaining),
        isExtended: true,
      };
    });

    if ('isExpired' in result && result.isExpired) {
      throw AppError.conflict(
        'HOLD_EXPIRED',
        'Your seat hold has expired. Please select seats again.',
      );
    }

    return result as {
      holdId: string;
      showId: string;
      expiresAt: string;
      secondsRemaining: number;
      isExtended: boolean;
    };
  }

  async getHoldById(holdId: string) {
    const result = await this.client.execute(sql`
      SELECT 
        h.id,
        h.user_id as "userId",
        h.show_id as "showId",
        h.status,
        h.expires_at as "expiresAt",
        GREATEST(0, EXTRACT(EPOCH FROM (h.expires_at - clock_timestamp()))::int) as "secondsRemaining",
        h.is_extended as "isExtended",
        m.title as "movieTitle",
        s.starts_at as "startsAt",
        s.price_paise as "pricePaise",
        array_agg(hs.seat_code ORDER BY hs.seat_code) as "seatCodes"
      FROM holds h
      JOIN shows s ON h.show_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN hold_seats hs ON h.id = hs.hold_id
      WHERE h.id = ${holdId}
      GROUP BY h.id, m.title, s.starts_at, s.price_paise, h.is_extended
      LIMIT 1
    `);

    const row = result.rows[0] as any;
    if (!row) return null;

    const secondsRemaining = Number(row.secondsRemaining);
    const isExtended = Boolean(row.isExtended);
    const canExtend = Boolean(row.status === 'ACTIVE' && !isExtended && secondsRemaining > 0);

    return {
      id: row.id,
      userId: row.userId,
      showId: row.showId,
      status: row.status,
      expiresAt: new Date(row.expiresAt).toISOString(),
      secondsRemaining,
      isExtended,
      canExtend,
      movieTitle: row.movieTitle,
      startsAt: new Date(row.startsAt).toISOString(),
      pricePaise: Number(row.pricePaise),
      seatCodes: row.seatCodes as string[],
      totalPaise: Number(row.pricePaise) * (row.seatCodes as string[]).length,
    };
  }
}

export const holdRepository = new HoldRepository();

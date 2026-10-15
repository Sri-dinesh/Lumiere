import { sql } from 'drizzle-orm';
import { db, type DatabaseClient } from '../../db/client.js';
import { bookings, bookingSeats } from '../../db/schema/index.js';
import { AppError } from '../../lib/errors.js';

export interface ProcessPaymentParams {
  holdId: string;
  userId: string;
  outcome?: 'success' | 'failure';
  paymentAction?: 'CONFIRM' | 'DECLINE';
  paymentReference?: string;
}

export interface BookingDetail {
  id: string;
  userId: string;
  showId: string;
  movieTitle: string;
  posterUrl: string | null;
  screenId: number;
  startsAt: string;
  endsAt: string;
  seatCodes: string[];
  totalPaise: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  cancelledAt: string | null;
  canCancel: boolean;
}

export class BookingRepository {
  constructor(private readonly client: DatabaseClient = db) {}

  /**
   * Concurrency-safe atomic payment confirmation and booking generation.
   */
  async processPayment(params: ProcessPaymentParams) {
    const { holdId, userId, outcome, paymentAction } = params;

    return db.transaction(async (tx) => {
      // 1. Initial lookup to get showId
      const initialHoldRes = await tx.execute(sql`
        SELECT id, user_id as "userId", show_id as "showId", status
        FROM holds
        WHERE id = ${holdId}
      `);

      const initialHold = initialHoldRes.rows[0] as any;
      if (!initialHold) {
        throw AppError.notFound('Hold reservation not found');
      }

      if (initialHold.userId !== userId) {
        throw AppError.forbidden('You are not authorized to complete payment for this hold.');
      }

      // 2. Lock show row first, then hold row (strict lock hierarchy)
      await tx.execute(sql`
        SELECT id, starts_at, price_paise
        FROM shows
        WHERE id = ${initialHold.showId}
        FOR UPDATE
      `);

      const holdRes = await tx.execute(sql`
        SELECT 
          id, 
          user_id as "userId", 
          show_id as "showId", 
          status, 
          unit_price_paise as "unitPricePaise",
          expires_at as "expiresAt",
          (expires_at <= clock_timestamp()) as "isExpired"
        FROM holds
        WHERE id = ${holdId}
        FOR UPDATE
      `);

      const hold = holdRes.rows[0] as any;

      // 3. Idempotency check: if hold was already CONSUMED, return the existing booking
      if (hold.status === 'CONSUMED') {
        if (outcome === 'failure' || paymentAction === 'DECLINE') {
          throw AppError.conflict('HOLD_ALREADY_CONSUMED', 'This hold has already been completed.');
        }

        const existingBookingRes = await tx.execute(sql`
          SELECT id, status, total_paise as "totalPaise", created_at as "createdAt"
          FROM bookings
          WHERE hold_id = ${holdId}
          LIMIT 1
        `);
        const existingBooking = existingBookingRes.rows[0] as any;
        if (existingBooking) {
          const seatRows = await tx.execute(sql`
            SELECT seat_code as "seatCode" FROM booking_seats WHERE booking_id = ${existingBooking.id} ORDER BY seat_code ASC
          `);
          const seatCodes = (seatRows.rows as any[]).map((r) => r.seatCode);

          const showDetailsRes = await tx.execute(sql`
            SELECT m.id as "movieId", m.title as "movieTitle", s.starts_at as "startsAt"
            FROM shows s JOIN movies m ON s.movie_id = m.id WHERE s.id = ${hold.showId}
          `);
          const showDetails = showDetailsRes.rows[0] as any;

          return {
            bookingId: existingBooking.id,
            showId: hold.showId,
            status: existingBooking.status,
            movie: {
              id: showDetails?.movieId,
              title: showDetails?.movieTitle,
            },
            show: {
              id: hold.showId,
              startsAt: showDetails ? new Date(showDetails.startsAt).toISOString() : '',
            },
            seats: seatCodes,
            seatCodes,
            totalPaise: Number(existingBooking.totalPaise),
            currency: 'INR',
            bookedAt: new Date(existingBooking.createdAt).toISOString(),
            createdAt: new Date(existingBooking.createdAt).toISOString(),
            isIdempotentReplay: true,
          };
        }
      }

      // 4. Verify hold is active and not expired
      if (hold.status !== 'ACTIVE') {
        throw AppError.conflict('HOLD_NOT_ACTIVE', 'Seat hold reservation is no longer active.');
      }

      if (hold.isExpired) {
        // Mark hold EXPIRED and clear show_seats pointers
        await tx.execute(sql`UPDATE holds SET status = 'EXPIRED' WHERE id = ${holdId}`);
        await tx.execute(sql`
          UPDATE show_seats 
          SET hold_id = NULL, held_until = NULL 
          WHERE show_id = ${hold.showId} AND hold_id = ${holdId}
        `);
        throw AppError.conflict(
          'HOLD_EXPIRED',
          'Your seat hold has expired. Please select seats again.',
        );
      }

      // 5. Handle simulated payment failure/decline
      if (outcome === 'failure') {
        return {
          status: 'FAILED' as const,
          retryable: true,
          message: 'Payment failed. You can try again before your hold expires.',
          expiresAt: new Date(hold.expiresAt).toISOString(),
          isIdempotentReplay: false,
        };
      }

      if (paymentAction === 'DECLINE') {
        // Hold remains ACTIVE for the remaining duration
        throw AppError.badRequest(
          'Simulated payment declined by bank. Your seat hold remains active until expiration.',
          { code: 'PAYMENT_DECLINED' },
        );
      }

      // 6. Confirm payment -> create atomic booking
      const seatRowsRes = await tx.execute(sql`
        SELECT seat_code as "seatCode"
        FROM hold_seats
        WHERE hold_id = ${holdId}
        ORDER BY seat_code ASC
      `);

      const seatCodes = (seatRowsRes.rows as any[]).map((r) => r.seatCode);
      const totalPaise = Number(hold.unitPricePaise) * seatCodes.length;

      // Insert booking record
      const [booking] = await tx
        .insert(bookings)
        .values({
          userId,
          showId: hold.showId,
          holdId: hold.id,
          status: 'CONFIRMED',
          totalPaise,
        })
        .returning();

      if (!booking) {
        throw AppError.internal('Failed to record booking transaction');
      }

      // Insert booking_seats records
      const bookingSeatRecords = seatCodes.map((seatCode) => ({
        bookingId: booking.id,
        showId: hold.showId,
        seatCode,
        unitPricePaise: Number(hold.unitPricePaise),
        releasedAt: null,
      }));
      await tx.insert(bookingSeats).values(bookingSeatRecords);

      // Update show_seats pointers to confirm ownership
      const seatInClause = sql.join(
        seatCodes.map((c) => sql`${c}`),
        sql`, `,
      );
      await tx.execute(sql`
        UPDATE show_seats
        SET current_booking_id = ${booking.id},
            hold_id = NULL,
            held_until = NULL,
            updated_at = clock_timestamp()
        WHERE show_id = ${hold.showId}
          AND seat_code IN (${seatInClause})
      `);

      // Mark hold CONSUMED
      await tx.execute(sql`
        UPDATE holds
        SET status = 'CONSUMED'
        WHERE id = ${hold.id}
      `);

      // Fetch movie and show metadata
      const showDetailsRes = await tx.execute(sql`
        SELECT m.id as "movieId", m.title as "movieTitle", s.starts_at as "startsAt"
        FROM shows s JOIN movies m ON s.movie_id = m.id WHERE s.id = ${hold.showId}
      `);
      const showDetails = showDetailsRes.rows[0] as any;

      return {
        bookingId: booking.id,
        showId: hold.showId,
        status: booking.status,
        movie: {
          id: showDetails?.movieId,
          title: showDetails?.movieTitle,
        },
        show: {
          id: hold.showId,
          startsAt: showDetails ? new Date(showDetails.startsAt).toISOString() : '',
        },
        seats: seatCodes,
        seatCodes,
        totalPaise,
        currency: 'INR',
        bookedAt: new Date(booking.createdAt).toISOString(),
        createdAt: new Date(booking.createdAt).toISOString(),
        isIdempotentReplay: false,
      };
    });
  }

  async listUserBookings(userId: string): Promise<BookingDetail[]> {
    const result = await this.client.execute(sql`
      SELECT 
        b.id,
        b.user_id as "userId",
        b.show_id as "showId",
        m.title as "movieTitle",
        m.poster_url as "posterUrl",
        s.screen_id as "screenId",
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        b.status,
        b.total_paise as "totalPaise",
        b.created_at as "createdAt",
        b.cancelled_at as "cancelledAt",
        (b.status = 'CONFIRMED' AND s.starts_at > clock_timestamp() + interval '2 hours') as "canCancel",
        array_agg(bs.seat_code ORDER BY bs.seat_code) as "seatCodes"
      FROM bookings b
      JOIN shows s ON b.show_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN booking_seats bs ON b.id = bs.booking_id
      WHERE b.user_id = ${userId}
      GROUP BY b.id, m.title, m.poster_url, s.screen_id, s.starts_at, s.ends_at
      ORDER BY b.created_at DESC
    `);

    return (result.rows as any[]).map((row) => ({
      id: row.id,
      userId: row.userId,
      showId: row.showId,
      movieTitle: row.movieTitle,
      posterUrl: row.posterUrl,
      screenId: row.screenId,
      startsAt: new Date(row.startsAt).toISOString(),
      endsAt: new Date(row.endsAt).toISOString(),
      seatCodes: row.seatCodes as string[],
      totalPaise: Number(row.totalPaise),
      status: row.status,
      createdAt: new Date(row.createdAt).toISOString(),
      cancelledAt: row.cancelledAt ? new Date(row.cancelledAt).toISOString() : null,
      canCancel: Boolean(row.canCancel),
    }));
  }

  async getBookingById(bookingId: string) {
    const result = await this.client.execute(sql`
      SELECT 
        b.id,
        b.user_id as "userId",
        b.show_id as "showId",
        m.title as "movieTitle",
        m.poster_url as "posterUrl",
        m.duration_minutes as "durationMinutes",
        m.rating,
        m.language,
        s.screen_id as "screenId",
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        s.price_paise as "unitPricePaise",
        b.status,
        b.total_paise as "totalPaise",
        b.created_at as "createdAt",
        b.cancelled_at as "cancelledAt",
        (b.status = 'CONFIRMED' AND s.starts_at > clock_timestamp() + interval '2 hours') as "canCancel",
        array_agg(bs.seat_code ORDER BY bs.seat_code) as "seatCodes"
      FROM bookings b
      JOIN shows s ON b.show_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN booking_seats bs ON b.id = bs.booking_id
      WHERE b.id = ${bookingId}
      GROUP BY b.id, m.title, m.poster_url, m.duration_minutes, m.rating, m.language, s.screen_id, s.starts_at, s.ends_at, s.price_paise
      LIMIT 1
    `);

    const row = result.rows[0] as any;
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      showId: row.showId,
      movieTitle: row.movieTitle,
      posterUrl: row.posterUrl,
      durationMinutes: row.durationMinutes,
      rating: row.rating,
      language: row.language,
      screenId: row.screenId,
      startsAt: new Date(row.startsAt).toISOString(),
      endsAt: new Date(row.endsAt).toISOString(),
      unitPricePaise: Number(row.unitPricePaise),
      seatCodes: row.seatCodes as string[],
      totalPaise: Number(row.totalPaise),
      status: row.status as 'CONFIRMED' | 'CANCELLED',
      createdAt: new Date(row.createdAt).toISOString(),
      cancelledAt: row.cancelledAt ? new Date(row.cancelledAt).toISOString() : null,
      canCancel: Boolean(row.canCancel),
    };
  }

  async cancelBooking(bookingId: string, userId: string, isAdmin: boolean) {
    return db.transaction(async (tx) => {
      // 1. Lock booking
      const bookingRes = await tx.execute(sql`
        SELECT id, user_id as "userId", show_id as "showId", status
        FROM bookings
        WHERE id = ${bookingId}
        FOR UPDATE
      `);

      const booking = bookingRes.rows[0] as any;
      if (!booking) {
        throw AppError.notFound('Booking not found');
      }

      if (!isAdmin && booking.userId !== userId) {
        throw AppError.forbidden('You are not authorized to cancel this booking.');
      }

      if (booking.status === 'CANCELLED') {
        throw AppError.conflict(
          'BOOKING_ALREADY_CANCELLED',
          'This booking has already been cancelled.',
        );
      }

      // 2. Lock show row and check 2-hour window rule (§3.9)
      const showRes = await tx.execute(sql`
        SELECT 
          id, 
          starts_at as "startsAt",
          (starts_at <= clock_timestamp() + interval '2 hours') as "windowClosed"
        FROM shows
        WHERE id = ${booking.showId}
        FOR UPDATE
      `);

      const show = showRes.rows[0] as any;
      if (show.windowClosed) {
        throw AppError.conflict(
          'CANCELLATION_WINDOW_CLOSED',
          'Bookings can only be cancelled up to 2 hours before showtime.',
        );
      }

      // 3. Mark booking CANCELLED
      await tx.execute(sql`
        UPDATE bookings
        SET status = 'CANCELLED', cancelled_at = clock_timestamp()
        WHERE id = ${bookingId}
      `);

      // 4. Update booking_seats released_at
      await tx.execute(sql`
        UPDATE booking_seats
        SET released_at = clock_timestamp()
        WHERE booking_id = ${bookingId}
      `);

      // 5. Release seats in show_seats back to AVAILABLE
      await tx.execute(sql`
        UPDATE show_seats
        SET current_booking_id = NULL, updated_at = clock_timestamp()
        WHERE show_id = ${booking.showId}
          AND current_booking_id = ${bookingId}
      `);

      return {
        bookingId,
        showId: booking.showId,
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
      };
    });
  }
}

export const bookingRepository = new BookingRepository();

import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';

describe('Database Invariants & PostgreSQL Constraint Enforcement', () => {
  it('enforces cinema_screens id = 1 check constraint', async () => {
    await expect(
      db.execute(sql`INSERT INTO cinema_screens (id, name) VALUES (2, 'Invalid Screen')`),
    ).rejects.toThrow();
  });

  it('enforces shows_single_screen_no_overlap GiST exclusion constraint on overlapping shows', async () => {
    // Fetch an existing show to find its interval
    const showResult = await db.execute(
      sql`SELECT id, movie_id, starts_at, ends_at FROM shows LIMIT 1`,
    );
    const existingShow = showResult.rows[0] as {
      id: string;
      movie_id: string;
      starts_at: Date;
      ends_at: Date;
    };

    // Attempt to insert a show overlapping with existingShow on screen 1
    const overlapAttempt = db.execute(sql`
      INSERT INTO shows (
        movie_id, screen_id, starts_at, ends_at, duration_minutes_snapshot, price_paise
      ) VALUES (
        ${existingShow.movie_id},
        1,
        ${existingShow.starts_at},
        ${existingShow.ends_at},
        120,
        25000
      )
    `);

    // Must be rejected by PostgreSQL with SQLSTATE 23P01 (exclusion_violation)
    await expect(overlapAttempt).rejects.toThrow();
  });

  it('guarantees each seeded show has exactly 80 seats', async () => {
    const res = await db.execute(sql`
      SELECT show_id, count(*)::int as seat_count
      FROM show_seats
      GROUP BY show_id
    `);

    expect(res.rows.length).toBeGreaterThan(0);
    for (const row of res.rows as { show_id: string; seat_count: number }[]) {
      expect(row.seat_count).toBe(80);
    }
  });

  it('enforces booking_seats_one_active_ownership_idx partial unique index against duplicate active seat ownership', async () => {
    // Create isolated test fixture within a rollback transaction
    const showResult = await db.execute(sql`SELECT id, movie_id FROM shows LIMIT 1`);
    const showId = (showResult.rows[0] as { id: string }).id;

    const userResult = await db.execute(sql`SELECT id FROM users WHERE role = 'CUSTOMER' LIMIT 2`);
    const user1Id = (userResult.rows[0] as { id: string }).id;
    const user2Id = (userResult.rows[1] as { id: string }).id;

    await db
      .transaction(async (tx) => {
        // Create hold 1
        const hold1Res = await tx.execute(sql`
        INSERT INTO holds (user_id, show_id, status, unit_price_paise, expires_at, request_key)
        VALUES (${user1Id}, ${showId}, 'ACTIVE', 25000, clock_timestamp() + interval '5 minutes', gen_random_uuid())
        RETURNING id
      `);
        const hold1Id = (hold1Res.rows[0] as { id: string }).id;

        // Create hold 2
        const hold2Res = await tx.execute(sql`
        INSERT INTO holds (user_id, show_id, status, unit_price_paise, expires_at, request_key)
        VALUES (${user2Id}, ${showId}, 'ACTIVE', 25000, clock_timestamp() + interval '5 minutes', gen_random_uuid())
        RETURNING id
      `);
        const hold2Id = (hold2Res.rows[0] as { id: string }).id;

        // Create booking 1
        const booking1Res = await tx.execute(sql`
        INSERT INTO bookings (user_id, show_id, hold_id, status, total_paise)
        VALUES (${user1Id}, ${showId}, ${hold1Id}, 'CONFIRMED', 25000)
        RETURNING id
      `);
        const booking1Id = (booking1Res.rows[0] as { id: string }).id;

        // Create booking 2
        const booking2Res = await tx.execute(sql`
        INSERT INTO bookings (user_id, show_id, hold_id, status, total_paise)
        VALUES (${user2Id}, ${showId}, ${hold2Id}, 'CONFIRMED', 25000)
        RETURNING id
      `);
        const booking2Id = (booking2Res.rows[0] as { id: string }).id;

        // Insert active booking_seat for booking 1 on seat A1
        await tx.execute(sql`
        INSERT INTO booking_seats (booking_id, show_id, seat_code, unit_price_paise, released_at)
        VALUES (${booking1Id}, ${showId}, 'A1', 25000, NULL)
      `);

        // Attempt to insert active booking_seat for booking 2 on the SAME seat A1
        let rejected = false;
        try {
          await tx.execute(sql`
          INSERT INTO booking_seats (booking_id, show_id, seat_code, unit_price_paise, released_at)
          VALUES (${booking2Id}, ${showId}, 'A1', 25000, NULL)
        `);
        } catch (err: any) {
          rejected = true;
          expect(err.code || err.message).toMatch(/23505|unique/i);
        }
        expect(rejected).toBe(true);

        // Rollback tx to keep fixture clean
        throw new Error('ROLLBACK_FIXTURE');
      })
      .catch((err) => {
        if (err.message !== 'ROLLBACK_FIXTURE') throw err;
      });
  });
});

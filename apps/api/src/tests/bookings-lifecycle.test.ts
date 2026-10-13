import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';
import { DateTime } from 'luxon';

describe('Payment, Bookings Lifecycle & Cancellation Window (Phase P6)', () => {
  const app = createApp();

  let adminCookie = '';
  let customer1Cookie = '';
  let customer2Cookie = '';
  let testMovieId = '';
  let futureShowId = '';
  let nearShowId = '';

  let customer1HoldId = '';
  let customer1BookingId = '';

  beforeAll(async () => {
    // 1. Logins
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
    });
    adminCookie = (adminLogin.headers['set-cookie'] as unknown as string[])?.[0] || '';

    const c1Login = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_CUSTOMER_EMAIL,
      password: env.SEED_CUSTOMER_PASSWORD,
    });
    customer1Cookie = (c1Login.headers['set-cookie'] as unknown as string[])?.[0] || '';

    const c2Login = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_CUSTOMER_2_EMAIL,
      password: env.SEED_CUSTOMER_2_PASSWORD,
    });
    customer2Cookie = (c2Login.headers['set-cookie'] as unknown as string[])?.[0] || '';

    // 2. Create isolated test movie
    const movieRes = await request(app)
      .post('/api/v1/admin/movies')
      .set('Cookie', adminCookie)
      .send({
        title: `Booking Test Movie ${Date.now()}`,
        language: 'English',
        durationMinutes: 120,
        rating: 'UA',
      });
    testMovieId = movieRes.body.data.id;

    // 3. Create a future show (10 days ahead - eligible for cancellation)
    const futureDate = DateTime.now()
      .setZone('Asia/Kolkata')
      .plus({ days: 10 })
      .toFormat('yyyy-MM-dd');
    await db.execute(
      sql`DELETE FROM booking_seats WHERE show_id IN (SELECT id FROM shows WHERE starts_at >= ${futureDate}::date AND starts_at < (${futureDate}::date + interval '1 day'))`,
    );
    await db.execute(
      sql`DELETE FROM bookings WHERE show_id IN (SELECT id FROM shows WHERE starts_at >= ${futureDate}::date AND starts_at < (${futureDate}::date + interval '1 day'))`,
    );
    await db.execute(
      sql`DELETE FROM hold_seats WHERE show_id IN (SELECT id FROM shows WHERE starts_at >= ${futureDate}::date AND starts_at < (${futureDate}::date + interval '1 day'))`,
    );
    await db.execute(
      sql`DELETE FROM holds WHERE show_id IN (SELECT id FROM shows WHERE starts_at >= ${futureDate}::date AND starts_at < (${futureDate}::date + interval '1 day'))`,
    );
    await db.execute(
      sql`DELETE FROM show_seats WHERE show_id IN (SELECT id FROM shows WHERE starts_at >= ${futureDate}::date AND starts_at < (${futureDate}::date + interval '1 day'))`,
    );
    await db.execute(
      sql`DELETE FROM shows WHERE starts_at >= ${futureDate}::date AND starts_at < (${futureDate}::date + interval '1 day')`,
    );

    const futureShowRes = await request(app)
      .post('/api/v1/admin/shows')
      .set('Cookie', adminCookie)
      .send({
        movieId: testMovieId,
        localDate: futureDate,
        localTime: '15:00',
        pricePaise: 25000,
      });
    expect(futureShowRes.status).toBe(201);
    futureShowId = futureShowRes.body.data.id;

    // 4. Create a near show (<2 hours from now - directly via DB for cancellation window testing)
    const startsIn30Mins = new Date(Date.now() + 30 * 60 * 1000);
    const endsIn150Mins = new Date(Date.now() + 150 * 60 * 1000);
    const nearShowRes = await db.execute(sql`
      INSERT INTO shows (movie_id, screen_id, starts_at, ends_at, duration_minutes_snapshot, price_paise)
      VALUES (${testMovieId}, 1, ${startsIn30Mins}, ${endsIn150Mins}, 120, 25000)
      RETURNING id
    `);
    nearShowId = (nearShowRes.rows[0] as any).id;
  });

  it('BOOK-01: Customer 1 creates hold and simulates payment decline (400 PAYMENT_DECLINED)', async () => {
    // 1. Create hold on future show for seats A1, A2
    const holdRes = await request(app)
      .post(`/api/v1/shows/${futureShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['A1', 'A2'] });

    expect(holdRes.status).toBe(201);
    customer1HoldId = holdRes.body.data.holdId;

    // 2. Decline payment
    const declineRes = await request(app)
      .post(`/api/v1/holds/${customer1HoldId}/payment`)
      .set('Cookie', customer1Cookie)
      .send({ paymentAction: 'DECLINE' });

    expect(declineRes.status).toBe(400);
    expect(declineRes.body.error.details.code).toBe('PAYMENT_DECLINED');

    // 3. Verify hold is STILL active
    const holdCheck = await request(app)
      .get(`/api/v1/holds/${customer1HoldId}`)
      .set('Cookie', customer1Cookie);
    expect(holdCheck.status).toBe(200);
    expect(holdCheck.body.data.status).toBe('ACTIVE');
  });

  it('BOOK-02: Customer 1 confirms payment: atomic booking created and seats confirmed', async () => {
    const confirmRes = await request(app)
      .post(`/api/v1/holds/${customer1HoldId}/payment`)
      .set('Cookie', customer1Cookie)
      .send({ paymentAction: 'CONFIRM', paymentReference: 'MOCK_TXN_12345' });

    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.data.bookingId).toBeDefined();
    expect(confirmRes.body.data.status).toBe('CONFIRMED');
    expect(confirmRes.body.data.seatCodes).toEqual(['A1', 'A2']);
    expect(confirmRes.body.data.totalPaise).toBe(50000); // 2 * 25000

    customer1BookingId = confirmRes.body.data.bookingId;

    // Verify seat map reflects BOOKED status for A1, A2
    const mapRes = await request(app).get(`/api/v1/shows/${futureShowId}/seats`);
    expect(mapRes.status).toBe(200);
    expect(mapRes.body.data.bookedCount).toBe(2);
    expect(mapRes.body.data.availableCount).toBe(78);

    const seatA1 = mapRes.body.data.seats.find((s: any) => s.seatCode === 'A1');
    expect(seatA1.status).toBe('BOOKED');
  });

  it('BOOK-03: Idempotent replay: confirming payment again returns 200 with same booking', async () => {
    const replayRes = await request(app)
      .post(`/api/v1/holds/${customer1HoldId}/payment`)
      .set('Cookie', customer1Cookie)
      .send({ paymentAction: 'CONFIRM' });

    expect(replayRes.status).toBe(200);
    expect(replayRes.body.data.bookingId).toBe(customer1BookingId);
    expect(replayRes.body.data.isIdempotentReplay).toBe(true);
  });

  it('BOOK-04: Customer 1 lists bookings via GET /api/v1/bookings/me', async () => {
    const res = await request(app).get('/api/v1/bookings/me').set('Cookie', customer1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const booking = res.body.data.find((b: any) => b.id === customer1BookingId);
    expect(booking).toBeDefined();
    expect(booking.movieTitle).toContain('Booking Test Movie');
    expect(booking.seatCodes).toEqual(['A1', 'A2']);
    expect(booking.canCancel).toBe(true); // > 2 hours away
  });

  it('BOOK-05: Customer 1 retrieves specific booking via GET /api/v1/bookings/:id', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/${customer1BookingId}`)
      .set('Cookie', customer1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(customer1BookingId);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.seatCodes).toEqual(['A1', 'A2']);
  });

  it('BOOK-06: Customer 2 cannot access Customer 1 booking (403 FORBIDDEN - IDOR guard)', async () => {
    const res = await request(app)
      .get(`/api/v1/bookings/${customer1BookingId}`)
      .set('Cookie', customer2Cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('BOOK-07: Customer 2 cannot cancel Customer 1 booking (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${customer1BookingId}/cancel`)
      .set('Cookie', customer2Cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('BOOK-08: Customer 1 cancels booking >2h before show: seats return to AVAILABLE', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${customer1BookingId}/cancel`)
      .set('Cookie', customer1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');

    // Verify seats A1 and A2 are back to AVAILABLE
    const mapRes = await request(app).get(`/api/v1/shows/${futureShowId}/seats`);
    expect(mapRes.body.data.bookedCount).toBe(0);
    expect(mapRes.body.data.availableCount).toBe(80);

    const seatA1 = mapRes.body.data.seats.find((s: any) => s.seatCode === 'A1');
    expect(seatA1.status).toBe('AVAILABLE');
  });

  it('BOOK-09: Re-cancelling already cancelled booking returns 409 BOOKING_ALREADY_CANCELLED', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${customer1BookingId}/cancel`)
      .set('Cookie', customer1Cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOKING_ALREADY_CANCELLED');
  });

  it('BOOK-10: Booking within 2 hours of showtime cannot be cancelled (409 CANCELLATION_WINDOW_CLOSED)', async () => {
    // Create a booking directly on nearShowId (< 2 hours from now)
    const holdRes = await db.execute(sql`
      INSERT INTO holds (user_id, show_id, status, unit_price_paise, expires_at, request_key)
      VALUES ((SELECT id FROM users WHERE email = ${env.SEED_CUSTOMER_EMAIL}), ${nearShowId}, 'CONSUMED', 25000, clock_timestamp() + interval '300s', gen_random_uuid())
      RETURNING id
    `);
    const nearHoldId = (holdRes.rows[0] as any).id;

    const bookingRes = await db.execute(sql`
      INSERT INTO bookings (user_id, show_id, hold_id, status, total_paise)
      VALUES ((SELECT id FROM users WHERE email = ${env.SEED_CUSTOMER_EMAIL}), ${nearShowId}, ${nearHoldId}, 'CONFIRMED', 25000)
      RETURNING id
    `);
    const nearBookingId = (bookingRes.rows[0] as any).id;

    // Try to cancel
    const res = await request(app)
      .post(`/api/v1/bookings/${nearBookingId}/cancel`)
      .set('Cookie', customer1Cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CANCELLATION_WINDOW_CLOSED');
  });

  afterAll(async () => {
    if (futureShowId) {
      await request(app).delete(`/api/v1/admin/shows/${futureShowId}`).set('Cookie', adminCookie);
    }
    if (nearShowId) {
      await db.execute(sql`DELETE FROM booking_seats WHERE show_id = ${nearShowId}`);
      await db.execute(sql`DELETE FROM bookings WHERE show_id = ${nearShowId}`);
      await db.execute(sql`DELETE FROM hold_seats WHERE show_id = ${nearShowId}`);
      await db.execute(sql`DELETE FROM holds WHERE show_id = ${nearShowId}`);
      await db.execute(sql`DELETE FROM show_seats WHERE show_id = ${nearShowId}`);
      await db.execute(sql`DELETE FROM shows WHERE id = ${nearShowId}`);
    }
    if (testMovieId) {
      await request(app).delete(`/api/v1/admin/movies/${testMovieId}`).set('Cookie', adminCookie);
    }
  });
});

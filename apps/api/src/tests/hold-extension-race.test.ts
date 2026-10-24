import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';
import { DateTime } from 'luxon';

describe('Hold 2-Minute Extension and Concurrency Races', () => {
  const app = createApp();

  let adminCookie = '';
  let customer1Cookie = '';
  let customer2Cookie = '';
  let testMovieId = '';
  let testShowId = '';

  const futureDate = DateTime.now()
    .setZone('Asia/Kolkata')
    .plus({ days: 35 })
    .toFormat('yyyy-MM-dd');

  beforeAll(async () => {
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
    });
    const aCookies = adminLogin.headers['set-cookie'];
    adminCookie = (Array.isArray(aCookies) ? aCookies.join('; ') : aCookies) || '';

    const c1Login = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_CUSTOMER_EMAIL,
      password: env.SEED_CUSTOMER_PASSWORD,
    });
    const c1Cookies = c1Login.headers['set-cookie'];
    customer1Cookie = (Array.isArray(c1Cookies) ? c1Cookies.join('; ') : c1Cookies) || '';

    const c2Login = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_CUSTOMER_2_EMAIL,
      password: env.SEED_CUSTOMER_2_PASSWORD,
    });
    const c2Cookies = c2Login.headers['set-cookie'];
    customer2Cookie = (Array.isArray(c2Cookies) ? c2Cookies.join('; ') : c2Cookies) || '';

    const movieRes = await request(app)
      .post('/api/v1/admin/movies')
      .set('Cookie', adminCookie)
      .send({
        title: `Hold Extension Test Movie ${Date.now()}`,
        language: 'English',
        durationMinutes: 120,
        rating: 'UA',
      });
    expect(movieRes.status).toBe(201);
    testMovieId = movieRes.body.data.id;

    // Clean up any potential leftover shows on futureDate
    const existingShows = await db.execute(
      sql`SELECT id FROM shows WHERE starts_at >= ${futureDate}::date AND starts_at < (${futureDate}::date + interval '1 day')`,
    );
    for (const row of existingShows.rows as any[]) {
      await db.execute(
        sql`UPDATE show_seats SET current_booking_id = NULL, hold_id = NULL, held_until = NULL WHERE show_id = ${row.id}`,
      );
      await db.execute(sql`DELETE FROM booking_seats WHERE show_id = ${row.id}`);
      await db.execute(sql`DELETE FROM bookings WHERE show_id = ${row.id}`);
      await db.execute(sql`DELETE FROM hold_seats WHERE show_id = ${row.id}`);
      await db.execute(sql`DELETE FROM holds WHERE show_id = ${row.id}`);
      await db.execute(sql`DELETE FROM show_seats WHERE show_id = ${row.id}`);
      await db.execute(sql`DELETE FROM shows WHERE id = ${row.id}`);
    }

    const showRes = await request(app).post('/api/v1/admin/shows').set('Cookie', adminCookie).send({
      movieId: testMovieId,
      localDate: futureDate,
      localTime: '17:00',
      pricePaise: 22000,
    });
    expect(showRes.status).toBe(201);
    testShowId = showRes.body.data.id;
  });

  it('EXT-01: User extends hold, expiresAt increases by ~120s, isExtended=true, show_seats updated', async () => {
    const holdRes = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['E1', 'E2'] });
    expect(holdRes.status).toBe(201);

    const holdId = holdRes.body.data.holdId;
    const initialExpiresAt = new Date(holdRes.body.data.expiresAt).getTime();

    const detailBefore = await request(app)
      .get(`/api/v1/holds/${holdId}`)
      .set('Cookie', customer1Cookie);
    expect(detailBefore.status).toBe(200);
    expect(detailBefore.body.data.isExtended).toBe(false);
    expect(detailBefore.body.data.canExtend).toBe(true);

    const extendRes = await request(app)
      .post(`/api/v1/holds/${holdId}/extend`)
      .set('Cookie', customer1Cookie);
    expect(extendRes.status).toBe(200);
    expect(extendRes.body.data.isExtended).toBe(true);

    const extendedExpiresAt = new Date(extendRes.body.data.expiresAt).getTime();
    const diffSeconds = Math.round((extendedExpiresAt - initialExpiresAt) / 1000);
    expect(diffSeconds).toBe(120);

    const seatCheck = await db.execute(sql`
      SELECT seat_code, held_until 
      FROM show_seats 
      WHERE show_id = ${testShowId} AND seat_code IN ('E1', 'E2')
    `);
    expect(seatCheck.rows.length).toBe(2);
    for (const row of seatCheck.rows as any[]) {
      const seatHeldUntil = new Date(row.held_until).getTime();
      expect(Math.abs(seatHeldUntil - extendedExpiresAt)).toBeLessThan(1000);
    }

    const detailAfter = await request(app)
      .get(`/api/v1/holds/${holdId}`)
      .set('Cookie', customer1Cookie);
    expect(detailAfter.status).toBe(200);
    expect(detailAfter.body.data.isExtended).toBe(true);
    expect(detailAfter.body.data.canExtend).toBe(false);

    await request(app).delete(`/api/v1/holds/${holdId}`).set('Cookie', customer1Cookie);
  });

  it('EXT-02: Second extension attempt fails with 409 HOLD_ALREADY_EXTENDED', async () => {
    const holdRes = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['F1', 'F2'] });
    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.holdId;

    const firstExtend = await request(app)
      .post(`/api/v1/holds/${holdId}/extend`)
      .set('Cookie', customer1Cookie);
    expect(firstExtend.status).toBe(200);

    const secondExtend = await request(app)
      .post(`/api/v1/holds/${holdId}/extend`)
      .set('Cookie', customer1Cookie);
    expect(secondExtend.status).toBe(409);
    expect(secondExtend.body.error.code).toBe('HOLD_ALREADY_EXTENDED');

    await request(app).delete(`/api/v1/holds/${holdId}`).set('Cookie', customer1Cookie);
  });

  it('EXT-03: Unauthorized user cannot extend another user hold (403 FORBIDDEN)', async () => {
    const holdRes = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['F3', 'F4'] });
    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.holdId;

    const extendRes = await request(app)
      .post(`/api/v1/holds/${holdId}/extend`)
      .set('Cookie', customer2Cookie);
    expect(extendRes.status).toBe(403);
    expect(extendRes.body.error.code).toBe('FORBIDDEN');

    await request(app).delete(`/api/v1/holds/${holdId}`).set('Cookie', customer1Cookie);
  });

  it('EXT-04: Extending an expired hold fails with 409 HOLD_EXPIRED and releases seats', async () => {
    const holdRes = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['F5', 'F6'] });
    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.holdId;

    // Set created_at further back to preserve constraint expires_at > created_at
    await db.execute(sql`
      UPDATE holds 
      SET created_at = clock_timestamp() - interval '330 seconds',
          expires_at = clock_timestamp() - interval '10 seconds'
      WHERE id = ${holdId}
    `);

    const extendRes = await request(app)
      .post(`/api/v1/holds/${holdId}/extend`)
      .set('Cookie', customer1Cookie);
    expect(extendRes.status).toBe(409);
    expect(extendRes.body.error.code).toBe('HOLD_EXPIRED');

    const holdRow = await db.execute(sql`SELECT status FROM holds WHERE id = ${holdId}`);
    expect((holdRow.rows[0] as any).status).toBe('EXPIRED');

    const seatCheck = await db.execute(sql`
      SELECT seat_code, hold_id, held_until 
      FROM show_seats 
      WHERE show_id = ${testShowId} AND seat_code IN ('F5', 'F6')
    `);
    for (const row of seatCheck.rows as any[]) {
      expect(row.hold_id).toBeNull();
      expect(row.held_until).toBeNull();
    }
  });

  it('EXT-05: Concurrency race: parallel extension requests yield exactly one 200 and one 409', async () => {
    const holdRes = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['G1', 'G2'] });
    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.holdId;

    const [resA, resB] = await Promise.all([
      request(app).post(`/api/v1/holds/${holdId}/extend`).set('Cookie', customer1Cookie),
      request(app).post(`/api/v1/holds/${holdId}/extend`).set('Cookie', customer1Cookie),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const loser = resA.status === 409 ? resA : resB;
    expect(loser.body.error.code).toBe('HOLD_ALREADY_EXTENDED');

    await request(app).delete(`/api/v1/holds/${holdId}`).set('Cookie', customer1Cookie);
  });

  it('EXT-06: Payment decline followed by hold extension succeeds', async () => {
    const holdRes = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['G3', 'G4'] });
    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.holdId;

    const declineRes = await request(app)
      .post(`/api/v1/holds/${holdId}/payment`)
      .set('Cookie', customer1Cookie)
      .send({ paymentAction: 'DECLINE' });
    expect(declineRes.status).toBe(400);

    const extendRes = await request(app)
      .post(`/api/v1/holds/${holdId}/extend`)
      .set('Cookie', customer1Cookie);
    expect(extendRes.status).toBe(200);
    expect(extendRes.body.data.isExtended).toBe(true);

    const confirmRes = await request(app)
      .post(`/api/v1/holds/${holdId}/payment`)
      .set('Cookie', customer1Cookie)
      .send({ paymentAction: 'CONFIRM' });
    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');
  });

  it('EXT-07: Parallel payment confirmation and extension race without deadlock or corruption', async () => {
    const holdRes = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer2Cookie)
      .send({ seatCodes: ['G5', 'G6'] });
    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.holdId;

    const [paymentRes, extendRes] = await Promise.all([
      request(app)
        .post(`/api/v1/holds/${holdId}/payment`)
        .set('Cookie', customer2Cookie)
        .send({ paymentAction: 'CONFIRM' }),
      request(app).post(`/api/v1/holds/${holdId}/extend`).set('Cookie', customer2Cookie),
    ]);

    expect([200, 201]).toContain(paymentRes.status);

    if (extendRes.status === 200) {
      expect(paymentRes.status).toBe(201);
      expect(extendRes.body.data.isExtended).toBe(true);
    } else {
      expect(extendRes.status).toBe(409);
      expect(extendRes.body.error.code).toBe('HOLD_NOT_ACTIVE');
    }

    const bookingCheck = await db.execute(sql`
      SELECT status FROM bookings WHERE hold_id = ${holdId}
    `);
    expect(bookingCheck.rows.length).toBe(1);
    expect((bookingCheck.rows[0] as any).status).toBe('CONFIRMED');
  });

  afterAll(async () => {
    if (testShowId) {
      await db.execute(
        sql`UPDATE show_seats SET current_booking_id = NULL, hold_id = NULL, held_until = NULL WHERE show_id = ${testShowId}`,
      );
      await db.execute(sql`DELETE FROM booking_seats WHERE show_id = ${testShowId}`);
      await db.execute(sql`DELETE FROM bookings WHERE show_id = ${testShowId}`);
      await db.execute(sql`DELETE FROM hold_seats WHERE show_id = ${testShowId}`);
      await db.execute(sql`DELETE FROM holds WHERE show_id = ${testShowId}`);
      await db.execute(sql`DELETE FROM show_seats WHERE show_id = ${testShowId}`);
      await db.execute(sql`DELETE FROM shows WHERE id = ${testShowId}`);
    }
    if (testMovieId) {
      await request(app).delete(`/api/v1/admin/movies/${testMovieId}`).set('Cookie', adminCookie);
    }
  });
});

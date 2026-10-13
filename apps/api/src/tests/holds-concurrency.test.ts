import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';
import { DateTime } from 'luxon';

describe('Seat Map, Dynamic Seat Status & 5-Minute Holds Concurrency (Phase P5)', () => {
  const app = createApp();

  let adminCookie = '';
  let customer1Cookie = '';
  let customer2Cookie = '';
  let testShowId = '';
  let testMovieId = '';

  beforeAll(async () => {
    // 1. Login Admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
    });
    const aCookies = adminLogin.headers['set-cookie'];
    adminCookie = (Array.isArray(aCookies) ? aCookies.join('; ') : aCookies) || '';

    // 2. Login Customer 1
    const c1Login = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_CUSTOMER_EMAIL,
      password: env.SEED_CUSTOMER_PASSWORD,
    });
    const c1Cookies = c1Login.headers['set-cookie'];
    customer1Cookie = (Array.isArray(c1Cookies) ? c1Cookies.join('; ') : c1Cookies) || '';

    // 3. Login Customer 2
    const c2Login = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_CUSTOMER_2_EMAIL,
      password: env.SEED_CUSTOMER_2_PASSWORD,
    });
    const c2Cookies = c2Login.headers['set-cookie'];
    customer2Cookie = (Array.isArray(c2Cookies) ? c2Cookies.join('; ') : c2Cookies) || '';

    expect(adminLogin.status).toBe(200);
    expect(c1Login.status).toBe(200);
    expect(c2Login.status).toBe(200);

    // 4. Create an isolated movie and show for these tests
    const movieRes = await request(app)
      .post('/api/v1/admin/movies')
      .set('Cookie', adminCookie)
      .send({
        title: `Hold Test Movie ${Date.now()}`,
        language: 'English',
        durationMinutes: 120,
        rating: 'UA',
      });
    if (movieRes.status !== 201) {
      console.error('movieRes failed:', movieRes.status, movieRes.body);
    }
    expect(movieRes.status).toBe(201);
    testMovieId = movieRes.body.data.id;

    const futureDate = DateTime.now()
      .setZone('Asia/Kolkata')
      .plus({ days: 25 })
      .toFormat('yyyy-MM-dd');

    // Clean up any potential leftover shows on this future test date
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

    const showRes = await request(app).post('/api/v1/admin/shows').set('Cookie', adminCookie).send({
      movieId: testMovieId,
      localDate: futureDate,
      localTime: '18:00',
      pricePaise: 20000,
    });
    if (showRes.status !== 201) {
      console.error('showRes failed:', showRes.status, showRes.body);
    }
    expect(showRes.status).toBe(201);
    testShowId = showRes.body.data.id;
  });

  it('HOLD-01: GET /api/v1/shows/:id/seats returns all 80 seats initialized as AVAILABLE', async () => {
    const res = await request(app).get(`/api/v1/shows/${testShowId}/seats`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalSeats).toBe(80);
    expect(res.body.data.availableCount).toBe(80);
    expect(res.body.data.bookedCount).toBe(0);
    expect(res.body.data.heldCount).toBe(0);
    expect(res.body.data.seats.length).toBe(80);

    const seatA1 = res.body.data.seats.find((s: any) => s.seatCode === 'A1');
    expect(seatA1).toBeDefined();
    expect(seatA1.status).toBe('AVAILABLE');
    expect(seatA1.heldByCurrentUser).toBe(false);
  });

  it('HOLD-02: unauthenticated user cannot create a seat hold (401 UNAUTHENTICATED)', async () => {
    const res = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .send({ seatCodes: ['B1', 'B2'] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('HOLD-03: rejects holding more than 6 seats (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('HOLD-04: rejects holding invalid seat codes (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['Z99'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  let customer1HoldId = '';

  it('HOLD-05: Customer 1 creates hold for B4 and B5, returns 201 with 300s TTL', async () => {
    const res = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['B4', 'B5'] });

    expect(res.status).toBe(201);
    expect(res.body.data.holdId).toBeDefined();
    expect(res.body.data.seatCodes).toEqual(['B4', 'B5']);
    expect(res.body.data.secondsRemaining).toBe(300);
    expect(res.body.data.totalPaise).toBe(40000); // 2 seats * 20000 paise

    customer1HoldId = res.body.data.holdId;

    // Verify seat map reflects HELD status and heldByCurrentUser
    const mapForC1 = await request(app)
      .get(`/api/v1/shows/${testShowId}/seats`)
      .set('Cookie', customer1Cookie);
    expect(mapForC1.status).toBe(200);
    expect(mapForC1.body.data.heldCount).toBe(2);
    expect(mapForC1.body.data.availableCount).toBe(78);
    expect(mapForC1.body.data.currentUserActiveHold).toBeDefined();
    expect(mapForC1.body.data.currentUserActiveHold.holdId).toBe(customer1HoldId);

    const seatB4ForC1 = mapForC1.body.data.seats.find((s: any) => s.seatCode === 'B4');
    expect(seatB4ForC1.status).toBe('HELD');
    expect(seatB4ForC1.heldByCurrentUser).toBe(true);

    // Verify Customer 2 sees B4 as HELD but heldByCurrentUser = false
    const mapForC2 = await request(app)
      .get(`/api/v1/shows/${testShowId}/seats`)
      .set('Cookie', customer2Cookie);
    const seatB4ForC2 = mapForC2.body.data.seats.find((s: any) => s.seatCode === 'B4');
    expect(seatB4ForC2.status).toBe('HELD');
    expect(seatB4ForC2.heldByCurrentUser).toBe(false);
    expect(mapForC2.body.data.currentUserActiveHold).toBeNull();
  });

  it('HOLD-06: Customer 1 cannot hold additional seats on same show while hold is active (409 HOLD_ALREADY_ACTIVE)', async () => {
    const res = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['C1'] });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HOLD_ALREADY_ACTIVE');
  });

  it('HOLD-07: Customer 2 cannot hold already held seats (409 SEAT_UNAVAILABLE)', async () => {
    const res = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer2Cookie)
      .send({ seatCodes: ['B4', 'B6'] });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SEAT_UNAVAILABLE');
    expect(res.body.error.details.conflictingSeats).toContain('B4');
  });

  let winningHoldId = '';
  let winnerCookie = '';
  let loserCookie = '';

  it('HOLD-08: Same-seat concurrency: concurrent hold attempts on D5 guarantee exactly 1 winner', async () => {
    // Customer 1 releases their previous hold first
    const releaseRes = await request(app)
      .delete(`/api/v1/holds/${customer1HoldId}`)
      .set('Cookie', customer1Cookie);
    expect(releaseRes.status).toBe(204);

    // Both Customer 1 and Customer 2 concurrently try to reserve seat D5
    const [c1Attempt, c2Attempt] = await Promise.all([
      request(app)
        .post(`/api/v1/shows/${testShowId}/holds`)
        .set('Cookie', customer1Cookie)
        .send({ seatCodes: ['D5'] }),
      request(app)
        .post(`/api/v1/shows/${testShowId}/holds`)
        .set('Cookie', customer2Cookie)
        .send({ seatCodes: ['D5'] }),
    ]);

    const statuses = [c1Attempt.status, c2Attempt.status].sort();
    // Exactly one must be 201 (winner) and one must be 409 (loser)
    expect(statuses).toEqual([201, 409]);

    const winnerRes = c1Attempt.status === 201 ? c1Attempt : c2Attempt;
    const loserRes = c1Attempt.status === 409 ? c1Attempt : c2Attempt;

    expect(winnerRes.body.data.seatCodes).toEqual(['D5']);
    expect(loserRes.body.error.code).toBe('SEAT_UNAVAILABLE');

    winningHoldId = winnerRes.body.data.holdId;
    winnerCookie = c1Attempt.status === 201 ? customer1Cookie : customer2Cookie;
    loserCookie = c1Attempt.status === 201 ? customer2Cookie : customer1Cookie;
  });

  it('HOLD-09: Customer cannot release another user’s hold (403 FORBIDDEN)', async () => {
    // The user who did not win tries to delete it
    const res = await request(app)
      .delete(`/api/v1/holds/${winningHoldId}`)
      .set('Cookie', loserCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('HOLD-10: Owner can explicitly release hold, returning seat to AVAILABLE', async () => {
    // Winner releases their hold
    const res = await request(app)
      .delete(`/api/v1/holds/${winningHoldId}`)
      .set('Cookie', winnerCookie);

    expect(res.status).toBe(204);

    // Verify seat D5 is back to AVAILABLE
    const mapRes = await request(app).get(`/api/v1/shows/${testShowId}/seats`);
    const seatD5 = mapRes.body.data.seats.find((s: any) => s.seatCode === 'D5');
    expect(seatD5.status).toBe('AVAILABLE');
    expect(mapRes.body.data.availableCount).toBe(80);
  });

  afterAll(async () => {
    if (testShowId) {
      await request(app).delete(`/api/v1/admin/shows/${testShowId}`).set('Cookie', adminCookie);
    }
    if (testMovieId) {
      await request(app).delete(`/api/v1/admin/movies/${testMovieId}`).set('Cookie', adminCookie);
    }
  });
});

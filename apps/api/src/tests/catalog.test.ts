import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';
import { DateTime } from 'luxon';

describe('Movies & Shows Catalog & Admin Scheduling (Phase P4)', () => {
  const app = createApp();

  let adminCookie = '';
  let customerCookie = '';
  let testMovieId = '';
  let testShowId = '';

  beforeAll(async () => {
    // 1. Login as admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
    });
    expect(adminLogin.status).toBe(200);
    const adminCookies = adminLogin.headers['set-cookie'];
    adminCookie = (Array.isArray(adminCookies) ? adminCookies.join('; ') : adminCookies) || '';

    // 2. Login as seeded customer
    const custLogin = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_CUSTOMER_EMAIL,
      password: env.SEED_CUSTOMER_PASSWORD,
    });
    expect(custLogin.status).toBe(200);
    const custCookies = custLogin.headers['set-cookie'];
    customerCookie = (Array.isArray(custCookies) ? custCookies.join('; ') : custCookies) || '';
  });

  it('CAT-01: GET /api/v1/movies returns paginated movies list', async () => {
    const res = await request(app).get('/api/v1/movies?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  it('CAT-02: GET /api/v1/movies?search=... filters movies case-insensitively', async () => {
    // We have seeded movies like 'Midnight Orbit', 'Echoes of Banaras', etc.
    const res = await request(app).get('/api/v1/movies?search=orbit');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].title.toLowerCase()).toContain('orbit');
  });

  it('CAT-03: customer cannot create movie on admin route (403 FORBIDDEN)', async () => {
    const res = await request(app).post('/api/v1/admin/movies').set('Cookie', customerCookie).send({
      title: 'Unauthorized Movie',
      language: 'English',
      durationMinutes: 120,
      rating: 'UA',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('CAT-04: unauthenticated user cannot create movie (401 UNAUTHENTICATED)', async () => {
    const res = await request(app).post('/api/v1/admin/movies').send({
      title: 'Unauthorized Movie',
      language: 'English',
      durationMinutes: 120,
      rating: 'UA',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('CAT-05: admin can create and update a movie', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/movies')
      .set('Cookie', adminCookie)
      .send({
        title: 'Oppenheimer Special',
        description: 'Biographical drama thriller written and directed by Christopher Nolan.',
        posterUrl: 'https://example.com/oppenheimer.jpg',
        language: 'English',
        durationMinutes: 180,
        rating: 'A',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.title).toBe('Oppenheimer Special');
    expect(createRes.body.data.durationMinutes).toBe(180);
    testMovieId = createRes.body.data.id;

    // Update movie description
    const updateRes = await request(app)
      .put(`/api/v1/admin/movies/${testMovieId}`)
      .set('Cookie', adminCookie)
      .send({
        description: 'Updated description for Oppenheimer',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.description).toBe('Updated description for Oppenheimer');
  });

  it('CAT-06: admin can schedule a show and it initializes exactly 80 seats', async () => {
    // Schedule a show 3 days in the future at 14:00 IST
    const futureDate = DateTime.now()
      .setZone('Asia/Kolkata')
      .plus({ days: 3 })
      .toFormat('yyyy-MM-dd');
    const localTime = '14:00';

    const showRes = await request(app).post('/api/v1/admin/shows').set('Cookie', adminCookie).send({
      movieId: testMovieId,
      localDate: futureDate,
      localTime,
      pricePaise: 25000,
    });

    expect(showRes.status).toBe(201);
    expect(showRes.body.data.id).toBeDefined();
    testShowId = showRes.body.data.id;

    // Verify exactly 80 show_seats records exist
    const seatCountRes = await db.execute(sql`
      SELECT count(*)::int as count FROM show_seats WHERE show_id = ${testShowId}
    `);
    expect((seatCountRes.rows[0] as any).count).toBe(80);

    // Verify public show detail
    const detailRes = await request(app).get(`/api/v1/shows/${testShowId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.availableCount).toBe(80);
    expect(detailRes.body.data.pricePaise).toBe(25000);
  });

  it('CAT-07: prevents overlapping show schedule collision (409 SHOW_INTERVAL_COLLISION)', async () => {
    // Attempt to schedule another show overlapping the 14:00-17:00 slot (at 15:00)
    const futureDate = DateTime.now()
      .setZone('Asia/Kolkata')
      .plus({ days: 3 })
      .toFormat('yyyy-MM-dd');

    const overlapRes = await request(app)
      .post('/api/v1/admin/shows')
      .set('Cookie', adminCookie)
      .send({
        movieId: testMovieId,
        localDate: futureDate,
        localTime: '15:00', // overlaps with 14:00 (180 min duration)
        pricePaise: 30000,
      });

    expect(overlapRes.status).toBe(409);
    expect(overlapRes.body.error.code).toBe('SHOW_INTERVAL_COLLISION');
  });

  it('CAT-08: GET /api/v1/movies/:id returns movie detail with future shows grouped by date', async () => {
    const res = await request(app).get(`/api/v1/movies/${testMovieId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.movie.id).toBe(testMovieId);
    expect(Array.isArray(res.body.data.showsByDate)).toBe(true);
    expect(res.body.data.showsByDate.length).toBeGreaterThanOrEqual(1);

    const firstGroup = res.body.data.showsByDate[0];
    expect(firstGroup.localDate).toBeDefined();
    expect(firstGroup.shows.length).toBeGreaterThanOrEqual(1);
    expect(firstGroup.shows[0].availableCount).toBe(80);
  });

  it('CAT-09: admin can delete show and movie when there are no bookings', async () => {
    // 1. Delete show
    const delShowRes = await request(app)
      .delete(`/api/v1/admin/shows/${testShowId}`)
      .set('Cookie', adminCookie);
    expect(delShowRes.status).toBe(204);

    // Verify show is gone
    const getShowRes = await request(app).get(`/api/v1/shows/${testShowId}`);
    expect(getShowRes.status).toBe(404);

    // 2. Delete movie
    const delMovieRes = await request(app)
      .delete(`/api/v1/admin/movies/${testMovieId}`)
      .set('Cookie', adminCookie);
    expect(delMovieRes.status).toBe(204);

    // Verify movie is gone
    const getMovieRes = await request(app).get(`/api/v1/movies/${testMovieId}`);
    expect(getMovieRes.status).toBe(404);
  });
});

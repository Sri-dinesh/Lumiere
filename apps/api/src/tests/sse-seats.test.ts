import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { showEventsManager } from '../modules/shows/show-events.manager.js';

describe('Server-Sent Events (SSE) Real-Time Seat Synchronization', () => {
  const app = createApp();
  let server: http.Server;
  let serverPort: number;

  let adminCookie = '';
  let customer1Cookie = '';
  let testMovieId = '';
  let testShowId = '';

  beforeAll(async () => {
    // 1. Start HTTP server on random port for real streaming connection
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          serverPort = addr.port;
        }
        resolve();
      });
    });

    // 2. Auth sessions
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

    // 3. Create test movie and show
    const movieRes = await request(app)
      .post('/api/v1/admin/movies')
      .set('Cookie', adminCookie)
      .send({
        title: `SSE Stream Movie ${Date.now()}`,
        language: 'English',
        durationMinutes: 120,
        rating: 'UA',
      });
    testMovieId = movieRes.body.data.id;

    const futureDate = DateTime.now()
      .setZone('Asia/Kolkata')
      .plus({ days: 30 })
      .toFormat('yyyy-MM-dd');

    // Clean up any leftovers
    const leftoverShowsRes = await db.execute(
      sql`SELECT id FROM shows WHERE starts_at >= ${futureDate}::date AND starts_at < (${futureDate}::date + interval '1 day')`,
    );
    for (const row of leftoverShowsRes.rows as any[]) {
      await db.execute(
        sql`UPDATE show_seats SET hold_id = NULL, held_until = NULL WHERE show_id = ${row.id}`,
      );
      await db.execute(sql`DELETE FROM hold_seats WHERE show_id = ${row.id}`);
      await db.execute(sql`DELETE FROM holds WHERE show_id = ${row.id}`);
      await db.execute(sql`DELETE FROM show_seats WHERE show_id = ${row.id}`);
      await db.execute(sql`DELETE FROM shows WHERE id = ${row.id}`);
    }

    const showRes = await request(app).post('/api/v1/admin/shows').set('Cookie', adminCookie).send({
      movieId: testMovieId,
      localDate: futureDate,
      localTime: '18:00',
      pricePaise: 25000,
    });
    testShowId = showRes.body.data.id;
  });

  afterAll(async () => {
    if (testShowId) {
      await db.execute(
        sql`UPDATE show_seats SET hold_id = NULL, held_until = NULL WHERE show_id = ${testShowId}`,
      );
      await db.execute(sql`DELETE FROM hold_seats WHERE show_id = ${testShowId}`);
      await db.execute(sql`DELETE FROM holds WHERE show_id = ${testShowId}`);
      await db.execute(sql`DELETE FROM show_seats WHERE show_id = ${testShowId}`);
      await db.execute(sql`DELETE FROM shows WHERE id = ${testShowId}`);
    }
    if (testMovieId) {
      await db.execute(sql`DELETE FROM movies WHERE id = ${testMovieId}`);
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('SSE-01: returns 404 for non-existent show events subscription', async () => {
    const res = await request(app).get('/api/v1/shows/00000000-0000-0000-0000-000000000000/events');
    expect(res.status).toBe(404);
  });

  it('SSE-02: establishes text/event-stream connection and receives initial connected + snapshot events', async () => {
    const receivedChunks: string[] = [];

    const req = http.get(
      `http://127.0.0.1:${serverPort}/api/v1/shows/${testShowId}/events`,
      (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/event-stream');
        expect(res.headers['cache-control']).toContain('no-cache');

        res.on('data', (chunk) => {
          receivedChunks.push(chunk.toString());
        });
      },
    );

    // Wait 250ms for initial payloads
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(showEventsManager.getSubscriberCount(testShowId)).toBeGreaterThanOrEqual(1);

    const fullOutput = receivedChunks.join('');
    expect(fullOutput).toContain('event: connected');
    expect(fullOutput).toContain('event: seat_map_update');
    expect(fullOutput).toContain(`"showId":"${testShowId}"`);

    // Abort connection and verify cleanup
    req.destroy();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(showEventsManager.getSubscriberCount(testShowId)).toBe(0);
  });

  it('SSE-03: broadcasts real-time seat status updates when a hold is created and released', async () => {
    const receivedEvents: Array<{ event: string; data: any }> = [];

    const req = http.get(
      `http://127.0.0.1:${serverPort}/api/v1/shows/${testShowId}/events`,
      {
        headers: {
          Cookie: customer1Cookie,
        },
      },
      (res) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const msg of messages) {
            const lines = msg.split('\n');
            let eventName = 'message';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventName = line.replace('event: ', '').trim();
              } else if (line.startsWith('data: ')) {
                dataStr = line.replace('data: ', '').trim();
              }
            }
            if (dataStr) {
              try {
                receivedEvents.push({ event: eventName, data: JSON.parse(dataStr) });
              } catch {
                // Ignore ping or malformed
              }
            }
          }
        });
      },
    );

    // Wait for connection initialization
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 1. Customer creates a hold on seat C1 and C2
    const holdRes = await request(app)
      .post(`/api/v1/shows/${testShowId}/holds`)
      .set('Cookie', customer1Cookie)
      .send({ seatCodes: ['C1', 'C2'] });

    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.holdId;

    // Wait for broadcast to be received
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify seat map update was broadcasted
    const lastEvent = receivedEvents[receivedEvents.length - 1];
    expect(lastEvent).toBeDefined();
    expect(lastEvent!.event).toBe('seat_map_update');
    expect(lastEvent!.data.showId).toBe(testShowId);
    expect(lastEvent!.data.availableCount).toBe(78); // 80 - 2

    const heldC1 = lastEvent!.data.seats.find((s: any) => s.seatCode === 'C1');
    expect(heldC1.status).toBe('HELD');
    expect(heldC1.heldByCurrentUser).toBe(true);

    // 2. Customer releases hold
    const releaseRes = await request(app)
      .delete(`/api/v1/holds/${holdId}`)
      .set('Cookie', customer1Cookie);

    expect(releaseRes.status).toBe(204);

    // Wait for release broadcast
    await new Promise((resolve) => setTimeout(resolve, 300));

    const releasedEvent = receivedEvents[receivedEvents.length - 1];
    expect(releasedEvent).toBeDefined();
    expect(releasedEvent!.event).toBe('seat_map_update');
    expect(releasedEvent!.data.availableCount).toBe(80); // Restored back to 80

    const restoredC1 = releasedEvent!.data.seats.find((s: any) => s.seatCode === 'C1');
    expect(restoredC1.status).toBe('AVAILABLE');

    req.destroy();
  });
});

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { SESSION_COOKIE_NAME } from '../config/constants.js';

describe('Auth Flow F1 & Session Lifecycle (Supertest + Neon DB)', () => {
  const app = createApp();

  const uniqueSuffix = Date.now();
  const testEmail = `charlie_${uniqueSuffix}@example.test`;
  const testPassword = 'StrongPassword123!';
  let customerSessionCookie = '';

  it('AUTH-01: signs up a new customer, returns 201, sets session cookie, and allows /auth/me', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send({
      name: 'Charlie Test',
      email: testEmail,
      password: testPassword,
    });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.data.user.email).toBe(testEmail);
    expect(signupRes.body.data.user.role).toBe('CUSTOMER');
    expect(signupRes.body.data.user.passwordHash).toBeUndefined();

    // Check Set-Cookie
    const cookies = signupRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieHeader).toContain(SESSION_COOKIE_NAME);
    customerSessionCookie = cookieHeader || '';

    // Call /auth/me with the received session cookie
    const meRes = await request(app).get('/api/v1/auth/me').set('Cookie', customerSessionCookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(testEmail);
    expect(meRes.body.data.user.role).toBe('CUSTOMER');
  });

  it('AUTH-02: rejects duplicate email in different casing with 409 EMAIL_IN_USE', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      name: 'Charlie Duplicate',
      email: testEmail.toUpperCase(),
      password: testPassword,
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('AUTH-03: rejects passwords under 8 characters with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Short Password',
        email: `short_${Date.now()}@example.test`,
        password: '1234567',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AUTH-03b: rejects signup payload containing unauthorized role field with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Hacker Trying Admin',
        email: `hacker_${Date.now()}@example.test`,
        password: testPassword,
        role: 'ADMIN',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AUTH-04: rejects wrong password with generic 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('AUTH-04b: rejects non-existent email with generic 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nobody_exists@example.test',
      password: testPassword,
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('AUTH-06: rejects anonymous GET /auth/me with 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('AUTH-07: forbids customer user from accessing admin route with 403 FORBIDDEN', async () => {
    const res = await request(app).get('/api/v1/admin/probe').set('Cookie', customerSessionCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-07b: permits seeded admin user to access admin route with 200 OK', async () => {
    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
    });

    expect(adminLoginRes.status).toBe(200);
    expect(adminLoginRes.body.data.user.role).toBe('ADMIN');

    const adminCookies = adminLoginRes.headers['set-cookie'];
    const adminCookieHeader =
      (Array.isArray(adminCookies) ? adminCookies.join('; ') : adminCookies) || '';

    const probeRes = await request(app).get('/api/v1/admin/probe').set('Cookie', adminCookieHeader);

    expect(probeRes.status).toBe(200);
    expect(probeRes.body.data.message).toBe('admin access granted');
  });

  it('AUTH-05: logs out user and invalidates session in database', async () => {
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', customerSessionCookie);

    expect(logoutRes.status).toBe(204);

    // Subsequent /auth/me with the logged out cookie must be rejected
    const meAfterLogout = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', customerSessionCookie);

    expect(meAfterLogout.status).toBe(401);
    expect(meAfterLogout.body.error.code).toBe('UNAUTHENTICATED');
  });
});

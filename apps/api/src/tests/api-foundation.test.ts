import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { createApp } from '../app.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { errorHandler } from '../middlewares/error.middleware.js';
import { SESSION_COOKIE_NAME } from '../config/constants.js';

describe('Express Foundation, Security Middlewares & Error Handling', () => {
  const app = createApp();

  it('GET /api/v1/health/ready returns database connected and requestId', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.meta.requestId).toBeDefined();
    expect(res.headers['x-request-id']).toBe(res.body.meta.requestId);
  });

  it('unmatched route returns 404 with standard error JSON shape', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });

  it('originGuard rejects mutating requests with invalid Origin when session cookie is attached', async () => {
    const res = await request(app)
      .post('/api/v1/some-endpoint')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=fake_token_12345`])
      .set('Origin', 'https://malicious-attacker-site.com')
      .send({ some: 'data' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_ORIGIN_MISMATCH');
  });

  it('validateBody helper validates and rejects invalid payloads with 400 VALIDATION_ERROR', async () => {
    const testApp = express();
    testApp.use(express.json());
    const testSchema = z.object({
      age: z.number().min(18),
    });

    testApp.post('/test-validate', validateBody(testSchema), (_req, res) => {
      res.json({ ok: true });
    });
    testApp.use(errorHandler);

    const res = await request(testApp).post('/test-validate').send({ age: 12 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.fields).toBeDefined();
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2ETestApp } from '../support/e2e-app';

describe('Health & Security Headers E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ctx = await createE2ETestApp();
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns status ok with security headers', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok' },
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('GET /health/db verifies PostgreSQL connectivity', async () => {
    const response = await request(app.getHttpServer()).get('/health/db');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ok', db: 'connected' },
    });
  });

  it('GET /openapi.json exposes Swagger spec with /api/v1/auth and /api/v1/users paths', async () => {
    const response = await request(app.getHttpServer()).get('/openapi.json');
    expect(response.status).toBe(200);
    const paths = Object.keys(response.body.paths ?? {});
    expect(paths).toContain('/api/v1/auth/register');
    expect(paths).toContain('/api/v1/auth/send-otp');
    expect(paths).toContain('/api/v1/auth/login');
    expect(paths).toContain('/api/v1/users/me');
    expect(paths).not.toContain('/api/v1/auth/verify-email');
    expect(paths).not.toContain('/api/v1/auth/forgot-password');
    expect(paths).not.toContain('/api/v1/auth/resend-otp');
  });
});


import { INestApplication } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { type E2ETestContext, FIXED_TEST_OTP, createE2ETestApp } from '../support/e2e-app';
import {
  disconnectTestDatabase,
  getTestPrismaClient,
  truncateTestDatabase,
} from '../support/test-database';

const PASSWORD = 'Sup3rSecret!pass';

describe('Users E2E Suite (/api/v1/users)', () => {
  let ctx: E2ETestContext;
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = getTestPrismaClient();
    ctx = await createE2ETestApp();
    app = ctx.app;
  });

  beforeEach(async () => {
    await truncateTestDatabase(prisma);
    ctx.rateLimitService.reset();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestDatabase();
  });

  async function createAuthenticatedUser(
    email = 'user_profile@example.com',
    username = 'user_profile',
  ) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ email, purpose: 'REGISTER' });

    const regResp = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email,
      username,
      otp: FIXED_TEST_OTP,
      password: PASSWORD,
    });
    expect(regResp.status).toBe(201);
    const token: string = regResp.body.data.tokens.access_token;
    return {
      email,
      username,
      token,
      authHeader: `Bearer ${token}`,
    };
  }

  it('rejects unauthenticated requests with 401 and WWW-Authenticate header', async () => {
    const getResp = await request(app.getHttpServer()).get('/api/v1/users/me');
    expect(getResp.status).toBe(401);
    expect(getResp.headers['www-authenticate']).toBe('Bearer');

    const patchResp = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .send({ full_name: 'Test' });
    expect(patchResp.status).toBe(401);
  });

  it('gets initial profile, updates all fields, and preserves untouched fields on partial update', async () => {
    const { authHeader, email, username } = await createAuthenticatedUser();

    const initialResp = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', authHeader);
    expect(initialResp.status).toBe(200);
    expect(initialResp.body.data.email).toBe(email);
    expect(initialResp.body.data.username).toBe(username);
    expect(initialResp.body.data.full_name).toBeNull();
    expect(initialResp.body.data.phone_number).toBeNull();

    const updatePayload = {
      full_name: 'Nguyễn Văn A',
      phone_number: '+84 (912) 345-678',
      address: '123 Đường Số 1, Quận 1, TP. HCM',
      avatar_url: 'https://example.com/avatar.jpg',
      date_of_birth: '1995-10-25',
      gender: 'male',
      bio: 'Đam mê bóng đá sân 7 và cầu lông',
    };

    const patchResp = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader)
      .send(updatePayload);
    expect(patchResp.status).toBe(200);
    expect(patchResp.body.data.full_name).toBe('Nguyễn Văn A');
    expect(patchResp.body.data.phone_number).toBe('+84912345678');
    expect(patchResp.body.data.date_of_birth).toBe('1995-10-25');
    expect(patchResp.body.data.gender).toBe('MALE');

    // Partial update keeps existing fields
    const partialResp = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader)
      .send({ bio: 'Hậu vệ thòng' });
    expect(partialResp.status).toBe(200);
    expect(partialResp.body.data.full_name).toBe('Nguyễn Văn A');
    expect(partialResp.body.data.phone_number).toBe('+84912345678');
    expect(partialResp.body.data.bio).toBe('Hậu vệ thòng');
  });

  it('sanitizes XSS payloads and rejects invalid profile inputs with 422', async () => {
    const { authHeader } = await createAuthenticatedUser();

    const xssResp = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader)
      .send({
        full_name: 'Hacker <script>alert("XSS")</script>',
        bio: '<img src=x onerror=alert("hacked")> Yêu bóng đá',
        address: '123 Đường Số 1 <iframe src="evil.com"></iframe>',
      });
    expect(xssResp.status).toBe(200);
    expect(xssResp.body.data.full_name).not.toContain('<script>');
    expect(xssResp.body.data.full_name).toContain('&lt;script&gt;');
    expect(xssResp.body.data.bio).toContain('&lt;img');
    expect(xssResp.body.data.address).toContain('&lt;iframe');

    // Invalid phone, avatar_url, future date_of_birth, invalid gender, invalid username
    expect(
      (
        await request(app.getHttpServer())
          .patch('/api/v1/users/me')
          .set('Authorization', authHeader)
          .send({ phone_number: 'not-a-phone' })
      ).status,
    ).toBe(422);

    expect(
      (
        await request(app.getHttpServer())
          .patch('/api/v1/users/me')
          .set('Authorization', authHeader)
          .send({ avatar_url: 'javascript:alert(1)' })
      ).status,
    ).toBe(422);

    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    expect(
      (
        await request(app.getHttpServer())
          .patch('/api/v1/users/me')
          .set('Authorization', authHeader)
          .send({ date_of_birth: tomorrow })
      ).status,
    ).toBe(422);

    expect(
      (
        await request(app.getHttpServer())
          .patch('/api/v1/users/me')
          .set('Authorization', authHeader)
          .send({ gender: 'alien' })
      ).status,
    ).toBe(422);

    expect(
      (
        await request(app.getHttpServer())
          .patch('/api/v1/users/me')
          .set('Authorization', authHeader)
          .send({ username: 'user@domain' })
      ).status,
    ).toBe(422);
  });

  it('handles username updates, idempotent same-username update, and 409 conflict when taken', async () => {
    const { authHeader } = await createAuthenticatedUser('u1@example.com', 'player_u1');
    await createAuthenticatedUser('u2@example.com', 'taken_username');

    const okUpdate = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader)
      .send({ username: 'new_cool_username' });
    expect(okUpdate.status).toBe(200);
    expect(okUpdate.body.data.username).toBe('new_cool_username');

    const sameUpdate = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader)
      .send({ username: 'new_cool_username' });
    expect(sameUpdate.status).toBe(200);

    const conflictUpdate = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader)
      .send({ username: 'taken_username' });
    expect(conflictUpdate.status).toBe(409);
    expect(conflictUpdate.body.error.message).toBe('Username is already taken');
  });

  it('returns public profile without PII on GET /users/:id, 404 when missing, and 403 when disabled', async () => {
    const { authHeader, email, username } = await createAuthenticatedUser();
    const meResp = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', authHeader);
    const userId: number = meResp.body.data.id;

    const pubResp = await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', authHeader);
    expect(pubResp.status).toBe(200);
    expect(pubResp.body.data.id).toBe(userId);
    expect(pubResp.body.data.username).toBe(username);
    expect(pubResp.body.data).not.toHaveProperty('email');
    expect(pubResp.body.data).not.toHaveProperty('phone_number');
    expect(pubResp.body.data).not.toHaveProperty('address');
    expect(pubResp.body.data).not.toHaveProperty('date_of_birth');
    expect(pubResp.body.data).not.toHaveProperty('is_email_verified');

    const notFoundResp = await request(app.getHttpServer())
      .get('/api/v1/users/99999999')
      .set('Authorization', authHeader);
    expect(notFoundResp.status).toBe(404);

    // Disable account -> GET & PATCH /me return 403
    await prisma.user.update({
      where: { email },
      data: { is_active: false },
    });

    const disabledGet = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', authHeader);
    expect(disabledGet.status).toBe(403);
    expect(disabledGet.body.error.message).toBe('Account has been disabled');

    const disabledPatch = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader)
      .send({ full_name: 'Blocked' });
    expect(disabledPatch.status).toBe(403);
  });
});


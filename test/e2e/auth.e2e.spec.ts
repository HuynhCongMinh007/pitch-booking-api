import { createHash } from 'node:crypto';

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

describe('Auth E2E Flow & Validation Suite', () => {
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
    ctx.sendRegistrationOtpSpy.mockClear();
    ctx.sendPasswordResetOtpSpy.mockClear();
  });

  afterAll(async () => {
    await app.close();
    await disconnectTestDatabase();
  });

  async function registerAndVerify(email = 'flow_user@example.com', username = 'flow_user_01') {
    const otpResp = await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ email, purpose: 'REGISTER' });
    expect(otpResp.status).toBe(200);

    const regResp = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email,
      username,
      otp: FIXED_TEST_OTP,
      password: PASSWORD,
    });
    expect(regResp.status).toBe(201);
    return regResp.body.data.tokens as {
      access_token: string;
      refresh_token: string;
      token_type: string;
    };
  }

  function loginWithForm(username: string, password = PASSWORD) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .type('form')
      .send({ username, password });
  }

  describe('Input validation & deprecated endpoints', () => {
    it('rejects short password, invalid email, username with @, and short username with 422', async () => {
      const shortPass = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        otp: '123456',
        password: '123',
      });
      expect(shortPass.status).toBe(422);

      const badEmail = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        username: 'testuser',
        email: 'not-an-email',
        otp: '123456',
        password: 'valid_password_123',
      });
      expect(badEmail.status).toBe(422);

      const usernameAt = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        username: 'someone@example.com',
        email: 'test@example.com',
        otp: '123456',
        password: 'valid_password_123',
      });
      expect(usernameAt.status).toBe(422);

      const shortUser = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        username: 'abcde',
        email: 'test@example.com',
        otp: '123456',
        password: 'valid_password_123',
      });
      expect(shortUser.status).toBe(422);
    });

    it('returns 404 for removed legacy endpoints', async () => {
      expect(
        (await request(app.getHttpServer()).post('/api/v1/auth/forgot-password').send({})).status,
      ).toBe(404);
      expect(
        (await request(app.getHttpServer()).post('/api/v1/auth/resend-otp').send({})).status,
      ).toBe(404);
      expect(
        (await request(app.getHttpServer()).post('/api/v1/auth/verify-email').send({})).status,
      ).toBe(404);
      expect(
        (await request(app.getHttpServer()).post('/api/v1/auth/refreshtoken').send({})).status,
      ).toBe(404);
    });
  });

  describe('Full Register -> Login -> Refresh Rotation -> Logout Flow', () => {
    it('completes registration, stores hashed refresh token, rotates refresh tokens, and supports cookie auth', async () => {
      const email = 'player_one@example.com';
      const username = 'player_one';

      // 1. Send OTP
      const otpResp = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'REGISTER' });
      expect(otpResp.status).toBe(200);
      expect(otpResp.body.data.is_already_sent).toBe(false);
      expect(ctx.sendRegistrationOtpSpy).toHaveBeenCalledTimes(1);

      // Pending user exists in DB as unverified
      const pendingUser = await prisma.user.findUnique({ where: { email } });
      expect(pendingUser).not.toBeNull();
      expect(pendingUser?.is_active).toBe(true);
      expect(pendingUser?.is_email_verified).toBe(false);

      // Login before completing registration -> generic 401
      const prematureLogin = await loginWithForm(email);
      expect(prematureLogin.status).toBe(401);
      expect(prematureLogin.body.error.message).toBe('Email or password is incorrect');

      // 2. Register with wrong OTP -> 400 with attempts remaining
      const wrongOtp = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email,
        username,
        otp: '999999',
        password: PASSWORD,
      });
      expect(wrongOtp.status).toBe(400);
      expect(wrongOtp.body.error.message).toContain('attempts remaining');

      // 3. Register with valid OTP -> 201 + cookies + tokens
      const regResp = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email,
        username,
        otp: FIXED_TEST_OTP,
        password: PASSWORD,
      });
      expect(regResp.status).toBe(201);
      expect(regResp.headers['set-cookie']).toBeDefined();
      const regTokens = regResp.body.data.tokens;
      expect(regTokens.access_token).toBeTruthy();

      // Verify refresh token is stored hashed (SHA-256 = 64 hex chars)
      const expectedHash = createHash('sha256')
        .update(regTokens.refresh_token, 'utf8')
        .digest('hex');
      const storedRt = await prisma.refreshToken.findUnique({
        where: { token_hash: expectedHash },
      });
      expect(storedRt).not.toBeNull();
      expect(storedRt?.token_hash).toHaveLength(64);
      expect(storedRt?.token_hash).not.toBe(regTokens.refresh_token);

      // 4. Login by uppercase email via form-urlencoded
      const loginResp = await loginWithForm(email.toUpperCase());
      expect(loginResp.status).toBe(200);
      const tokens = loginResp.body.data;

      // Authenticate via HttpOnly cookie too
      const cookies = loginResp.headers['set-cookie'];
      const meViaCookie = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', cookies);
      expect(meViaCookie.status).toBe(200);
      expect(meViaCookie.body.data.email).toBe(email);

      // 5. Refresh rotates token pair and rejects reuse of rotated token
      const oldRefresh = tokens.refresh_token;
      const refreshResp = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: oldRefresh });
      expect(refreshResp.status).toBe(200);
      const newRefresh = refreshResp.body.data.refresh_token;
      expect(newRefresh).not.toBe(oldRefresh);

      const reuseResp = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: oldRefresh });
      expect(reuseResp.status).toBe(401);

      const validNewRefreshResp = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: newRefresh });
      expect(validNewRefreshResp.status).toBe(200);
    });

    it('normalizes mixed-case emails to lowercase on send-otp and register', async () => {
      const mixed = 'MixedCase_Player@Example.COM';
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ email: mixed, purpose: 'REGISTER' });

      const reg = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
        email: mixed,
        username: 'mixed_player',
        otp: FIXED_TEST_OTP,
        password: PASSWORD,
      });
      expect(reg.status).toBe(201);

      const user = await prisma.user.findUnique({
        where: { email: 'mixedcase_player@example.com' },
      });
      expect(user).not.toBeNull();
    });

    it('enforces send-otp already-sent check, resend cooldown 429, and attempt exhaustion', async () => {
      const email = 'otp_cooldown@example.com';

      const resp1 = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'REGISTER', resend: false });
      expect(resp1.status).toBe(200);
      expect(resp1.body.data.is_already_sent).toBe(false);

      ctx.sendRegistrationOtpSpy.mockClear();

      const resp2 = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'REGISTER', resend: false });
      expect(resp2.status).toBe(200);
      expect(resp2.body.data.is_already_sent).toBe(true);
      expect(ctx.sendRegistrationOtpSpy).not.toHaveBeenCalled();

      const resp3 = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'REGISTER', resend: true });
      expect(resp3.status).toBe(429);

      // Exhaust 5 attempts -> next send-otp (even with resend=false) hits cooldown 429
      ctx.rateLimitService.reset();
      for (let i = 0; i < 5; i += 1) {
        await request(app.getHttpServer()).post('/api/v1/auth/register').send({
          email,
          username: 'cooldown_user',
          otp: '000000',
          password: PASSWORD,
        });
      }

      const resp4 = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'REGISTER', resend: false });
      expect(resp4.status).toBe(429);
    });

    it('supports logout, logout-all, and password reset revoking active sessions', async () => {
      const tokens = await registerAndVerify('reset_flow@example.com', 'reset_user');

      // Password reset for unknown email does not reveal existence
      const unknownSend = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ email: 'nobody@example.com', purpose: 'RESET_PASSWORD' });
      expect(unknownSend.status).toBe(200);

      const unknownReset = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'nobody@example.com',
          otp: FIXED_TEST_OTP,
          new_password: 'NewValidPassword123!',
        });
      expect(unknownReset.status).toBe(400);

      // Real password reset
      const sendReset = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ email: 'reset_flow@example.com', purpose: 'RESET_PASSWORD' });
      expect(sendReset.status).toBe(200);
      expect(ctx.sendPasswordResetOtpSpy).toHaveBeenCalledTimes(1);

      const newPassword = 'An0ther!Password';
      const resetResp = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'reset_flow@example.com',
          otp: FIXED_TEST_OTP,
          new_password: newPassword,
        });
      expect(resetResp.status).toBe(200);

      // Old refresh token is revoked and old password fails
      const oldRefreshAttempt = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: tokens.refresh_token });
      expect(oldRefreshAttempt.status).toBe(401);
      expect((await loginWithForm('reset_user', PASSWORD)).status).toBe(401);

      // New password succeeds, then logout-all revokes new session
      const newLogin = await loginWithForm('reset_user', newPassword);
      expect(newLogin.status).toBe(200);

      const logoutAll = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${newLogin.body.data.access_token}`);
      expect(logoutAll.status).toBe(200);

      const afterLogoutAll = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: newLogin.body.data.refresh_token });
      expect(afterLogoutAll.status).toBe(401);
    });

    it('rate-limits login attempts per IP (5/minute -> 6th returns 429)', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 6; i += 1) {
        const resp = await loginWithForm('nobody_rate_limit', 'wrong-password');
        statuses.push(resp.status);
      }
      expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
      expect(statuses[5]).toBe(429);
    });

    it('validates Google OAuth state cookie and exchanges code for tokens', async () => {
      const buildUrlSpy = jest
        .spyOn(ctx.googleOAuthClient, 'buildAuthorizationUrl')
        .mockImplementation(
          (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
        );
      const exchangeSpy = jest
        .spyOn(ctx.googleOAuthClient, 'exchangeCodeForProfile')
        .mockResolvedValue({
          email: 'google_player@example.com',
          verifiedEmail: true,
          name: 'Google Player',
          picture: 'https://example.com/pic.jpg',
        });

      try {
        // Missing state cookie -> 400
        const noCookieResp = await request(app.getHttpServer())
          .post('/api/v1/auth/google/exchange')
          .send({ code: 'abc', state: 'forged' });
        expect(noCookieResp.status).toBe(400);

        // Mismatched state cookie -> 400
        const mismatchResp = await request(app.getHttpServer())
          .post('/api/v1/auth/google/exchange')
          .set('Cookie', ['google_oauth_state=real-state'])
          .send({ code: 'abc', state: 'forged' });
        expect(mismatchResp.status).toBe(400);
        expect(mismatchResp.body.error.message.toLowerCase()).toContain('state');

        // Valid login redirect + exchange
        const loginRedirect = await request(app.getHttpServer()).get('/api/v1/auth/google/login');
        expect(loginRedirect.status).toBe(302);
        const setCookies = loginRedirect.headers['set-cookie'] as unknown as string[];
        const stateCookieHeader = setCookies.find((c) => c.startsWith('google_oauth_state='));
        expect(stateCookieHeader).toBeDefined();
        const stateValue = stateCookieHeader!.split(';')[0].split('=')[1];

        const exchangeResp = await request(app.getHttpServer())
          .post('/api/v1/auth/google/exchange')
          .set('Cookie', [`google_oauth_state=${stateValue}`])
          .send({ code: 'valid-google-code', state: stateValue });

        expect(exchangeResp.status).toBe(200);
        expect(exchangeResp.body.data.access_token).toBeTruthy();

        const meResp = await request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${exchangeResp.body.data.access_token}`);
        expect(meResp.status).toBe(200);
        expect(meResp.body.data.email).toBe('google_player@example.com');
        expect(meResp.body.data.full_name).toBe('Google Player');
      } finally {
        buildUrlSpy.mockRestore();
        exchangeSpy.mockRestore();
      }
    });
  });
});

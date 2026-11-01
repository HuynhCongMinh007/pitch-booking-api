/**
 * End-to-end auth flow tests against the test database.
 *
 * Emails are never actually sent (EmailService is mocked) and OTP generation is made
 * deterministic so the tests can complete verification / password reset.
 * Every test uses a unique email/username and deletes its user afterwards.
 */
import { hashToken } from '../src/shared/infrastructure/security';
import { bearer, createTestApp, randomSuffix, resetTestState, TestContext } from './helpers';

jest.mock('../src/shared/infrastructure/security', () => ({
  ...jest.requireActual('../src/shared/infrastructure/security'),
  generateOtp: () => '246810',
}));

const FIXED_OTP = '246810';
const PASSWORD = 'Sup3rSecret!pass';

let ctx: TestContext;
let identity: { email: string; username: string };

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(() => {
  resetTestState(ctx.emailService);
  const suffix = randomSuffix();
  identity = { email: `flow_${suffix}@example.com`, username: `flow_${suffix}` };
});

afterEach(async () => {
  await ctx.prisma.user.deleteMany({ where: { email: identity.email } });
});

afterAll(async () => {
  await ctx.app.close();
});

const post = (path: string, body?: object) => ctx.api().post(path).send(body);

function login(username: string, password = PASSWORD) {
  return ctx.api().post('/api/v1/auth/login').type('form').send({ username, password });
}

async function registerAndVerify() {
  let res = await post('/api/v1/auth/send-otp', { email: identity.email, purpose: 'REGISTER' });
  expect(res.status).toBe(200);
  res = await post('/api/v1/auth/register', { ...identity, otp: FIXED_OTP, password: PASSWORD });
  expect(res.status).toBe(201);
  return res.body.tokens;
}

test('full flow: register, verify, login, refresh, reuse', async () => {
  // Step 1: Send OTP
  let res = await post('/api/v1/auth/send-otp', { email: identity.email, purpose: 'REGISTER' });
  expect(res.status).toBe(200);
  expect(ctx.emailService.sendRegistrationOtpEmail).toHaveBeenCalledTimes(1);

  // Verify pending user record in database
  const pendingUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: identity.email } });
  expect(pendingUser.username.startsWith(identity.email.split('@')[0])).toBe(true);
  expect(pendingUser.is_active).toBe(true);
  expect(pendingUser.is_email_verified).toBe(false);

  // Login before completing registration -> generic 401 (no account status leak)
  const unverifiedLogin = await login(identity.email);
  expect(unverifiedLogin.status).toBe(401);
  expect(unverifiedLogin.body.detail).toBe('Email or password is incorrect');

  // Step 2: Register with wrong OTP -> 400
  res = await post('/api/v1/auth/register', { ...identity, otp: '999999', password: PASSWORD });
  expect(res.status).toBe(400);

  // Step 3: Register with correct OTP -> 201 and auto-login tokens
  res = await post('/api/v1/auth/register', { ...identity, otp: FIXED_OTP, password: PASSWORD });
  expect(res.status).toBe(201);
  expect(res.body.tokens.access_token).toBeTruthy();

  // Verify user record is now activated and updated with real username
  const activeUser = await ctx.prisma.user.findUniqueOrThrow({ where: { email: identity.email } });
  expect(activeUser.username).toBe(identity.username);
  expect(activeUser.is_active).toBe(true);
  expect(activeUser.is_email_verified).toBe(true);

  // Login (by email, different case) and call a protected endpoint
  res = await login(identity.email.toUpperCase());
  expect(res.status).toBe(200);
  const tokens = res.body;
  const me = await ctx.api().get('/api/v1/users/me').set(bearer(tokens.access_token));
  expect(me.status).toBe(200);
  expect(me.body.email).toBe(identity.email);

  // Refresh rotates the token pair
  const oldRefresh = tokens.refresh_token;
  res = await post('/api/v1/auth/refresh', { refresh_token: oldRefresh });
  expect(res.status).toBe(200);
  const newRefresh = res.body.refresh_token;
  expect(newRefresh).not.toBe(oldRefresh);

  // Reusing the rotated token is rejected (401), while the newly issued token remains valid
  res = await post('/api/v1/auth/refresh', { refresh_token: oldRefresh });
  expect(res.status).toBe(401);
  res = await post('/api/v1/auth/refresh', { refresh_token: newRefresh });
  expect(res.status).toBe(200);
});

test('refresh tokens are stored hashed', async () => {
  const tokens = await registerAndVerify();
  const raw = tokens.refresh_token;

  const row = await ctx.prisma.refreshToken.findUniqueOrThrow({
    where: { token_hash: hashToken(raw) },
  });
  expect(row.token_hash).not.toBe(raw);
  expect(row.token_hash).toHaveLength(64);
});

test('email is normalized to lowercase', async () => {
  const mixedCase = identity.email.replace('flow_', 'FLOW_').replace('example', 'Example');
  await post('/api/v1/auth/send-otp', { email: mixedCase, purpose: 'REGISTER' });
  const res = await post('/api/v1/auth/register', {
    username: identity.username,
    email: mixedCase,
    otp: FIXED_OTP,
    password: PASSWORD,
  });
  expect(res.status).toBe(201);

  const user = await ctx.prisma.user.findUniqueOrThrow({ where: { email: identity.email } });
  expect(user.email).toBe(identity.email);
});

test('wrong OTP counts attempts', async () => {
  await post('/api/v1/auth/send-otp', { email: identity.email, purpose: 'REGISTER' });
  const res = await post('/api/v1/auth/register', { ...identity, otp: '000000', password: PASSWORD });
  expect(res.status).toBe(400);
  expect(res.body.detail).toContain('attempts remaining');
});

test('logout revokes refresh token', async () => {
  const tokens = await registerAndVerify();
  let res = await post('/api/v1/auth/logout', { refresh_token: tokens.refresh_token });
  expect(res.status).toBe(200);
  res = await post('/api/v1/auth/refresh', { refresh_token: tokens.refresh_token });
  expect(res.status).toBe(401);
});

test('forgot and reset password', async () => {
  const oldTokens = await registerAndVerify();

  let res = await post('/api/v1/auth/send-otp', { email: identity.email, purpose: 'RESET_PASSWORD' });
  expect(res.status).toBe(200);
  expect(ctx.emailService.sendPasswordResetOtpEmail).toHaveBeenCalledTimes(1);

  const newPassword = 'An0ther!Password';
  res = await post('/api/v1/auth/reset-password', {
    email: identity.email,
    otp: FIXED_OTP,
    new_password: newPassword,
  });
  expect(res.status).toBe(200);

  // Old sessions are revoked, old password no longer works, new one does
  res = await post('/api/v1/auth/refresh', { refresh_token: oldTokens.refresh_token });
  expect(res.status).toBe(401);
  expect((await login(identity.username)).status).toBe(401);
  expect((await login(identity.username, newPassword)).status).toBe(200);
});

test('login is rate limited', async () => {
  // Default RATE_LIMIT_LOGIN is 5/minute per IP
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    const res = await login('nobody_rate_limit_test', 'wrong-password');
    statuses.push(res.status);
  }
  expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
  expect(statuses[5]).toBe(429);
});

test('google exchange requires matching state', async () => {
  // No state cookie at all
  let res = await post('/api/v1/auth/google/exchange', { code: 'abc', state: 'forged' });
  expect(res.status).toBe(400);

  // Cookie present but state mismatch
  res = await ctx
    .api()
    .post('/api/v1/auth/google/exchange')
    .set('Cookie', 'google_oauth_state=real-state')
    .send({ code: 'abc', state: 'forged' });
  expect(res.status).toBe(400);
  expect(res.body.detail.toLowerCase()).toContain('state');
});

test('old refreshtoken path removed', async () => {
  const res = await post('/api/v1/auth/refreshtoken', { refresh_token: 'x' });
  expect(res.status).toBe(404);
});

test('unified registration and deprecated endpoints removed', async () => {
  // Verify deprecated endpoints return 404
  let res = await post('/api/v1/auth/register/verify-otp', { email: identity.email, otp: FIXED_OTP });
  expect(res.status).toBe(404);

  res = await post('/api/v1/auth/register/complete', {
    registration_token: 'token',
    username: 'user',
    password: PASSWORD,
  });
  expect(res.status).toBe(404);

  // Step 1: Send OTP for email
  res = await post('/api/v1/auth/send-otp', {
    email: identity.email,
    purpose: 'REGISTER',
    resend: false,
  });
  expect(res.status).toBe(200);
  expect(res.body.is_already_sent).toBe(false);

  // Step 2: Register directly with email, otp, username, password
  res = await post('/api/v1/auth/register', {
    email: identity.email,
    otp: FIXED_OTP,
    username: identity.username,
    password: PASSWORD,
  });
  expect(res.status).toBe(201);
  expect(res.body.tokens.access_token).toBeTruthy();

  // Verify user can login and access /me
  res = await login(identity.username);
  expect(res.status).toBe(200);
  const me = await ctx.api().get('/api/v1/users/me').set(bearer(res.body.access_token));
  expect(me.status).toBe(200);
  expect(me.body.username).toBe(identity.username);
  expect(me.body.email).toBe(identity.email);
});

test('send-otp flow', async () => {
  const { email } = identity;

  // 1. First send: resend=false -> sends OTP
  const res1 = await post('/api/v1/auth/send-otp', { email, purpose: 'REGISTER', resend: false });
  expect(res1.status).toBe(200);
  expect(res1.body.is_already_sent).toBe(false);
  expect(res1.body.email).toBe(email);
  expect(ctx.emailService.sendRegistrationOtpEmail).toHaveBeenCalledTimes(1);

  // 2. Second send: resend=false, OTP still valid -> reports already sent & valid, no new email
  jest.mocked(ctx.emailService.sendRegistrationOtpEmail).mockClear();
  const res2 = await post('/api/v1/auth/send-otp', { email, purpose: 'REGISTER', resend: false });
  expect(res2.status).toBe(200);
  expect(res2.body.is_already_sent).toBe(true);
  expect(res2.body.expires_in_seconds).toBeGreaterThan(0);
  expect(ctx.emailService.sendRegistrationOtpEmail).not.toHaveBeenCalled();

  // 3. Third send: resend=true while in cooldown -> 429 error
  const res3 = await post('/api/v1/auth/send-otp', { email, purpose: 'REGISTER', resend: true });
  expect(res3.status).toBe(429);

  // 4. Fourth send: even with resend=false, if OTP attempts are exhausted during cooldown -> 429
  // Simulate 5 failed attempts to lock the current OTP
  for (let i = 0; i < 5; i++) {
    await post('/api/v1/auth/register', {
      username: `user_${email.split('@')[0]}`,
      email,
      otp: '000000',
      password: 'Password123!',
    });
  }
  const res4 = await post('/api/v1/auth/send-otp', { email, purpose: 'REGISTER', resend: false });
  expect(res4.status).toBe(429);
});

import { buildOtpHtml } from '../src/services/email.service';
import { createTestApp, resetTestState, TestContext } from './helpers';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(() => resetTestState(ctx.emailService));

afterAll(async () => {
  await ctx.app.close();
});

const post = (path: string, body?: object) => ctx.api().post(path).send(body);

test('register validation: short password', async () => {
  const res = await post('/api/v1/auth/register', {
    username: 'testuser',
    email: 'test@example.com',
    otp: '123456',
    password: '123', // Less than 8 chars
  });
  expect(res.status).toBe(422);
});

test('register validation: invalid email', async () => {
  const res = await post('/api/v1/auth/register', {
    username: 'testuser',
    email: 'not-an-email',
    otp: '123456',
    password: 'valid_password_123',
  });
  expect(res.status).toBe(422);
});

test('swagger docs', async () => {
  const res = await ctx.api().get('/docs');
  expect(res.status).toBe(200);
  expect(res.text).toContain('Swagger UI');

  const openapi = await ctx.api().get('/openapi.json');
  expect(openapi.status).toBe(200);
  const paths = Object.keys(openapi.body.paths);
  expect(paths).toContain('/api/v1/auth/register');
  expect(paths).not.toContain('/api/v1/auth/verify-email');
  expect(paths).not.toContain('/api/v1/auth/register/verify-otp');
  expect(paths).not.toContain('/api/v1/auth/register/complete');
  expect(paths).not.toContain('/api/v1/auth/forgot-password');
  expect(paths).toContain('/api/v1/auth/send-otp');
});

test('register validation: username with @', async () => {
  const res = await post('/api/v1/auth/register', {
    username: 'someone@example.com', // '@' is not allowed in usernames
    email: 'test@example.com',
    otp: '123456',
    password: 'valid_password_123',
  });
  expect(res.status).toBe(422);
});

test('register validation: short username', async () => {
  const res = await post('/api/v1/auth/register', {
    username: 'abcde',
    email: 'test@example.com',
    otp: '123456',
    password: 'valid_password_123',
  });
  expect(res.status).toBe(422);
});

test('forgot-password endpoint removed', async () => {
  const res = await post('/api/v1/auth/forgot-password', { email: 'test@example.com' });
  expect(res.status).toBe(404);
});

test('send-otp RESET_PASSWORD does not reveal unknown email', async () => {
  const res = await post('/api/v1/auth/send-otp', {
    email: 'nonexistent_pitch_user@example.com',
    purpose: 'RESET_PASSWORD',
  });
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('message');
});

test('resend-otp endpoint removed', async () => {
  const res = await post('/api/v1/auth/resend-otp', {
    email: 'nonexistent_pitch_user@example.com',
    purpose: 'REGISTER',
  });
  expect(res.status).toBe(404);
});

test('verify-email endpoint removed', async () => {
  const res = await post('/api/v1/auth/verify-email', {
    email: 'nonexistent_pitch_user@example.com',
    otp: '123456',
  });
  expect(res.status).toBe(404);
});

test('reset-password with unknown email', async () => {
  const res = await post('/api/v1/auth/reset-password', {
    email: 'nonexistent_pitch_user@example.com',
    otp: '123456',
    new_password: 'NewValidPassword123!',
  });
  // Same error as an invalid OTP so the email's existence is not revealed
  expect(res.status).toBe(400);
});

test('reset-password missing otp', async () => {
  const res = await post('/api/v1/auth/reset-password', {
    email: 'someone@example.com',
    new_password: 'NewValidPassword123!',
  });
  expect(res.status).toBe(422);
});

test('reset-password short password', async () => {
  const res = await post('/api/v1/auth/reset-password', {
    email: 'someone@example.com',
    otp: '123456',
    new_password: '123',
  });
  expect(res.status).toBe(422);
});

test('email html escapes XSS', () => {
  const html = buildOtpHtml(
    'Verify <script>',
    'Player <script>alert("XSS")</script>',
    'Please enter code: <img src=x onerror=steal()>',
    '123456',
    false,
  );
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;img');
});

import { bearer, createTestApp, randomSuffix, resetTestState, TestContext } from './helpers';

jest.mock('../src/shared/infrastructure/security', () => ({
  ...jest.requireActual('../src/shared/infrastructure/security'),
  generateOtp: () => '246810',
}));

const FIXED_OTP = '246810';
const PASSWORD = 'Sup3rSecret!pass';

let ctx: TestContext;
let authUser: {
  identity: { email: string; username: string; password: string };
  token: string;
  headers: { Authorization: string };
};

beforeAll(async () => {
  ctx = await createTestApp();
});

beforeEach(async () => {
  resetTestState(ctx.emailService);

  const suffix = randomSuffix();
  const identity = {
    email: `user_${suffix}@example.com`,
    username: `user_${suffix}`,
    password: PASSWORD,
  };

  // Send OTP & Register
  await ctx.api().post('/api/v1/auth/send-otp').send({ email: identity.email, purpose: 'REGISTER' });
  const res = await ctx
    .api()
    .post('/api/v1/auth/register')
    .send({ ...identity, otp: FIXED_OTP });
  expect(res.status).toBe(201);
  const token = res.body.tokens.access_token;

  authUser = { identity, token, headers: bearer(token) };
});

afterEach(async () => {
  await ctx.prisma.user.deleteMany({ where: { email: authUser.identity.email } });
});

afterAll(async () => {
  await ctx.app.close();
});

const getMe = () => ctx.api().get('/api/v1/users/me').set(authUser.headers);
const patchMe = (body: object) => ctx.api().patch('/api/v1/users/me').set(authUser.headers).send(body);

test('get me: initial profile', async () => {
  const res = await getMe();
  expect(res.status).toBe(200);
  expect(res.body.email).toBe(authUser.identity.email);
  expect(res.body.username).toBe(authUser.identity.username);
  expect(res.body.full_name).toBeNull();
  expect(res.body.phone_number).toBeNull();
  expect(res.body.address).toBeNull();
});

test('update me: all fields', async () => {
  const payload = {
    full_name: 'Nguyễn Văn A',
    phone_number: '0912345678',
    address: '123 Đường Số 1, Quận 1, TP. HCM',
    avatar_url: 'https://example.com/avatar.jpg',
    date_of_birth: '1995-10-25',
    gender: 'male',
    bio: 'Đam mê bóng đá sân 7 và cầu lông',
  };
  const res = await patchMe(payload);
  expect(res.status).toBe(200);
  expect(res.body.full_name).toBe(payload.full_name);
  expect(res.body.phone_number).toBe(payload.phone_number);
  expect(res.body.address).toBe(payload.address);
  expect(res.body.avatar_url).toBe(payload.avatar_url);
  expect(res.body.date_of_birth).toBe(payload.date_of_birth);
  expect(res.body.gender).toBe('MALE');
  expect(res.body.bio).toBe(payload.bio);

  // Verify persistence via GET /me
  const getRes = await getMe();
  expect(getRes.status).toBe(200);
  expect(getRes.body.full_name).toBe('Nguyễn Văn A');
  expect(getRes.body.phone_number).toBe('0912345678');
  expect(getRes.body.gender).toBe('MALE');
});

test('partial update keeps existing fields', async () => {
  // Step 1: Set full_name and phone_number
  await patchMe({ full_name: 'Tran Van B', phone_number: '0987654321' });

  // Step 2: Update only bio
  const res = await patchMe({ bio: 'Hậu vệ thòng' });
  expect(res.status).toBe(200);
  expect(res.body.full_name).toBe('Tran Van B');
  expect(res.body.phone_number).toBe('0987654321');
  expect(res.body.bio).toBe('Hậu vệ thòng');
});

test('update with invalid phone number', async () => {
  const res = await patchMe({ phone_number: 'not-a-phone' });
  expect(res.status).toBe(422);
});

test('get user by id', async () => {
  const userId = (await getMe()).body.id;

  // Fetch user profile by ID (public view)
  const profile = await ctx.api().get(`/api/v1/users/${userId}`).set(authUser.headers);
  expect(profile.status).toBe(200);
  expect(profile.body.id).toBe(userId);
  expect(profile.body.username).toBe(authUser.identity.username);
  expect(profile.body).toHaveProperty('gender');
  expect(profile.body.gender).toBeNull();
  // Sensitive PII must not be exposed to other users
  expect(profile.body).not.toHaveProperty('email');
  expect(profile.body).not.toHaveProperty('phone_number');
  expect(profile.body).not.toHaveProperty('address');
  expect(profile.body).not.toHaveProperty('date_of_birth');
  expect(profile.body).not.toHaveProperty('is_email_verified');

  // Update gender and verify GET by ID returns updated gender
  await patchMe({ gender: 'FEMALE' });
  const updated = await ctx.api().get(`/api/v1/users/${userId}`).set(authUser.headers);
  expect(updated.status).toBe(200);
  expect(updated.body.gender).toBe('FEMALE');
});

test('get user by id: not found', async () => {
  const res = await ctx.api().get('/api/v1/users/99999999').set(authUser.headers);
  expect(res.status).toBe(404);
});

test('user endpoints require authentication', async () => {
  const resGet = await ctx.api().get('/api/v1/users/me');
  expect(resGet.status).toBe(401);

  const resPatch = await ctx.api().patch('/api/v1/users/me').send({ full_name: 'Test' });
  expect(resPatch.status).toBe(401);
});

test('get me: disabled user', async () => {
  // Disable user in DB
  await ctx.prisma.user.update({
    where: { email: authUser.identity.email },
    data: { is_active: false },
  });

  const res = await getMe();
  expect(res.status).toBe(403);
  expect(res.body.detail).toBe('Account has been disabled');

  const resPatch = await patchMe({ full_name: 'Test' });
  expect(resPatch.status).toBe(403);
  expect(resPatch.body.detail).toBe('Account has been disabled');
});

test('update phone number is cleaned', async () => {
  const res = await patchMe({ phone_number: '+84 (912) 345-678' });
  expect(res.status).toBe(200);
  expect(res.body.phone_number).toBe('+84912345678');
});

test('update with invalid avatar url', async () => {
  const res = await patchMe({ avatar_url: 'javascript:alert(1)' });
  expect(res.status).toBe(422);
});

test('update with future date of birth', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const res = await patchMe({ date_of_birth: `${tomorrow.getFullYear()}-${month}-${day}` });
  expect(res.status).toBe(422);
});

test('update with invalid gender', async () => {
  const res = await patchMe({ gender: 'alien' });
  expect(res.status).toBe(422);
});

test('update me sanitizes XSS', async () => {
  const res = await patchMe({
    full_name: 'Hacker <script>alert("XSS")</script>',
    bio: '<img src=x onerror=alert("hacked")> Yêu bóng đá',
    address: '123 Đường Số 1 <iframe src="evil.com"></iframe>',
  });
  expect(res.status).toBe(200);

  // Raw script, iframe, and img tags must be escaped
  expect(res.body.full_name).not.toContain('<script>');
  expect(res.body.full_name).toContain('&lt;script&gt;');

  expect(res.body.bio).not.toContain('<img');
  expect(res.body.bio).toContain('&lt;img');

  expect(res.body.address).not.toContain('<iframe');
  expect(res.body.address).toContain('&lt;iframe');
});

test('update username', async () => {
  const newUsername = `new_${randomSuffix(12)}`;
  const res = await patchMe({ username: newUsername });
  expect(res.status).toBe(200);
  expect(res.body.username).toBe(newUsername);

  // Re-sending the same username should succeed
  const resSame = await patchMe({ username: newUsername });
  expect(resSame.status).toBe(200);
  expect(resSame.body.username).toBe(newUsername);
});

test('update username already taken', async () => {
  const takenUsername = `taken_${randomSuffix()}`;

  // Create another user in DB
  const otherUser = await ctx.prisma.user.create({
    data: {
      username: takenUsername,
      email: `other_${randomSuffix()}@example.com`,
      password_hash: 'fakehash',
    },
  });

  try {
    const res = await patchMe({ username: takenUsername });
    expect(res.status).toBe(409);
    expect(res.body.detail).toBe('Username is already taken');
  } finally {
    await ctx.prisma.user.delete({ where: { id: otherUser.id } });
  }
});

test('update username with invalid format', async () => {
  // Invalid: contains @
  expect((await patchMe({ username: 'user@domain' })).status).toBe(422);

  // Invalid: too short (< 6 chars)
  expect((await patchMe({ username: 'abcde' })).status).toBe(422);

  // Invalid: contains spaces
  expect((await patchMe({ username: 'bad user' })).status).toBe(422);
});

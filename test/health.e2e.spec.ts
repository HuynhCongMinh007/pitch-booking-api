import { createTestApp, TestContext } from './helpers';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

test('health check', async () => {
  const res = await ctx.api().get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

test('security headers are present', async () => {
  const res = await ctx.api().get('/health');
  expect(res.status).toBe(200);
  expect(res.headers['x-content-type-options']).toBe('nosniff');
  expect(res.headers['x-frame-options']).toBe('DENY');
  expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(res.headers['content-security-policy']).toContain("default-src 'none'");
});

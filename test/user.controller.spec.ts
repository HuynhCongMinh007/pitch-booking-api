import 'reflect-metadata';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

import { configureApp } from '../src/app.setup';
import { AccountDisabledError } from '../src/modules/user/application/errors/user.errors';
import { UpdateMeUseCase } from '../src/modules/user/application/use-cases/update-me.use-case';
import {
  InvalidUserError,
  User,
  UsernameAlreadyTakenError,
  UserNotFoundError,
  UserRole,
} from '../src/modules/user/domain';
import { UserController } from '../src/modules/user/presentation/controllers/user.controller';
import { createToken } from '../src/shared/infrastructure/security';

const execute = jest.fn();

@Module({
  controllers: [UserController],
  providers: [{ provide: UpdateMeUseCase, useValue: { execute } }],
})
class TestModule {}

const savedUser = User.reconstitute({
  id: 7,
  username: 'john_doe',
  email: 'john@example.com',
  passwordHash: 'hash',
  role: UserRole.CUSTOMER,
  isActive: true,
  isEmailVerified: true,
  fullName: 'John',
  phoneNumber: null,
  address: null,
  avatarUrl: null,
  dateOfBirth: new Date('1990-05-17T00:00:00.000Z'),
  gender: null,
  bio: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-02T00:00:00.000Z'),
});

let app: Awaited<ReturnType<typeof NestFactory.create>>;
const auth = { Authorization: `Bearer ${createToken(7, 'access').token}` };
const patchMe = (body: object) => request(app.getHttpServer()).patch('/api/v1/users/me').set(auth).send(body);

beforeAll(async () => {
  app = await NestFactory.create(TestModule, { logger: false });
  configureApp(app);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue(savedUser);
});

test('maps the request to the use case input and the user to the response', async () => {
  const res = await patchMe({ full_name: 'John', date_of_birth: '1990-05-17' });

  expect(res.status).toBe(200);
  expect(execute).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 7,
      fullName: 'John',
      dateOfBirth: new Date('1990-05-17T00:00:00.000Z'),
      username: undefined,
      bio: undefined,
    }),
  );
  expect(res.body).toMatchObject({
    id: 7,
    username: 'john_doe',
    is_active: true,
    full_name: 'John',
    date_of_birth: '1990-05-17',
  });
});

test('requires a token', async () => {
  const res = await request(app.getHttpServer()).patch('/api/v1/users/me').send({});
  expect(res.status).toBe(401);
  expect(execute).not.toHaveBeenCalled();
});

test('request validation (zod) stops before the use case', async () => {
  const res = await patchMe({ gender: 'ROBOT' });
  expect(res.status).toBe(422);
  expect(execute).not.toHaveBeenCalled();
});

test('cleans the request: escapes HTML, blank becomes null, gender is case-insensitive', async () => {
  await patchMe({ full_name: ' <b>John</b> ', phone_number: '  ', gender: 'male' });
  expect(execute).toHaveBeenCalledWith(
    expect.objectContaining({
      fullName: '&lt;b&gt;John&lt;/b&gt;',
      phoneNumber: null,
      gender: 'MALE',
    }),
  );
});

test.each([
  ['UserNotFoundError', new UserNotFoundError(7), 404],
  ['AccountDisabledError', new AccountDisabledError(), 403],
  ['UsernameAlreadyTakenError', new UsernameAlreadyTakenError(), 409],
  ['InvalidUserError', new InvalidUserError('bio too long'), 422],
])('%s becomes HTTP %i with a { detail } body', async (_name, error, status) => {
  execute.mockRejectedValue(error);
  const res = await patchMe({ bio: 'x' });
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ detail: error.message });
});

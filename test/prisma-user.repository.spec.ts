import { PrismaClient } from '@prisma/client';

import {
  EmailAlreadyRegisteredError,
  User,
  UsernameAlreadyTakenError,
  UserRole,
} from '../src/modules/user/domain';
import { PrismaUserRepository } from '../src/modules/user/infrastructure/repositories/prisma-user.repository';
import { PrismaService } from '../src/shared/infrastructure/prisma.service';
import { randomSuffix } from './helpers';

const prisma = new PrismaService();
const repository = new PrismaUserRepository(prisma);
const prefix = `repo${randomSuffix(6)}`;
let counter = 0;

function newUser(overrides: { username?: string; email?: string } = {}): User {
  counter += 1;
  return User.create({
    username: overrides.username ?? `${prefix}_user${counter}`,
    email: overrides.email ?? `${prefix}_${counter}@example.com`,
    passwordHash: 'hash',
  });
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test('create saves a new user and returns it with id and timestamps', async () => {
  const saved = await repository.create(newUser());

  expect(saved.id).toEqual(expect.any(Number));
  expect(saved.role).toBe(UserRole.CUSTOMER);
  expect(saved.isActive).toBe(true);
  expect(saved.isEmailVerified).toBe(false);
  expect(saved.createdAt).toBeInstanceOf(Date);
});

test('finds a user by id, email, username and identifier (case-insensitive)', async () => {
  const saved = await repository.create(newUser());

  expect((await repository.findById(saved.id as number))?.email).toBe(saved.email);
  expect((await repository.findByEmail(saved.email.toUpperCase()))?.id).toBe(saved.id);
  expect((await repository.findByUsername(saved.username.toUpperCase()))?.id).toBe(saved.id);
  expect((await repository.findByEmailOrUsername(saved.email))?.id).toBe(saved.id);
  expect((await repository.findByEmailOrUsername(saved.username))?.id).toBe(saved.id);
});

test('returns null when nothing matches', async () => {
  expect(await repository.findById(2_000_000_000)).toBeNull();
  expect(await repository.findByEmail('nobody@nowhere.test')).toBeNull();
  expect(await repository.findByUsername('   ')).toBeNull();
});

test('update saves the changes made on the entity', async () => {
  const saved = await repository.create(newUser());

  saved.updateProfile({ fullName: 'John', phoneNumber: '+84 901 234 567', gender: 'MALE' });
  saved.changePassword('new-hash');
  saved.deactivate();
  const updated = await repository.update(saved);

  const reloaded = await repository.findById(updated.id as number);
  expect(reloaded?.fullName).toBe('John');
  expect(reloaded?.phoneNumber).toBe('+84901234567');
  expect(reloaded?.gender).toBe('MALE');
  expect(reloaded?.passwordHash).toBe('new-hash');
  expect(reloaded?.isActive).toBe(false);
});

test('a duplicate username or email becomes a domain error', async () => {
  const first = await repository.create(newUser());

  await expect(repository.create(newUser({ username: first.username }))).rejects.toThrow(
    UsernameAlreadyTakenError,
  );
  await expect(repository.create(newUser({ email: first.email }))).rejects.toThrow(
    EmailAlreadyRegisteredError,
  );

  const second = await repository.create(newUser());
  second.changeUsername(first.username);
  await expect(repository.update(second)).rejects.toThrow(UsernameAlreadyTakenError);
});

test('update refuses a user that was never saved', async () => {
  await expect(repository.update(newUser())).rejects.toThrow('has not been saved');
});

test('a legacy row that breaks today\'s rules still loads', async () => {
  const raw = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const legacy = await raw.user.create({
    data: { username: 'old@name', email: `${prefix}_legacy@example.com`, password_hash: 'hash' },
  });
  await raw.$disconnect();

  const user = await repository.findById(legacy.id);
  expect(user?.username).toBe('old@name');
});

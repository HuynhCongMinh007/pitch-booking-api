import { AccountDisabledError } from '../src/modules/user/application/errors/user.errors';
import { UpdateMeUseCase } from '../src/modules/user/application/use-cases/update-me.use-case';
import {
  InvalidUserError,
  User,
  UserNotFoundError,
  UsernameAlreadyTakenError,
  UserProps,
  UserRepository,
  UserRole,
} from '../src/modules/user/domain';

/** In-memory UserRepository: the use case is tested without a database. */
class InMemoryUserRepository extends UserRepository {
  users: User[] = [];
  updateCalls = 0;

  async findById(id: number) {
    return this.users.find((user) => user.id === id) ?? null;
  }
  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email.toLowerCase()) ?? null;
  }
  async findByUsername(username: string) {
    return this.users.find((user) => user.username === username.trim()) ?? null;
  }
  async findByEmailOrUsername(identifier: string) {
    return identifier.includes('@')
      ? this.findByEmail(identifier)
      : this.findByUsername(identifier);
  }
  async create(user: User) {
    this.users.push(user);
    return user;
  }
  async update(user: User) {
    this.updateCalls += 1;
    return user;
  }
}

function userWith(overrides: Partial<UserProps>): User {
  return User.reconstitute({
    id: 1,
    username: 'john_doe',
    email: 'john@example.com',
    passwordHash: 'hash',
    role: UserRole.CUSTOMER,
    isActive: true,
    isEmailVerified: true,
    fullName: null,
    phoneNumber: null,
    address: null,
    avatarUrl: null,
    dateOfBirth: null,
    gender: null,
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

let repository: InMemoryUserRepository;
let useCase: UpdateMeUseCase;

beforeEach(() => {
  repository = new InMemoryUserRepository();
  repository.users = [userWith({ id: 1 }), userWith({ id: 2, username: 'other_user', email: 'o@x.com' })];
  useCase = new UpdateMeUseCase(repository);
});

test('updates the sent fields and saves the user', async () => {
  const user = await useCase.execute({ userId: 1, fullName: 'John', username: 'new_name' });
  expect(user.fullName).toBe('John');
  expect(user.username).toBe('new_name');
  expect(repository.updateCalls).toBe(1);
});

test('nothing to change: returns the user without saving', async () => {
  await useCase.execute({ userId: 1, username: 'john_doe' });
  expect(repository.updateCalls).toBe(0);
});

test('unknown user', async () => {
  await expect(useCase.execute({ userId: 99 })).rejects.toThrow(UserNotFoundError);
});

test('disabled account', async () => {
  repository.users[0].deactivate();
  await expect(useCase.execute({ userId: 1, bio: 'x' })).rejects.toThrow(AccountDisabledError);
});

test('username already taken by another user', async () => {
  await expect(useCase.execute({ userId: 1, username: 'other_user' })).rejects.toThrow(
    UsernameAlreadyTakenError,
  );
  expect(repository.updateCalls).toBe(0);
});

test('a broken rule is rejected and nothing is saved', async () => {
  await expect(useCase.execute({ userId: 1, phoneNumber: '123' })).rejects.toThrow(InvalidUserError);
  expect(repository.updateCalls).toBe(0);
});

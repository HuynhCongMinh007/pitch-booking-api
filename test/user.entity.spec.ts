import { InvalidUserError, User, UserProps, UserRole } from '../src/modules/user/domain';

const valid = { username: 'john_doe', email: 'john@example.com', passwordHash: 'hash' };

function existingUser(overrides: Partial<UserProps> = {}): User {
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

describe('User.create', () => {
  test('creates an active customer with an unverified email and normalizes input', () => {
    const user = User.create({ ...valid, username: '  john_doe ', email: ' John@Example.COM ' });
    expect(user.id).toBeNull();
    expect(user.username).toBe('john_doe');
    expect(user.email).toBe('john@example.com');
    expect(user.role).toBe(UserRole.CUSTOMER);
    expect(user.isActive).toBe(true);
    expect(user.isEmailVerified).toBe(false);
    expect(user.canLogin).toBe(false);
  });

  test.each([
    ['too short username', { username: 'abc' }],
    ['too long username', { username: 'a'.repeat(51) }],
    ['username with @', { username: 'john@doe1' }],
    ['username with a space', { username: 'john doe' }],
    ['invalid email', { email: 'not-an-email' }],
    ['too long email', { email: `${'a'.repeat(250)}@x.com` }],
    ['empty password hash', { passwordHash: '' }],
    ['non-http avatar', { avatarUrl: 'ftp://x.com/a.png' }],
    ['too long full name', { fullName: 'a'.repeat(256) }],
  ])('rejects %s', (_name, override) => {
    expect(() => User.create({ ...valid, ...override })).toThrow(InvalidUserError);
  });
});

describe('User.reconstitute', () => {
  test('does not check rules (legacy rows keep loading)', () => {
    const user = existingUser({ username: 'old@name', email: 'legacy' });
    expect(user.username).toBe('old@name');
  });
});

describe('User behaviour', () => {
  test('completeRegistration verifies the email and activates the account', () => {
    const user = User.create(valid);
    user.completeRegistration(' new_name ', 'new-hash');
    expect(user.username).toBe('new_name');
    expect(user.passwordHash).toBe('new-hash');
    expect(user.isEmailVerified).toBe(true);
    expect(user.canLogin).toBe(true);
  });

  test('a disabled user cannot log in', () => {
    const user = existingUser();
    user.deactivate();
    expect(user.canLogin).toBe(false);
    user.activate();
    expect(user.canLogin).toBe(true);
  });

  test('changeUsername checks the username rules', () => {
    const user = existingUser();
    expect(() => user.changeUsername('x')).toThrow(InvalidUserError);
    expect(user.username).toBe('john_doe');
    user.changeUsername('another_name');
    expect(user.username).toBe('another_name');
  });
});

describe('User.updateProfile', () => {
  test('applies sent fields, keeps undefined ones and allows null to clear', () => {
    const user = existingUser({ bio: 'old bio', address: 'old address' });
    user.updateProfile({ fullName: 'John', bio: null, phoneNumber: '+84 (901) 234-567' });
    expect(user.fullName).toBe('John');
    expect(user.bio).toBeNull();
    expect(user.address).toBe('old address');
    expect(user.phoneNumber).toBe('+84901234567');
  });

  test.each([
    ['short phone', { phoneNumber: '12345' }],
    ['phone with letters', { phoneNumber: '12345abc' }],
    ['non-http avatar', { avatarUrl: 'javascript:alert(1)' }],
    ['future birth date', { dateOfBirth: new Date(Date.now() + 86_400_000) }],
    ['invalid date', { dateOfBirth: new Date('nope') }],
    ['too long bio', { bio: 'a'.repeat(1001) }],
    ['unknown gender', { gender: 'ROBOT' as never }],
  ])('rejects %s', (_name, changes) => {
    expect(() => existingUser().updateProfile(changes)).toThrow(InvalidUserError);
  });

  test('a violation leaves the user unchanged', () => {
    const user = existingUser({ fullName: 'Before' });
    expect(() => user.updateProfile({ fullName: 'After', phoneNumber: '1' })).toThrow(
      InvalidUserError,
    );
    expect(user.fullName).toBe('Before');
  });
});

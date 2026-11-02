import { Gender, PrismaClient, User, UserRole } from '@prisma/client';

export interface CreateUserOverrides {
  username?: string;
  email?: string;
  password_hash?: string;
  role?: UserRole;
  gender?: Gender;
  full_name?: string;
}

export async function createUserFixture(
  prisma: PrismaClient,
  overrides: CreateUserOverrides = {},
): Promise<User> {
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  return prisma.user.create({
    data: {
      username: overrides.username || `testuser_${randomSuffix}`,
      email: overrides.email || `test_${randomSuffix}@example.com`,
      password_hash: overrides.password_hash || '$argon2id$v=19$m=65536,t=3,p=4$fakehash',
      role: overrides.role || UserRole.CUSTOMER,
      gender: overrides.gender,
      full_name: overrides.full_name || 'Test User',
    },
  });
}

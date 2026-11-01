import type { Prisma, User as PrismaUser } from '@prisma/client';

import { User } from '../../domain/entities/user.entity';
import type { Gender } from '../../domain/gender';
import type { UserRole } from '../../domain/user-role';

/** Database row (snake_case) -> domain entity. Rules are not checked: old rows keep loading. */
export function toDomainUser(row: PrismaUser): User {
  return User.reconstitute({
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    isActive: row.is_active,
    isEmailVerified: row.is_email_verified,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    address: row.address,
    avatarUrl: row.avatar_url,
    dateOfBirth: row.date_of_birth,
    gender: row.gender as Gender | null,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

/** New entity -> INSERT data (id and timestamps come from the database). */
export function toCreateData(user: User): Prisma.UserCreateInput {
  return {
    username: user.username,
    email: user.email,
    password_hash: user.passwordHash,
    role: user.role,
    is_active: user.isActive,
    is_email_verified: user.isEmailVerified,
    full_name: user.fullName,
    phone_number: user.phoneNumber,
    address: user.address,
    avatar_url: user.avatarUrl,
    date_of_birth: user.dateOfBirth,
    gender: user.gender,
    bio: user.bio,
  };
}

/** Entity -> UPDATE data: every column the entity may change (email and role never change). */
export function toUpdateData(user: User): Prisma.UserUpdateInput {
  return {
    username: user.username,
    password_hash: user.passwordHash,
    is_active: user.isActive,
    is_email_verified: user.isEmailVerified,
    full_name: user.fullName,
    phone_number: user.phoneNumber,
    address: user.address,
    avatar_url: user.avatarUrl,
    date_of_birth: user.dateOfBirth,
    gender: user.gender,
    bio: user.bio,
  };
}

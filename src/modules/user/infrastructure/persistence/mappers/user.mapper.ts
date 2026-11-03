import type { Prisma, User as PrismaUser } from '@prisma/client';

import { UserEntity } from '../../../domain/entities/user.entity';
import type { Gender } from '../../../domain/enums/gender.enum';
import type { UserRole } from '../../../domain/enums/user-role.enum';

export class UserMapper {
  static toDomain(raw: PrismaUser): UserEntity {
    return UserEntity.reconstitute(
      {
        username: raw.username,
        email: raw.email,
        passwordHash: raw.password_hash,
        role: raw.role as UserRole,
        isActive: raw.is_active,
        isEmailVerified: raw.is_email_verified,
        fullName: raw.full_name,
        phoneNumber: raw.phone_number,
        address: raw.address,
        avatarUrl: raw.avatar_url,
        dateOfBirth: raw.date_of_birth,
        gender: (raw.gender as Gender | null) ?? null,
        bio: raw.bio,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
      },
      raw.id,
    );
  }

  static toCreateInput(entity: UserEntity): Prisma.UserCreateInput {
    return {
      username: entity.username.trim(),
      email: entity.email.trim().toLowerCase(),
      password_hash: entity.passwordHash,
      role: entity.role,
      is_active: entity.isActive,
      is_email_verified: entity.isEmailVerified,
      full_name: entity.fullName,
      phone_number: entity.phoneNumber,
      address: entity.address,
      avatar_url: entity.avatarUrl,
      date_of_birth: entity.dateOfBirth,
      gender: entity.gender,
      bio: entity.bio,
    };
  }

  static toUpdateInput(entity: UserEntity): Prisma.UserUpdateInput {
    return {
      username: entity.username.trim(),
      email: entity.email.trim().toLowerCase(),
      password_hash: entity.passwordHash,
      role: entity.role,
      is_active: entity.isActive,
      is_email_verified: entity.isEmailVerified,
      full_name: entity.fullName,
      phone_number: entity.phoneNumber,
      address: entity.address,
      avatar_url: entity.avatarUrl,
      date_of_birth: entity.dateOfBirth,
      gender: entity.gender,
      bio: entity.bio,
    };
  }
}


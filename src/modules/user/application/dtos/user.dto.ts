import type { UserEntity } from '../../domain/entities/user.entity';
import type { Gender } from '../../domain/enums/gender.enum';
import type { UserRole } from '../../domain/enums/user-role.enum';

export interface PublicUserResponseDto {
  id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  gender: Gender | null;
  bio: string | null;
  created_at: Date;
}

export interface MeResponseDto {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateMeInput {
  userId: number;
  changes: {
    username?: string;
    fullName?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
    dateOfBirth?: Date | null;
    gender?: Gender | null;
    bio?: string | null;
  };
}

export function mapUserToPublicDto(user: UserEntity): PublicUserResponseDto {
  return {
    id: user.id!,
    username: user.username,
    full_name: user.fullName,
    avatar_url: user.avatarUrl,
    gender: user.gender,
    bio: user.bio,
    created_at: user.createdAt,
  };
}

export function mapUserToMeDto(user: UserEntity): MeResponseDto {
  return {
    id: user.id!,
    username: user.username,
    email: user.email,
    role: user.role,
    is_active: user.isActive,
    is_email_verified: user.isEmailVerified,
    full_name: user.fullName,
    phone_number: user.phoneNumber,
    address: user.address,
    avatar_url: user.avatarUrl,
    date_of_birth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    gender: user.gender,
    bio: user.bio,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}


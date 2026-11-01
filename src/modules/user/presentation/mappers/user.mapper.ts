import type { UpdateMeInput } from '../../application/use-cases/update-me.use-case';
import type { User } from '../../domain/entities/user.entity';
import type { UpdateMeRequest } from '../dtos/update-me.request.dto';
import type { UserResponseDto } from '../dtos/user.response.dto';

export function toUpdateMeInput(userId: number, body: UpdateMeRequest): UpdateMeInput {
  return {
    userId,
    username: body.username ?? undefined,
    fullName: body.full_name,
    phoneNumber: body.phone_number,
    address: body.address,
    avatarUrl: body.avatar_url,
    dateOfBirth: body.date_of_birth,
    gender: body.gender,
    bio: body.bio,
  };
}

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
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

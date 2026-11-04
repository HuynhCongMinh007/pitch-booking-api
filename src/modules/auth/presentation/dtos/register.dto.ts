import { z } from 'zod';

import { USERNAME_REGEX } from '../../../user/domain/value-objects/username.vo';
import type { RegisterResult } from '../../application/use-cases/register.use-case';
import {
  normalizedEmailSchema,
  otpCodeSchema,
  passwordSchema,
} from '../utils/auth-schema.util';
import { AuthResponseDto, type TokenResponseDto } from './auth-response.dto';

export const registerRequestSchema = z.object({
  email: normalizedEmailSchema,
  otp: otpCodeSchema,
  username: z
    .string()
    .min(6, 'Username must be at least 6 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(USERNAME_REGEX, 'Username can only contain letters, digits, underscores, and dots'),
  password: passwordSchema,
});

export type RegisterRequestDto = z.output<typeof registerRequestSchema>;

export interface RegisterResponseDto {
  message: string;
  tokens: TokenResponseDto | null;
}

export function toRegisterResponseDto(result: RegisterResult): RegisterResponseDto {
  return {
    message: result.message,
    tokens: result.tokens ? AuthResponseDto.toTokenResponse(result.tokens) : null,
  };
}

import { z } from 'zod';

import { USERNAME_REGEX } from '../../../user/domain/value-objects/username.vo';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';

const normalizedEmailSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.string().email('Invalid email address').max(255),
);

const otpCodeSchema = z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

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

export const sendOtpRequestSchema = z.object({
  email: normalizedEmailSchema,
  purpose: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
      z.nativeEnum(OtpPurpose),
    )
    .default(OtpPurpose.REGISTER),
  resend: z.boolean().default(false),
});

export const loginRequestSchema = z.object({
  username: z.string().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
});

export const refreshTokenRequestSchema = z.preprocess(
  (v) => (v === undefined || v === null || v === '' ? {} : v),
  z.object({
    refresh_token: z.string().nullable().optional(),
  }),
);

export const googleExchangeRequestSchema = z.object({
  code: z.string().min(1, 'code is required'),
  state: z.string().min(1, 'state is required').max(256),
});

export const resetPasswordRequestSchema = z.object({
  email: normalizedEmailSchema,
  otp: otpCodeSchema,
  new_password: passwordSchema,
});

export type RegisterRequestDto = z.output<typeof registerRequestSchema>;
export type SendOtpRequestDto = z.output<typeof sendOtpRequestSchema>;
export type LoginRequestDto = z.output<typeof loginRequestSchema>;
export type RefreshTokenRequestDto = z.output<typeof refreshTokenRequestSchema>;
export type GoogleExchangeRequestDto = z.output<typeof googleExchangeRequestSchema>;
export type ResetPasswordRequestDto = z.output<typeof resetPasswordRequestSchema>;


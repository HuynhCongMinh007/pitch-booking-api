import { z } from 'zod';

export const normalizedEmailSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.string().email('Invalid email address').max(255),
);

export const otpCodeSchema = z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');


import { z } from 'zod';

import type { ResetPasswordInput } from '../../application/use-cases/reset-password.use-case';
import {
  normalizedEmailSchema,
  otpCodeSchema,
  passwordSchema,
} from '../utils/auth-schema.util';

export const resetPasswordRequestSchema = z
  .object({
    email: normalizedEmailSchema,
    otp: otpCodeSchema,
    new_password: passwordSchema,
  })
  .transform(
    (raw): ResetPasswordInput => ({
      email: raw.email,
      otp: raw.otp,
      newPassword: raw.new_password,
    }),
  );

export type ResetPasswordRequestDto = z.output<typeof resetPasswordRequestSchema>;


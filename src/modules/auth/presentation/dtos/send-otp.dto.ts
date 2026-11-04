import { z } from 'zod';

import type { SendOtpResult } from '../../application/use-cases/send-otp.use-case';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { normalizedEmailSchema } from '../utils/auth-schema.util';

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

export type SendOtpRequestDto = z.output<typeof sendOtpRequestSchema>;

export interface SendOtpResponseDto {
  message: string;
  email: string;
  is_already_sent: boolean;
  cooldown_seconds: number;
  expires_in_seconds: number;
}

export function toSendOtpResponseDto(result: SendOtpResult): SendOtpResponseDto {
  return {
    message: result.message,
    email: result.email,
    is_already_sent: result.isAlreadySent,
    cooldown_seconds: result.cooldownSeconds,
    expires_in_seconds: result.expiresInSeconds,
  };
}


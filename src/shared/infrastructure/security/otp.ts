import crypto from 'node:crypto';

import { settings } from '../config';

/** Generate a cryptographically secure random N-digit numeric OTP */
export function generateOtp(length = 6): string {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(10);
  }
  return otp;
}

/** Compute HMAC-SHA-256 hash of an OTP using secret key */
export function hashOtp(code: string): string {
  const secret = settings.OTP_SECRET_KEY || settings.SECRET_KEY;
  return crypto.createHmac('sha256', secret).update(code, 'utf8').digest('hex');
}

/** Constant-time string comparison (like Python's hmac.compare_digest) */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

/** Constant-time verification of an OTP against its HMAC-SHA-256 hash */
export function verifyOtpHash(plainCode: string, hashedCode: string): boolean {
  return safeCompare(hashOtp(plainCode), hashedCode);
}

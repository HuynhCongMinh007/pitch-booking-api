import type { EmailOtpEntity } from '../entities/email-otp.entity';
import type { OtpPurpose } from '../enums/otp-purpose.enum';

export const EMAIL_OTP_REPOSITORY = Symbol('EMAIL_OTP_REPOSITORY');

export interface IEmailOtpRepository {
  create(otp: EmailOtpEntity): Promise<EmailOtpEntity>;
  findLatestActive(userId: number, purpose: OtpPurpose): Promise<EmailOtpEntity | null>;
  findLatest(userId: number, purpose: OtpPurpose): Promise<EmailOtpEntity | null>;
  invalidateActiveOtps(userId: number, purpose: OtpPurpose, usedAt?: Date): Promise<void>;
  incrementAttempts(otpId: string, maxAttempts: number): Promise<number | null>;
  markAsUsed(otpId: string, maxAttempts: number, usedAt?: Date): Promise<boolean>;
}


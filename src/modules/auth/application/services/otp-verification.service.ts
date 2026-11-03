import { Inject, Injectable } from '@nestjs/common';

import { EmailOtpEntity } from '../../domain/entities/email-otp.entity';
import type { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { InvalidOtpException, OTP_LOCKED_MSG } from '../../domain/exceptions/auth.exception';
import { EMAIL_OTP_REPOSITORY, type IEmailOtpRepository, } from '../../domain/repositories/email-otp.repository.interface';
import { AUTH_SETTINGS, type IAuthSettings } from '../ports/auth-settings.interface';
import { type IOtpCryptoService, OTP_CRYPTO_SERVICE } from '../ports/otp-crypto-service.interface';

@Injectable()
export class OtpVerificationService {
  constructor(
    @Inject(EMAIL_OTP_REPOSITORY)
    private readonly otpRepository: IEmailOtpRepository,
    @Inject(OTP_CRYPTO_SERVICE)
    private readonly otpCrypto: IOtpCryptoService,
    @Inject(AUTH_SETTINGS)
    private readonly settings: IAuthSettings,
  ) { }

  async issueOtp(userId: number, purpose: OtpPurpose, now: Date): Promise<string> {
    await this.otpRepository.invalidateActiveOtps(userId, purpose, now);
    const otpCode = this.otpCrypto.generateCode(6);
    const expiresAt = new Date(now.getTime() + this.settings.otpExpireMinutes * 60_000);
    const otpEntity = EmailOtpEntity.create({
      userId,
      codeHash: this.otpCrypto.hashCode(otpCode),
      purpose,
      expiresAt,
    });
    await this.otpRepository.create(otpEntity);
    return otpCode;
  }

  /**
   * Validates OTP code outside the mutation transaction so failed attempt increments
   * are immediately persisted even when throwing InvalidOtpException.
   */
  async verifyOtpOrRecordFailure(
    userId: number,
    purpose: OtpPurpose,
    otpCode: string,
  ): Promise<string> {
    const otp = await this.otpRepository.findLatestActive(userId, purpose);
    const now = new Date();

    if (!otp || !otp.id || !otp.canBeVerified(now, this.settings.maxOtpAttempts)) {
      throw new InvalidOtpException(OTP_LOCKED_MSG);
    }

    if (!this.otpCrypto.verifyCode(otpCode, otp.codeHash)) {
      const attempts = await this.otpRepository.incrementAttempts(
        otp.id,
        this.settings.maxOtpAttempts,
      );
      const remaining =
        attempts === null ? 0 : Math.max(0, this.settings.maxOtpAttempts - attempts);
      if (remaining === 0) {
        throw new InvalidOtpException(
          'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.',
        );
      }
      throw new InvalidOtpException(`Invalid OTP. You have ${remaining} attempts remaining.`);
    }

    return otp.id;
  }

  /**
   * Atomically consumes a previously verified OTP inside the caller's UnitOfWork.
   */
  async markVerifiedOtpAsUsed(otpId: string): Promise<void> {
    const consumed = await this.otpRepository.markAsUsed(
      otpId,
      this.settings.maxOtpAttempts,
      new Date(),
    );
    if (!consumed) {
      throw new InvalidOtpException(OTP_LOCKED_MSG);
    }
  }
}


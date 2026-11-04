import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  type IUnitOfWork,
  UNIT_OF_WORK,
} from '../../../../shared/application/ports/unit-of-work.interface';
import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import { DuplicateEntityException } from '../../../../shared/domain/exceptions/duplicate-entity.exception';
import { UserEntity } from '../../../user/domain/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../user/domain/repositories/user.repository.interface';
import { Email } from '../../../user/domain/value-objects/email.vo';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import {
  ConcurrentAuthOperationException,
  EmailAlreadyRegisteredException,
  OTP_SENT_GENERIC_MSG,
  OtpCooldownException,
} from '../../domain/exceptions/auth.exception';
import {
  EMAIL_OTP_REPOSITORY,
  type IEmailOtpRepository,
} from '../../domain/repositories/email-otp.repository.interface';
import { AUTH_SETTINGS, type IAuthSettings } from '../ports/auth-settings.interface';
import { EMAIL_SERVICE, type IEmailService } from '../ports/email-service.interface';
import { type IPasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher.interface';
import { OtpVerificationService } from '../services/otp-verification.service';

export interface SendOtpInput {
  email: string;
  purpose: OtpPurpose;
  resend: boolean;
}

export interface SendOtpResult {
  message: string;
  email: string;
  isAlreadySent: boolean;
  cooldownSeconds: number;
  expiresInSeconds: number;
}

@Injectable()
export class SendOtpUseCase implements IUseCase<SendOtpInput, SendOtpResult> {
  private readonly logger = new Logger(SendOtpUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EMAIL_OTP_REPOSITORY)
    private readonly otpRepository: IEmailOtpRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    @Inject(AUTH_SETTINGS)
    private readonly settings: IAuthSettings,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly otpVerificationService: OtpVerificationService,
  ) {}

  async execute(input: SendOtpInput): Promise<SendOtpResult> {
    const emailVo = Email.create(input.email);
    const now = new Date();

    const user = await this.resolveOtpUser(emailVo, input.purpose);
    if (!user || user.id === undefined) {
      return {
        message: OTP_SENT_GENERIC_MSG,
        email: emailVo.value,
        isAlreadySent: false,
        cooldownSeconds: this.settings.otpResendCooldownSeconds,
        expiresInSeconds: this.settings.otpExpireMinutes * 60,
      };
    }

    const activeOtp = await this.otpRepository.findLatestActive(user.id, input.purpose);
    const latestOtp = await this.otpRepository.findLatest(user.id, input.purpose);

    const cooldownRemaining = latestOtp
      ? latestOtp.cooldownRemainingSeconds(this.settings.otpResendCooldownSeconds, now)
      : 0;

    if (
      !input.resend &&
      activeOtp &&
      activeOtp.canBeVerified(now, this.settings.maxOtpAttempts)
    ) {
      return {
        message:
          'Verification code has already been sent and is still valid. Please check your inbox.',
        email: user.email,
        isAlreadySent: true,
        cooldownSeconds: cooldownRemaining,
        expiresInSeconds: activeOtp.remainingSeconds(now),
      };
    }

    if (cooldownRemaining > 0) {
      throw new OtpCooldownException(cooldownRemaining);
    }

    let otpCode: string;
    try {
      otpCode = await this.unitOfWork.execute(() =>
        this.otpVerificationService.issueOtp(user.id!, input.purpose, now),
      );
    } catch (error) {
      if (error instanceof DuplicateEntityException) {
        throw new ConcurrentAuthOperationException(
          'A verification code request is already in progress. Please try again.',
        );
      }
      throw error;
    }

    await this.dispatchOtpEmail(user, input.purpose, otpCode);

    return {
      message: input.resend
        ? 'A new verification code has been sent to your email.'
        : 'Verification code has been sent to your email.',
      email: user.email,
      isAlreadySent: false,
      cooldownSeconds: this.settings.otpResendCooldownSeconds,
      expiresInSeconds: this.settings.otpExpireMinutes * 60,
    };
  }

  private async resolveOtpUser(email: Email, purpose: OtpPurpose): Promise<UserEntity | null> {
    const existing = await this.userRepository.findByEmail(email.value);

    if (purpose === OtpPurpose.REGISTER) {
      if (existing) {
        if (existing.isEmailVerified) {
          existing.ensureActive();
          throw new EmailAlreadyRegisteredException();
        }
        return existing;
      }

      try {
        const pendingUser = UserEntity.createPendingRegistration({
          email,
          passwordHash: await this.passwordHasher.hash(randomUUID().replace(/-/g, '')),
        });
        return await this.userRepository.save(pendingUser);
      } catch (error) {
        if (error instanceof DuplicateEntityException) {
          const racedUser = await this.userRepository.findByEmail(email.value);
          if (racedUser) {
            if (racedUser.isEmailVerified) {
              throw new EmailAlreadyRegisteredException();
            }
            return racedUser;
          }
          throw new ConcurrentAuthOperationException(
            'Account is being created concurrently. Please try again.',
          );
        }
        throw error;
      }
    }

    if (purpose === OtpPurpose.RESET_PASSWORD) {
      return existing && existing.isActive && existing.isEmailVerified ? existing : null;
    }

    return null;
  }

  private async dispatchOtpEmail(
    user: UserEntity,
    purpose: OtpPurpose,
    otpCode: string,
  ): Promise<void> {
    try {
      const payload = {
        toEmail: user.email,
        username: user.username,
        otp: otpCode,
      };
      if (purpose === OtpPurpose.REGISTER) {
        await this.emailService.sendRegistrationOtpEmail(payload);
      } else {
        await this.emailService.sendPasswordResetOtpEmail(payload);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send ${purpose} OTP email to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

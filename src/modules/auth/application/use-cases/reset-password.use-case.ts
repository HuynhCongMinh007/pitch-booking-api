import { Inject, Injectable } from '@nestjs/common';

import {
  type IUnitOfWork,
  UNIT_OF_WORK,
} from '../../../../shared/application/ports/unit-of-work.interface';
import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../user/domain/repositories/user.repository.interface';
import { Email } from '../../../user/domain/value-objects/email.vo';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import { INVALID_OTP_MSG, InvalidOtpException } from '../../domain/exceptions/auth.exception';
import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import type { MessageResponseDto, ResetPasswordInput } from '../dtos/auth.dto';
import { type IPasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher.interface';
import { OtpVerificationService } from '../services/otp-verification.service';

@Injectable()
export class ResetPasswordUseCase implements IUseCase<ResetPasswordInput, MessageResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly otpVerificationService: OtpVerificationService,
  ) {}

  async execute(input: ResetPasswordInput): Promise<MessageResponseDto> {
    const email = Email.create(input.email);
    const user = await this.userRepository.findByEmail(email.value);

    if (!user || user.id === undefined || !user.isActive || !user.isEmailVerified) {
      throw new InvalidOtpException(INVALID_OTP_MSG);
    }

    const verifiedOtpId = await this.otpVerificationService.verifyOtpOrRecordFailure(
      user.id,
      OtpPurpose.RESET_PASSWORD,
      input.otp,
    );

    const newPasswordHash = await this.passwordHasher.hash(input.newPassword);

    await this.unitOfWork.execute(async () => {
      await this.otpVerificationService.markVerifiedOtpAsUsed(verifiedOtpId);
      user.changePassword(newPasswordHash);
      await this.userRepository.save(user);
      await this.refreshTokenRepository.revokeAllByUserId(user.id!);
    });

    return {
      message: 'Password has been reset successfully',
    };
  }
}


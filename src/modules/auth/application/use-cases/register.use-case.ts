import { Inject, Injectable } from '@nestjs/common';

import {
  type IUnitOfWork,
  UNIT_OF_WORK,
} from '../../../../shared/application/ports/unit-of-work.interface';
import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import { DuplicateEntityException } from '../../../../shared/domain/exceptions/duplicate-entity.exception';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../user/domain/repositories/user.repository.interface';
import { Email } from '../../../user/domain/value-objects/email.vo';
import { Username } from '../../../user/domain/value-objects/username.vo';
import { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import {
  ConcurrentAuthOperationException,
  EmailAlreadyRegisteredException,
  INVALID_OTP_MSG,
  InvalidOtpException,
  UsernameAlreadyUsedException,
} from '../../domain/exceptions/auth.exception';
import { type IPasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher.interface';
import { OtpVerificationService } from '../services/otp-verification.service';
import { type IssuedTokenPair, TokenIssuerService } from '../services/token-issuer.service';

export interface RegisterInput {
  email: string;
  otp: string;
  username: string;
  password: string;
}

export interface RegisterResult {
  message: string;
  tokens: IssuedTokenPair | null;
}

@Injectable()
export class RegisterUseCase implements IUseCase<RegisterInput, RegisterResult> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly otpVerificationService: OtpVerificationService,
    private readonly tokenIssuerService: TokenIssuerService,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterResult> {
    const email = Email.create(input.email);
    const username = Username.create(input.username);

    const user = await this.userRepository.findByEmail(email.value);
    if (!user || user.id === undefined) {
      throw new InvalidOtpException(INVALID_OTP_MSG);
    }
    if (user.isEmailVerified) {
      throw new EmailAlreadyRegisteredException();
    }

    const existingUsername = await this.userRepository.findByUsername(username.value);
    if (existingUsername && existingUsername.id !== user.id) {
      throw new UsernameAlreadyUsedException();
    }

    const verifiedOtpId = await this.otpVerificationService.verifyOtpOrRecordFailure(
      user.id,
      OtpPurpose.REGISTER,
      input.otp,
    );

    const passwordHash = await this.passwordHasher.hash(input.password);

    try {
      const tokens = await this.unitOfWork.execute(async () => {
        await this.otpVerificationService.markVerifiedOtpAsUsed(verifiedOtpId);
        user.completeRegistration({ username, passwordHash });
        const savedUser = await this.userRepository.save(user);
        return this.tokenIssuerService.issueTokens(savedUser.id!);
      });

      return {
        message: 'Account created successfully',
        tokens,
      };
    } catch (error) {
      if (error instanceof DuplicateEntityException) {
        const conflictUser = await this.userRepository.findByUsername(username.value);
        if (conflictUser && conflictUser.id !== user.id) {
          throw new UsernameAlreadyUsedException();
        }
        throw new ConcurrentAuthOperationException(
          'Registration is being processed concurrently. Please try again.',
        );
      }
      throw error;
    }
  }
}

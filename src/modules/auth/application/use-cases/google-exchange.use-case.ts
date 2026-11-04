import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

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
  GoogleOAuthException,
} from '../../domain/exceptions/auth.exception';
import {
  EMAIL_OTP_REPOSITORY,
  type IEmailOtpRepository,
} from '../../domain/repositories/email-otp.repository.interface';
import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import { GOOGLE_OAUTH_CLIENT, type IGoogleOAuthClient } from '../ports/google-oauth.interface';
import { type IPasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher.interface';
import { type IssuedTokenPair, TokenIssuerService } from '../services/token-issuer.service';

export interface GoogleExchangeInput {
  code: string;
}

@Injectable()
export class GoogleExchangeUseCase implements IUseCase<GoogleExchangeInput, IssuedTokenPair> {
  constructor(
    @Inject(GOOGLE_OAUTH_CLIENT)
    private readonly googleOAuthClient: IGoogleOAuthClient,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EMAIL_OTP_REPOSITORY)
    private readonly otpRepository: IEmailOtpRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly tokenIssuerService: TokenIssuerService,
  ) {}

  async execute(input: GoogleExchangeInput): Promise<IssuedTokenPair> {
    const profile = await this.googleOAuthClient.exchangeCodeForProfile(input.code);

    const rawEmail = profile.email.trim().toLowerCase();
    if (!rawEmail) {
      throw new GoogleOAuthException('Google account must have an email', 400);
    }
    if (!profile.verifiedEmail) {
      throw new GoogleOAuthException('Google account email is not verified', 400);
    }

    const emailVo = Email.create(rawEmail);
    const existingUser = await this.userRepository.findByEmail(emailVo.value);

    if (existingUser && existingUser.isEmailVerified) {
      existingUser.ensureActive();
    }

    const randomPasswordHash = await this.passwordHasher.hash(randomUUID().replace(/-/g, ''));

    try {
      return await this.unitOfWork.execute(async () => {
        let targetUser = existingUser;

        if (!targetUser) {
          const newUser = UserEntity.createFromGoogle({
            email: emailVo,
            passwordHash: randomPasswordHash,
            fullName: profile.name,
            avatarUrl: profile.picture,
          });
          targetUser = await this.userRepository.save(newUser);
        } else if (!targetUser.isEmailVerified) {
          targetUser.activateViaGoogle({
            passwordHash: randomPasswordHash,
            fullName: profile.name,
            avatarUrl: profile.picture,
          });
          targetUser = await this.userRepository.save(targetUser);
          await this.otpRepository.invalidateActiveOtps(targetUser.id!, OtpPurpose.REGISTER);
          await this.refreshTokenRepository.revokeAllByUserId(targetUser.id!);
        }

        return this.tokenIssuerService.issueTokens(targetUser.id!);
      });
    } catch (error) {
      if (error instanceof DuplicateEntityException) {
        throw new ConcurrentAuthOperationException(
          'Account is being created concurrently. Please try again.',
        );
      }
      throw error;
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';

import {
  type ITokenService,
  TOKEN_SERVICE,
} from '../../../../shared/application/ports/token-service.interface';
import {
  type IUnitOfWork,
  UNIT_OF_WORK,
} from '../../../../shared/application/ports/unit-of-work.interface';
import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../user/domain/repositories/user.repository.interface';
import { InvalidRefreshTokenException } from '../../domain/exceptions/auth.exception';
import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import type { RefreshTokenInput, TokenResponseDto } from '../dtos/auth.dto';
import { TokenIssuerService } from '../services/token-issuer.service';

@Injectable()
export class RefreshTokenUseCase implements IUseCase<RefreshTokenInput, TokenResponseDto> {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly tokenIssuerService: TokenIssuerService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<TokenResponseDto> {
    this.tokenService.verifyRefreshToken(input.refreshToken);

    const tokenHash = this.tokenService.hashToken(input.refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    const now = new Date();

    if (!storedToken || !storedToken.isValid(now)) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.userRepository.findById(storedToken.userId);
    if (!user || user.id === undefined) {
      throw new InvalidRefreshTokenException();
    }
    user.ensureActive();

    return this.unitOfWork.execute(async () => {
      const revoked = await this.refreshTokenRepository.revokeByTokenHash(tokenHash, now);
      if (!revoked) {
        throw new InvalidRefreshTokenException();
      }
      return this.tokenIssuerService.issueTokens(user.id!);
    });
  }
}


import { Inject, Injectable } from '@nestjs/common';

import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import {
  AUTH_TOKEN_SERVICE,
  type IAuthTokenService,
} from '../ports/auth-token-service.interface';

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class TokenIssuerService {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: IAuthTokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async issueTokens(userId: number): Promise<IssuedTokenPair> {
    const access = this.tokenService.createAccessToken(userId);
    const refresh = this.tokenService.createRefreshToken(userId);

    const refreshEntity = RefreshTokenEntity.create({
      userId,
      tokenHash: this.tokenService.hashToken(refresh.token),
      expiresAt: refresh.expiresAt,
    });
    await this.refreshTokenRepository.create(refreshEntity);

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }
}

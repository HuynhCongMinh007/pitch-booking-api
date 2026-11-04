import { Inject, Injectable } from '@nestjs/common';

import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import type { TokenResponseDto } from '../dtos/auth.dto';
import {
  AUTH_TOKEN_SERVICE,
  type IAuthTokenService,
} from '../ports/auth-token-service.interface';

@Injectable()
export class TokenIssuerService {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: IAuthTokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async issueTokens(userId: number): Promise<TokenResponseDto> {
    const access = this.tokenService.createAccessToken(userId);
    const refresh = this.tokenService.createRefreshToken(userId);

    const refreshEntity = RefreshTokenEntity.create({
      userId,
      tokenHash: this.tokenService.hashToken(refresh.token),
      expiresAt: refresh.expiresAt,
    });
    await this.refreshTokenRepository.create(refreshEntity);

    return {
      access_token: access.token,
      refresh_token: refresh.token,
      access_token_expires_at: access.expiresAt,
      refresh_token_expires_at: refresh.expiresAt,
      token_type: 'bearer',
    };
  }
}

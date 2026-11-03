import { Inject, Injectable } from '@nestjs/common';

import { type ITokenService, TOKEN_SERVICE, } from '../../../../shared/application/ports/token-service.interface';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { type IRefreshTokenRepository, REFRESH_TOKEN_REPOSITORY, } from '../../domain/repositories/refresh-token.repository.interface';
import type { TokenResponseDto } from '../dtos/auth.dto';

@Injectable()
export class TokenIssuerService {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) { }

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


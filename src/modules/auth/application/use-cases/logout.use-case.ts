import { Inject, Injectable } from '@nestjs/common';

import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import { InvalidRefreshTokenException } from '../../domain/exceptions/auth.exception';
import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import {
  AUTH_TOKEN_SERVICE,
  type IAuthTokenService,
} from '../ports/auth-token-service.interface';

export interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase implements IUseCase<LogoutInput, void> {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: IAuthTokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenHash = this.tokenService.hashToken(input.refreshToken);
    const revoked = await this.refreshTokenRepository.revokeByTokenHash(tokenHash);
    if (!revoked) {
      throw new InvalidRefreshTokenException('Refresh token is invalid or already revoked', 400);
    }
  }
}

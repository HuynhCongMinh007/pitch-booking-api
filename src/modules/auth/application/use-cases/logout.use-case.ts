import { Inject, Injectable } from '@nestjs/common';

import {
  type ITokenService,
  TOKEN_SERVICE,
} from '../../../../shared/application/ports/token-service.interface';
import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import { InvalidRefreshTokenException } from '../../domain/exceptions/auth.exception';
import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';
import type { LogoutInput } from '../dtos/auth.dto';

@Injectable()
export class LogoutUseCase implements IUseCase<LogoutInput, void> {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
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


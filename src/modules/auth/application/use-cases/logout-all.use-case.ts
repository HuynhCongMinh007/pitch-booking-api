import { Inject, Injectable } from '@nestjs/common';

import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository.interface';

export interface LogoutAllInput {
  userId: number;
}

@Injectable()
export class LogoutAllUseCase implements IUseCase<LogoutAllInput, void> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(input: LogoutAllInput): Promise<void> {
    await this.refreshTokenRepository.revokeAllByUserId(input.userId);
  }
}

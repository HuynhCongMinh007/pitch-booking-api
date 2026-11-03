import type { RefreshTokenEntity } from '../entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface IRefreshTokenRepository {
  create(token: RefreshTokenEntity): Promise<RefreshTokenEntity>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  revokeByTokenHash(tokenHash: string, revokedAt?: Date): Promise<boolean>;
  revokeAllByUserId(userId: number, revokedAt?: Date): Promise<void>;
}


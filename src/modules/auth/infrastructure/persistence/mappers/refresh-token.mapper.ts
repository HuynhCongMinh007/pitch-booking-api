import type { Prisma, RefreshToken as PrismaRefreshToken } from '@prisma/client';

import { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity';

export class RefreshTokenMapper {
  static toDomain(raw: PrismaRefreshToken): RefreshTokenEntity {
    return RefreshTokenEntity.reconstitute(
      {
        userId: raw.user_id,
        tokenHash: raw.token_hash,
        revoked: raw.revoked,
        revokedAt: raw.revoked_at,
        expiresAt: raw.expires_at,
        createdAt: raw.created_at,
      },
      raw.id,
    );
  }

  static toCreateInput(entity: RefreshTokenEntity): Prisma.RefreshTokenUncheckedCreateInput {
    return {
      user_id: entity.userId,
      token_hash: entity.tokenHash,
      revoked: entity.revoked,
      revoked_at: entity.revokedAt,
      expires_at: entity.expiresAt,
    };
  }
}


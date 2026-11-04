import { Injectable } from '@nestjs/common';

import { DuplicateEntityException } from '../../../../shared/domain/exceptions/duplicate-entity.exception';
import { isUniqueConstraintError } from '../../../../shared/infrastructure/utils/prisma-error.util';
import { PrismaUnitOfWork } from '../../../../shared/infrastructure/adapters/prisma-unit-of-work.service';
import type { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import type { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaUnitOfWork) {}

  async create(token: RefreshTokenEntity): Promise<RefreshTokenEntity> {
    try {
      const created = await this.prisma.client.refreshToken.create({
        data: RefreshTokenMapper.toCreateInput(token),
      });
      return RefreshTokenMapper.toDomain(created);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DuplicateEntityException('Refresh token hash already exists', ['token_hash']);
      }
      throw error;
    }
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const row = await this.prisma.client.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });
    return row ? RefreshTokenMapper.toDomain(row) : null;
  }

  async revokeByTokenHash(tokenHash: string, revokedAt: Date = new Date()): Promise<boolean> {
    const result = await this.prisma.client.refreshToken.updateMany({
      where: {
        token_hash: tokenHash,
        revoked: false,
      },
      data: {
        revoked: true,
        revoked_at: revokedAt,
      },
    });
    return result.count === 1;
  }

  async revokeAllByUserId(userId: number, revokedAt: Date = new Date()): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: {
        user_id: userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revoked_at: revokedAt,
      },
    });
  }
}


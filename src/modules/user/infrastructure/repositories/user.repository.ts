import { Injectable } from '@nestjs/common';

import { DuplicateEntityException } from '../../../../shared/domain/exceptions/duplicate-entity.exception';
import { isUniqueConstraintError } from '../../../../shared/infrastructure/utils/prisma-error.util';
import { PrismaUnitOfWork } from '../../../../shared/infrastructure/adapters/prisma-unit-of-work.service';
import type { UserEntity } from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaUnitOfWork) {}

  private normalizeIdentifier(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  async findById(id: number): Promise<UserEntity | null> {
    const row = await this.prisma.client.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalized = this.normalizeIdentifier(email);
    if (!normalized) {
      return null;
    }
    const row = await this.prisma.client.user.findFirst({
      where: {
        email: {
          equals: normalized,
          mode: 'insensitive',
        },
      },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const normalized = this.normalizeIdentifier(username);
    if (!normalized) {
      return null;
    }
    const row = await this.prisma.client.user.findFirst({
      where: {
        username: {
          equals: normalized,
          mode: 'insensitive',
        },
      },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmailOrUsername(identifier: string): Promise<UserEntity | null> {
    const normalized = this.normalizeIdentifier(identifier);
    if (!normalized) {
      return null;
    }
    if (normalized.includes('@')) {
      return this.findByEmail(normalized);
    }
    return this.findByUsername(normalized);
  }

  async save(entity: UserEntity): Promise<UserEntity> {
    try {
      if (entity.id === undefined) {
        const created = await this.prisma.client.user.create({
          data: UserMapper.toCreateInput(entity),
        });
        return UserMapper.toDomain(created);
      }

      const updated = await this.prisma.client.user.update({
        where: { id: entity.id },
        data: UserMapper.toUpdateInput(entity),
      });
      return UserMapper.toDomain(updated);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const target = ((error as { meta?: { target?: string[] } }).meta?.target ?? []) as string[];
        throw new DuplicateEntityException('User with unique identifier already exists', target);
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    await this.prisma.client.user.delete({ where: { id } });
  }
}


import { Injectable } from '@nestjs/common';
import { Prisma, User as PrismaUser } from '@prisma/client';

import { PrismaService } from '../../../../shared/infrastructure/prisma.service';
import { getTx } from '../../../../shared/infrastructure/transaction-context';
import { User } from '../../domain/entities/user.entity';
import { EmailAlreadyRegisteredError, UsernameAlreadyTakenError } from '../../domain/errors/user.errors';
import { UserRepository } from '../../domain/repositories/user.repository';
import { toCreateData, toDomainUser, toUpdateData } from '../mappers/user.mapper';

function oneOrNone(rows: PrismaUser[]): PrismaUser | null {
  if (rows.length > 1) throw new Error('Multiple rows were found when one or none was required');
  return rows[0] ?? null;
}

function normalize(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private get db(): Prisma.TransactionClient {
    return getTx<Prisma.TransactionClient>() ?? this.prisma;
  }

  async findById(id: number): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? toDomainUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const value = normalize(email);
    if (!value) return null;
    const rows = await this.db.$queryRaw<PrismaUser[]>`SELECT * FROM users WHERE lower(email) = ${value}`;
    const row = oneOrNone(rows);
    return row ? toDomainUser(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const value = normalize(username);
    if (!value) return null;
    const rows = await this.db.$queryRaw<PrismaUser[]>`SELECT * FROM users WHERE lower(username) = ${value}`;
    const row = oneOrNone(rows);
    return row ? toDomainUser(row) : null;
  }

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    const value = normalize(identifier);
    if (!value) return null;
    return value.includes('@') ? this.findByEmail(value) : this.findByUsername(value);
  }

  async create(user: User): Promise<User> {
    try {
      const row = await this.db.user.create({ data: toCreateData(user) });
      return toDomainUser(row);
    } catch (error) {
      throw this.translate(error);
    }
  }

  async update(user: User): Promise<User> {
    if (user.id === null) {
      throw new Error('Cannot update a user that has not been saved yet');
    }
    try {
      const row = await this.db.user.update({ where: { id: user.id }, data: toUpdateData(user) });
      return toDomainUser(row);
    } catch (error) {
      throw this.translate(error);
    }
  }

  private translate(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('username')) return new UsernameAlreadyTakenError();
      if (target.includes('email')) return new EmailAlreadyRegisteredError();
    }
    return error;
  }
}

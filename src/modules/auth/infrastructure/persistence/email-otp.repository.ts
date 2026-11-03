import { Injectable } from '@nestjs/common';

import { DuplicateEntityException } from '../../../../shared/domain/exceptions/duplicate-entity.exception';
import { isUniqueConstraintError } from '../../../../shared/infrastructure/persistence/prisma-error.util';
import { PrismaUnitOfWork } from '../../../../shared/infrastructure/persistence/prisma-unit-of-work.service';
import type { EmailOtpEntity } from '../../domain/entities/email-otp.entity';
import type { OtpPurpose } from '../../domain/enums/otp-purpose.enum';
import type { IEmailOtpRepository } from '../../domain/repositories/email-otp.repository.interface';
import { EmailOtpMapper } from './mappers/email-otp.mapper';

@Injectable()
export class PrismaEmailOtpRepository implements IEmailOtpRepository {
  constructor(private readonly prisma: PrismaUnitOfWork) {}

  async create(otp: EmailOtpEntity): Promise<EmailOtpEntity> {
    try {
      const created = await this.prisma.client.emailOtp.create({
        data: EmailOtpMapper.toCreateInput(otp),
      });
      return EmailOtpMapper.toDomain(created);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DuplicateEntityException('Email OTP already exists');
      }
      throw error;
    }
  }

  async findLatestActive(userId: number, purpose: OtpPurpose): Promise<EmailOtpEntity | null> {
    const row = await this.prisma.client.emailOtp.findFirst({
      where: {
        user_id: userId,
        purpose,
        used_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    return row ? EmailOtpMapper.toDomain(row) : null;
  }

  async findLatest(userId: number, purpose: OtpPurpose): Promise<EmailOtpEntity | null> {
    const row = await this.prisma.client.emailOtp.findFirst({
      where: {
        user_id: userId,
        purpose,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    return row ? EmailOtpMapper.toDomain(row) : null;
  }

  async invalidateActiveOtps(
    userId: number,
    purpose: OtpPurpose,
    usedAt: Date = new Date(),
  ): Promise<void> {
    await this.prisma.client.emailOtp.updateMany({
      where: {
        user_id: userId,
        purpose,
        used_at: null,
      },
      data: {
        used_at: usedAt,
      },
    });
  }

  async incrementAttempts(otpId: string, maxAttempts: number): Promise<number | null> {
    const rows = await this.prisma.client.$queryRaw<Array<{ attempts: number }>>`
      UPDATE "email_otps"
      SET "attempts" = "attempts" + 1
      WHERE "id" = ${otpId}::uuid
        AND "attempts" < ${maxAttempts}
      RETURNING "attempts"
    `;
    return rows[0]?.attempts ?? null;
  }

  async markAsUsed(
    otpId: string,
    maxAttempts: number,
    usedAt: Date = new Date(),
  ): Promise<boolean> {
    const result = await this.prisma.client.emailOtp.updateMany({
      where: {
        id: otpId,
        used_at: null,
        expires_at: { gt: usedAt },
        attempts: { lt: maxAttempts },
      },
      data: {
        used_at: usedAt,
      },
    });
    return result.count === 1;
  }
}


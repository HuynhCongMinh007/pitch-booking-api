import type { EmailOtp as PrismaEmailOtp, OtpPurpose as PrismaOtpPurpose, Prisma, } from '@prisma/client';

import { EmailOtpEntity } from '../../domain/entities/email-otp.entity';
import type { OtpPurpose } from '../../domain/enums/otp-purpose.enum';

export class EmailOtpMapper {
  static toDomain(raw: PrismaEmailOtp): EmailOtpEntity {
    return EmailOtpEntity.reconstitute(
      {
        userId: raw.user_id,
        codeHash: raw.code_hash,
        purpose: raw.purpose as OtpPurpose,
        expiresAt: raw.expires_at,
        attempts: raw.attempts,
        usedAt: raw.used_at,
        createdAt: raw.created_at,
      },
      raw.id,
    );
  }

  static toCreateInput(entity: EmailOtpEntity): Prisma.EmailOtpUncheckedCreateInput {
    return {
      user_id: entity.userId,
      code_hash: entity.codeHash,
      purpose: entity.purpose as unknown as PrismaOtpPurpose,
      expires_at: entity.expiresAt,
      attempts: entity.attempts,
      used_at: entity.usedAt,
    };
  }
}


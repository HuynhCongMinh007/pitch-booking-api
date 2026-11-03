import { BaseEntity } from '../../../../shared/domain/entities/base.entity';
import type { OtpPurpose } from '../enums/otp-purpose.enum';

export interface EmailOtpProps {
  userId: number;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  attempts: number;
  usedAt: Date | null;
  createdAt: Date;
}

export class EmailOtpEntity extends BaseEntity<EmailOtpProps, string> {
  private constructor(props: EmailOtpProps, id?: string) {
    super(props, id);
  }

  static create(params: {
    userId: number;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }): EmailOtpEntity {
    return new EmailOtpEntity({
      userId: params.userId,
      codeHash: params.codeHash,
      purpose: params.purpose,
      expiresAt: params.expiresAt,
      attempts: 0,
      usedAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: EmailOtpProps, id: string): EmailOtpEntity {
    return new EmailOtpEntity({ ...props }, id);
  }

  get userId(): number {
    return this.props.userId;
  }

  get codeHash(): string {
    return this.props.codeHash;
  }

  get purpose(): OtpPurpose {
    return this.props.purpose;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isUsed(): boolean {
    return this.props.usedAt !== null;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt <= now;
  }

  isLocked(maxAttempts: number): boolean {
    return this.props.attempts >= maxAttempts;
  }

  canBeVerified(now: Date, maxAttempts: number): boolean {
    return !this.isUsed() && !this.isExpired(now) && !this.isLocked(maxAttempts);
  }

  remainingSeconds(now: Date = new Date()): number {
    return Math.max(0, Math.floor((this.props.expiresAt.getTime() - now.getTime()) / 1000));
  }

  cooldownRemainingSeconds(cooldownSeconds: number, now: Date = new Date()): number {
    const elapsedSeconds = (now.getTime() - this.props.createdAt.getTime()) / 1000;
    const remaining = cooldownSeconds - elapsedSeconds;
    return remaining > 0 ? Math.trunc(remaining) : 0;
  }
}


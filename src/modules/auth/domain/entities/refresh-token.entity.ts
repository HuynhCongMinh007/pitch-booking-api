import { BaseEntity } from '../../../../shared/domain/entities/base.entity';

export interface RefreshTokenProps {
  userId: number;
  tokenHash: string;
  revoked: boolean;
  revokedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export class RefreshTokenEntity extends BaseEntity<RefreshTokenProps, number> {
  private constructor(props: RefreshTokenProps, id?: number) {
    super(props, id);
  }

  static create(params: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): RefreshTokenEntity {
    return new RefreshTokenEntity({
      userId: params.userId,
      tokenHash: params.tokenHash,
      revoked: false,
      revokedAt: null,
      expiresAt: params.expiresAt,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: RefreshTokenProps, id: number): RefreshTokenEntity {
    return new RefreshTokenEntity({ ...props }, id);
  }

  get userId(): number {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get revoked(): boolean {
    return this.props.revoked;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt < now;
  }

  isValid(now: Date = new Date()): boolean {
    return !this.props.revoked && !this.isExpired(now);
  }

  revoke(now: Date = new Date()): void {
    this.props.revoked = true;
    this.props.revokedAt = now;
  }
}


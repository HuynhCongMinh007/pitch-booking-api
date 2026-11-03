import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

import type {
  GeneratedToken,
  ITokenService,
  TokenPayload,
  TokenType,
} from '../../application/ports/token-service.interface';
import { DomainException } from '../../domain/exceptions/domain.exception';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(private readonly config: AppConfigService) {}

  createAccessToken(userId: number): GeneratedToken {
    return this.createToken(userId, 'access');
  }

  createRefreshToken(userId: number): GeneratedToken {
    return this.createToken(userId, 'refresh');
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.decodeToken(token, 'access');
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.decodeToken(token, 'refresh');
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  private createToken(userId: number, tokenType: TokenType): GeneratedToken {
    const nowMs = Date.now();
    const durationMs =
      tokenType === 'access'
        ? this.config.accessTokenExpireMinutes * 60 * 1000
        : this.config.refreshTokenExpireDays * 24 * 60 * 60 * 1000;

    const expiresAtMs = nowMs + durationMs;
    const iat = Math.floor(nowMs / 1000);
    const exp = Math.floor(expiresAtMs / 1000);

    const payload: TokenPayload = {
      sub: String(userId),
      type: tokenType,
      jti: randomUUID(),
      iat,
      exp,
    };

    const token = jwt.sign(payload, this.config.secretKey, {
      algorithm: this.config.jwtAlgorithm,
    });

    return {
      token,
      expiresAt: new Date(exp * 1000),
    };
  }

  private decodeToken(token: string, expectedType: TokenType): TokenPayload {
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, this.config.secretKey, {
        algorithms: [this.config.jwtAlgorithm],
      });
    } catch {
      throw new DomainException('Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    if (typeof decoded !== 'object' || decoded === null) {
      throw new DomainException('Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    if (decoded.type !== expectedType) {
      throw new DomainException(`Expected ${expectedType} token`, 'UNAUTHORIZED', 401);
    }

    if (typeof decoded.sub !== 'string' || !decoded.sub) {
      throw new DomainException('Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    return decoded as unknown as TokenPayload;
  }
}


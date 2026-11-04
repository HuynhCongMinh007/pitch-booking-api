import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

import type {
  TokenPayload,
  TokenType,
} from '../../../../shared/application/ports/token-verifier.interface';
import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { AppConfigService } from '../../../../shared/infrastructure/config/app-config.service';
import type {
  GeneratedToken,
  IAuthTokenService,
} from '../../application/ports/auth-token-service.interface';

@Injectable()
export class JwtAuthTokenService implements IAuthTokenService {
  constructor(private readonly config: AppConfigService) {}

  createAccessToken(userId: number): GeneratedToken {
    return this.createToken(userId, 'access');
  }

  createRefreshToken(userId: number): GeneratedToken {
    return this.createToken(userId, 'refresh');
  }

  verifyRefreshToken(token: string): TokenPayload {
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

    if (decoded.type !== 'refresh') {
      throw new DomainException('Expected refresh token', 'UNAUTHORIZED', 401);
    }

    if (typeof decoded.sub !== 'string' || !decoded.sub) {
      throw new DomainException('Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    return decoded as unknown as TokenPayload;
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
}


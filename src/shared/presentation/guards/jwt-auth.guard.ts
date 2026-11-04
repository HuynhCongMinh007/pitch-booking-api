import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import {
  type ITokenVerifier,
  TOKEN_VERIFIER,
} from '../../application/ports/token-verifier.interface';
import { DomainException } from '../../domain/exceptions/domain.exception';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VERIFIER)
    private readonly tokenVerifier: ITokenVerifier,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new DomainException('Not authenticated', 'UNAUTHORIZED', 401);
    }

    const payload = this.tokenVerifier.verifyAccessToken(token);
    const userId = Number.parseInt(payload.sub, 10);

    request.user = {
      userId,
      sub: payload.sub,
      jti: payload.jti,
      payload,
    };

    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
      const [scheme, value] = authHeader.trim().split(/\s+/, 2);
      if (scheme?.toLowerCase() === 'bearer' && value) {
        return value;
      }
    }

    const cookieToken = request.cookies?.access_token;
    if (typeof cookieToken === 'string' && cookieToken.trim().length > 0) {
      return cookieToken.trim();
    }

    return null;
  }
}

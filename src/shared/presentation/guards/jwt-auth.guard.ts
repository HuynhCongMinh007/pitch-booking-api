import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import {
  type ITokenService,
  TOKEN_SERVICE,
} from '../../application/ports/token-service.interface';
import { DomainException } from '../../domain/exceptions/domain.exception';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new DomainException('Not authenticated', 'UNAUTHORIZED', 401);
    }

    const payload = this.tokenService.verifyAccessToken(token);
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


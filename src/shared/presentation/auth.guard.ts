import { CanActivate, createParamDecorator, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from 'jsonwebtoken';

import { bearerUnauthorized, decodeToken, getBearerToken } from '../infrastructure/security';

/** Request after AccessTokenGuard ran. */
export type AuthenticatedRequest = Request & { tokenPayload: JwtPayload };

/**
 * Requires a valid access token from the Authorization header or the access_token cookie.
 * The decoded payload is stored on `req.tokenPayload`.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getBearerToken(req) || req.cookies?.access_token as string | undefined;
    if (!token) {
      throw bearerUnauthorized('Not authenticated');
    }
    req.tokenPayload = decodeToken(token, 'access');
    return true;
  }
}

/** Decoded access token payload (use together with AccessTokenGuard). */
export const TokenPayload = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().tokenPayload,
);

/** Current user id as a number (use together with AccessTokenGuard). */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  Number(ctx.switchToHttp().getRequest<AuthenticatedRequest>().tokenPayload.sub),
);

/** User id from an optional Bearer header; null when missing or invalid. */
export const OptionalUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const token = getBearerToken(ctx.switchToHttp().getRequest<Request>());
  if (!token) return null;
  try {
    return Number(decodeToken(token, 'access').sub);
  } catch {
    return null;
  }
});

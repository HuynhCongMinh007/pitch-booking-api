import crypto from 'node:crypto';

import { HttpException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { settings } from '../config';
export type TokenType = 'access' | 'refresh';

export interface CreatedToken {
  token: string;
  expiresAt: Date;
}

const ALGORITHM = settings.ALGORITHM as jwt.Algorithm;

/** An HttpException that carries extra response headers (see HttpExceptionFilter). */
export interface BearerHttpException extends HttpException {
  headers?: Record<string, string>;
}

// 401 error carrying the "WWW-Authenticate: Bearer" header (see HttpExceptionFilter)
export function bearerUnauthorized(detail: string): UnauthorizedException {
  const error: BearerHttpException = new UnauthorizedException(detail);
  error.headers = { 'WWW-Authenticate': 'Bearer' };
  return error;
}

function lifetimeMs(tokenType: TokenType): number {
  switch (tokenType) {
    case 'access':
      return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 1000;
    case 'refresh':
      return settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid token_type: ${tokenType}`);
  }
}

export function createToken(userId: number, tokenType: TokenType): CreatedToken {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + lifetimeMs(tokenType));

  const payload = {
    sub: String(userId),
    type: tokenType,
    jti: crypto.randomUUID(),
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const token = jwt.sign(payload, settings.SECRET_KEY, { algorithm: ALGORITHM });
  return { token, expiresAt };
}

export function decodeToken(token: string, tokenType: TokenType = 'access'): JwtPayload {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, settings.SECRET_KEY, { algorithms: [ALGORITHM] }) as JwtPayload;
  } catch {
    throw bearerUnauthorized('Invalid or expired token');
  }

  if (payload.type !== tokenType) {
    throw bearerUnauthorized(`Expected ${tokenType} token`);
  }
  return payload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return decodeToken(token, 'refresh');
}

// Reads "Authorization: Bearer <token>" (same rules as FastAPI's OAuth2PasswordBearer)
export function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const spaceIndex = header.indexOf(' ');
  const scheme = spaceIndex === -1 ? header : header.slice(0, spaceIndex);
  const param = spaceIndex === -1 ? '' : header.slice(spaceIndex + 1);
  if (scheme.toLowerCase() !== 'bearer') return null;
  return param;
}

/**
 * SHA-256 hex digest of a token (e.g. a refresh token) for storage at rest.
 * Tokens are high-entropy JWTs, so an unsalted hash is sufficient and still allows lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

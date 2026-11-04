import type { TokenPayload } from '../../../../shared/application/ports/token-verifier.interface';

export const AUTH_TOKEN_SERVICE = Symbol('AUTH_TOKEN_SERVICE');

export interface GeneratedToken {
  token: string;
  expiresAt: Date;
}

export interface IAuthTokenService {
  createAccessToken(userId: number): GeneratedToken;
  createRefreshToken(userId: number): GeneratedToken;
  verifyRefreshToken(token: string): TokenPayload;
  hashToken(rawToken: string): string;
}


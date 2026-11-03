export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  sub: string;
  type: TokenType;
  jti: string;
  iat: number;
  exp: number;
}

export interface GeneratedToken {
  token: string;
  expiresAt: Date;
}

export interface ITokenService {
  createAccessToken(userId: number): GeneratedToken;
  createRefreshToken(userId: number): GeneratedToken;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
  hashToken(rawToken: string): string;
}


export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');

export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  sub: string;
  type: TokenType;
  jti: string;
  iat: number;
  exp: number;
}

export interface ITokenVerifier {
  verifyAccessToken(token: string): TokenPayload;
}


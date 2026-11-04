import type { IssuedTokenPair } from '../../application/services/token-issuer.service';

export interface TokenResponseDto {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: Date;
  refresh_token_expires_at: Date;
  token_type: 'bearer';
}

export interface MessageResponseDto {
  message: string;
}

export class AuthResponseDto {
  static toTokenResponse(tokens: IssuedTokenPair): TokenResponseDto {
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      access_token_expires_at: tokens.accessTokenExpiresAt,
      refresh_token_expires_at: tokens.refreshTokenExpiresAt,
      token_type: 'bearer',
    };
  }
}


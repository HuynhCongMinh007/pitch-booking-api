import type { OtpPurpose } from '../../domain/enums/otp-purpose.enum';

export interface TokenResponseDto {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: Date;
  refresh_token_expires_at: Date;
  token_type: 'bearer';
}

export interface RegisterResponseDto {
  message: string;
  tokens: TokenResponseDto | null;
}

export interface MessageResponseDto {
  message: string;
}

export interface SendOtpResponseDto {
  message: string;
  email: string;
  is_already_sent: boolean;
  cooldown_seconds: number;
  expires_in_seconds: number;
}

export interface SendOtpInput {
  email: string;
  purpose: OtpPurpose;
  resend: boolean;
}

export interface RegisterInput {
  email: string;
  otp: string;
  username: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string;
}

export interface LogoutAllInput {
  userId: number;
}

export interface GoogleExchangeInput {
  code: string;
}

export interface ResetPasswordInput {
  email: string;
  otp: string;
  newPassword: string;
}

export interface GoogleLoginRedirectDto {
  authorizationUrl: string;
  state: string;
}


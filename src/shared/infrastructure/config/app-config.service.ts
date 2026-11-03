import { Injectable } from '@nestjs/common';
import type { Algorithm } from 'jsonwebtoken';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseInteger(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function parseOptionalString(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class AppConfigService {
  constructor() {
    void this.secretKey;
  }

  get backendUrl(): string {
    return parseOptionalString(process.env.BACKEND_URL) ?? 'http://localhost:8000';
  }

  get frontendUrl(): string {
    return parseOptionalString(process.env.FRONTEND_URL) ?? 'http://localhost:3000';
  }

  get isHttpsBackend(): boolean {
    return this.backendUrl.startsWith('https://');
  }

  get secretKey(): string {
    const key = parseOptionalString(process.env.SECRET_KEY);
    if (!key) {
      throw new Error('SECRET_KEY must be set to a non-empty value');
    }
    return key;
  }

  get jwtAlgorithm(): Algorithm {
    return (parseOptionalString(process.env.ALGORITHM) ?? 'HS256') as Algorithm;
  }

  get accessTokenExpireMinutes(): number {
    return parseInteger(process.env.ACCESS_TOKEN_EXPIRE_MINUTES, 15);
  }

  get refreshTokenExpireDays(): number {
    return parseInteger(process.env.REFRESH_TOKEN_EXPIRE_DAYS, 7);
  }

  get otpSecretKey(): string {
    return parseOptionalString(process.env.OTP_SECRET_KEY) ?? this.secretKey;
  }

  get otpExpireMinutes(): number {
    return parseInteger(process.env.OTP_EXPIRE_MINUTES, 5);
  }

  get maxOtpAttempts(): number {
    return parseInteger(process.env.MAX_OTP_ATTEMPTS, 5);
  }

  get otpResendCooldownSeconds(): number {
    return parseInteger(process.env.OTP_RESEND_COOLDOWN_SECONDS, 60);
  }

  get rateLimitEnabled(): boolean {
    return parseBoolean(process.env.RATE_LIMIT_ENABLED, true);
  }

  get rateLimitLogin(): string {
    return parseOptionalString(process.env.RATE_LIMIT_LOGIN) ?? '5/minute;20/hour';
  }

  get rateLimitRegister(): string {
    return parseOptionalString(process.env.RATE_LIMIT_REGISTER) ?? '5/minute';
  }

  get rateLimitVerifyOtp(): string {
    return parseOptionalString(process.env.RATE_LIMIT_VERIFY_OTP) ?? '10/minute';
  }

  get rateLimitSendOtp(): string {
    return parseOptionalString(process.env.RATE_LIMIT_SEND_OTP) ?? '3/minute;10/hour';
  }

  get rateLimitRefresh(): string {
    return parseOptionalString(process.env.RATE_LIMIT_REFRESH) ?? '30/minute';
  }

  get oauthStateCookieName(): string {
    return parseOptionalString(process.env.OAUTH_STATE_COOKIE_NAME) ?? 'google_oauth_state';
  }

  get oauthStateMaxAgeSeconds(): number {
    return parseInteger(process.env.OAUTH_STATE_MAX_AGE_SECONDS, 600);
  }

  get googleClientId(): string | null {
    return parseOptionalString(process.env.GOOGLE_CLIENT_ID);
  }

  get googleClientSecret(): string | null {
    return parseOptionalString(process.env.GOOGLE_CLIENT_SECRET);
  }

  get googleRedirectUri(): string | null {
    return parseOptionalString(process.env.GOOGLE_REDIRECT_URI);
  }

  get smtpHost(): string {
    return parseOptionalString(process.env.SMTP_HOST) ?? 'smtp.gmail.com';
  }

  get smtpPort(): number {
    return parseInteger(process.env.SMTP_PORT, 587);
  }

  get smtpUser(): string | null {
    return parseOptionalString(process.env.SMTP_USER);
  }

  get smtpPassword(): string | null {
    return parseOptionalString(process.env.SMTP_PASSWORD);
  }

  get smtpTls(): boolean {
    return parseBoolean(process.env.SMTP_TLS, true);
  }

  get smtpSsl(): boolean {
    return parseBoolean(process.env.SMTP_SSL, false);
  }

  get emailsFromEmail(): string | null {
    return parseOptionalString(process.env.EMAILS_FROM_EMAIL);
  }

  get emailsFromName(): string {
    return parseOptionalString(process.env.EMAILS_FROM_NAME) ?? 'PitchBooking';
  }
}


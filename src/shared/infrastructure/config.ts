import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const env = process.env;

function str(name: string): string | null;
function str(name: string, defaultValue: string): string;
function str(name: string, defaultValue: string | null = null): string | null {
  const value = env[name];
  return value === undefined || value === '' ? defaultValue : value;
}

function int(name: string, defaultValue: number): number {
  const value = str(name);
  if (value === null) return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
}

function bool(name: string, defaultValue: boolean): boolean {
  const value = str(name);
  if (value === null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'f', 'no', 'n', 'off'].includes(normalized)) return false;
  throw new Error(`${name} must be a boolean`);
}

// Prisma only understands the plain postgresql:// scheme
function requireStr(name: string): string {
  const value = str(name);
  if (value === null || !value.trim()) {
    throw new Error(`${name} must be set to a non-empty value`);
  }
  return value;
}

function normalizeDatabaseUrl(url: string): string {
  if (url.startsWith('postgres://')) return url.replace('postgres://', 'postgresql://');
  if (url.startsWith('postgresql+asyncpg://')) return url.replace('postgresql+asyncpg://', 'postgresql://');
  return url;
}

export const settings = {
  // App
  PORT: int('PORT', 8000),
  BACKEND_URL: str('BACKEND_URL', 'http://localhost:8000'),
  FRONTEND_URL: str('FRONTEND_URL', 'http://localhost:3000'),

  // Security
  SECRET_KEY: requireStr('SECRET_KEY'), // required: set in .env / environment (no default)
  ALGORITHM: str('ALGORITHM', 'HS256'),
  ACCESS_TOKEN_EXPIRE_MINUTES: int('ACCESS_TOKEN_EXPIRE_MINUTES', 15),
  REFRESH_TOKEN_EXPIRE_DAYS: int('REFRESH_TOKEN_EXPIRE_DAYS', 7),

  // OTP Configuration
  OTP_SECRET_KEY: str('OTP_SECRET_KEY'),
  OTP_EXPIRE_MINUTES: int('OTP_EXPIRE_MINUTES', 5),
  MAX_OTP_ATTEMPTS: int('MAX_OTP_ATTEMPTS', 5),
  OTP_RESEND_COOLDOWN_SECONDS: int('OTP_RESEND_COOLDOWN_SECONDS', 60),

  // Rate limiting (per client IP)
  RATE_LIMIT_ENABLED: bool('RATE_LIMIT_ENABLED', true),
  RATE_LIMIT_LOGIN: str('RATE_LIMIT_LOGIN', '5/minute;20/hour'),
  RATE_LIMIT_REGISTER: str('RATE_LIMIT_REGISTER', '5/minute'),
  RATE_LIMIT_VERIFY_OTP: str('RATE_LIMIT_VERIFY_OTP', '10/minute'),
  RATE_LIMIT_SEND_OTP: str('RATE_LIMIT_SEND_OTP', '3/minute;10/hour'),
  RATE_LIMIT_REFRESH: str('RATE_LIMIT_REFRESH', '30/minute'),

  // Google OAuth state cookie (CSRF protection)
  OAUTH_STATE_COOKIE_NAME: str('OAUTH_STATE_COOKIE_NAME', 'google_oauth_state'),
  OAUTH_STATE_MAX_AGE_SECONDS: int('OAUTH_STATE_MAX_AGE_SECONDS', 600),

  // Database
  DATABASE_URL: normalizeDatabaseUrl(
    str('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/pitchbooking'),
  ),

  // SMTP / Email Configuration (Gmail)
  SMTP_HOST: str('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: int('SMTP_PORT', 587),
  SMTP_USER: str('SMTP_USER'),
  SMTP_PASSWORD: str('SMTP_PASSWORD'),
  SMTP_TLS: bool('SMTP_TLS', true),
  SMTP_SSL: bool('SMTP_SSL', false),
  EMAILS_FROM_EMAIL: str('EMAILS_FROM_EMAIL'),
  EMAILS_FROM_NAME: str('EMAILS_FROM_NAME', 'PitchBooking'),

  // OAuth (Google OAuth2)
  GOOGLE_CLIENT_ID: str('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: str('GOOGLE_CLIENT_SECRET'),
  GOOGLE_REDIRECT_URI: str('GOOGLE_REDIRECT_URI'),
};

export type Settings = typeof settings;

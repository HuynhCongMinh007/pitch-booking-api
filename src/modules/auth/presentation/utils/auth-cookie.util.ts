import type { CookieOptions, Response } from 'express';

import type { AppConfigService } from '../../../../shared/infrastructure/config/app-config.service';

export const OAUTH_GOOGLE_COOKIE_PATH = '/api/v1/auth/google';

export function buildCookieOptions(config: AppConfigService, path = '/'): CookieOptions {
  const secure = config.isHttpsBackend;
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path,
  };
}

export function setAuthCookies(
  response: Response,
  config: AppConfigService,
  accessToken: string,
  refreshToken: string,
): void {
  const baseOptions = buildCookieOptions(config, '/');
  response.cookie('access_token', accessToken, {
    ...baseOptions,
    maxAge: config.accessTokenExpireMinutes * 60 * 1000,
  });
  response.cookie('refresh_token', refreshToken, {
    ...baseOptions,
    maxAge: config.refreshTokenExpireDays * 24 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response, config: AppConfigService): void {
  const baseOptions = buildCookieOptions(config, '/');
  response.clearCookie('access_token', baseOptions);
  response.clearCookie('refresh_token', baseOptions);
}


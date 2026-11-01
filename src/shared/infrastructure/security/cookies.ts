import type { CookieOptions, Response } from 'express';

import { settings } from '../config';

export function cookieOptions(path = '/'): CookieOptions {
  const secure = settings.BACKEND_URL.startsWith('https://');
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path,
  };
}

/** Set HttpOnly cookies for access_token and refresh_token. */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('access_token', accessToken, {
    ...cookieOptions('/'),
    maxAge: settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions('/'),
    maxAge: settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400 * 1000,
  });
}

/** Clear HttpOnly authentication cookies. */
export function deleteAuthCookies(res: Response): void {
  res.clearCookie('access_token', cookieOptions('/'));
  res.clearCookie('refresh_token', cookieOptions('/'));
}

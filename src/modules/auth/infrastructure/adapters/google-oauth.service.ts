import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../../shared/infrastructure/services/app-config.service';
import type {
  GoogleUserProfile,
  IGoogleOAuthClient,
} from '../../application/ports/google-oauth.interface';
import { GoogleOAuthException } from '../../domain/exceptions/auth.exception';

@Injectable()
export class GoogleOAuthClient implements IGoogleOAuthClient {
  constructor(private readonly config: AppConfigService) {}

  buildAuthorizationUrl(state: string): string {
    if (!this.config.googleClientId || !this.config.googleRedirectUri) {
      throw new GoogleOAuthException('Google OAuth is not configured', 503);
    }

    const params = new URLSearchParams({
      client_id: this.config.googleClientId,
      redirect_uri: this.config.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string): Promise<GoogleUserProfile> {
    if (!this.config.googleClientId || !this.config.googleClientSecret) {
      throw new GoogleOAuthException('Google OAuth is not configured', 500);
    }

    const body = new URLSearchParams({
      code,
      client_id: this.config.googleClientId,
      client_secret: this.config.googleClientSecret,
      redirect_uri: this.config.googleRedirectUri ?? '',
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenResponse.ok) {
      throw new GoogleOAuthException('Failed to exchange authorization code with Google', 400);
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new GoogleOAuthException('Google OAuth did not return an access token', 400);
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!userInfoResponse.ok) {
      throw new GoogleOAuthException('Failed to fetch user profile from Google', 400);
    }

    const userInfo = (await userInfoResponse.json()) as {
      email?: string;
      verified_email?: boolean;
      name?: string;
      picture?: string;
    };

    return {
      email: (userInfo.email ?? '').trim().toLowerCase(),
      verifiedEmail: userInfo.verified_email === true,
      name: userInfo.name ?? null,
      picture: userInfo.picture ?? null,
    };
  }
}


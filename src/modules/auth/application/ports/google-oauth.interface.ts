export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');

export interface GoogleUserProfile {
  email: string;
  verifiedEmail: boolean;
  name: string | null;
  picture: string | null;
}

export interface IGoogleOAuthClient {
  buildAuthorizationUrl(state: string): string;
  exchangeCodeForProfile(code: string): Promise<GoogleUserProfile>;
}


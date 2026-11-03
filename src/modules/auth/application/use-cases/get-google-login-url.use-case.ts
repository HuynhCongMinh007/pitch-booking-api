import { randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import type { GoogleLoginRedirectDto } from '../dtos/auth.dto';
import { GOOGLE_OAUTH_CLIENT, type IGoogleOAuthClient } from '../ports/google-oauth.interface';

@Injectable()
export class GetGoogleLoginUrlUseCase implements IUseCase<void, GoogleLoginRedirectDto> {
  constructor(
    @Inject(GOOGLE_OAUTH_CLIENT)
    private readonly googleOAuthClient: IGoogleOAuthClient,
  ) {}

  async execute(): Promise<GoogleLoginRedirectDto> {
    const state = randomBytes(32).toString('base64url');
    const authorizationUrl = this.googleOAuthClient.buildAuthorizationUrl(state);
    return {
      authorizationUrl,
      state,
    };
  }
}


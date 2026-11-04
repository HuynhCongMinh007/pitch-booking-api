import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import {
  EMAIL_SERVICE,
  type IEmailService,
} from '../../src/modules/auth/application/ports/email-service.interface';
import {
  GOOGLE_OAUTH_CLIENT,
  type IGoogleOAuthClient,
} from '../../src/modules/auth/application/ports/google-oauth.interface';
import {
  type IOtpCryptoService,
  OTP_CRYPTO_SERVICE,
} from '../../src/modules/auth/application/ports/otp-crypto-service.interface';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RateLimitService } from '../../src/shared/infrastructure/security/rate-limit.service';

export const FIXED_TEST_OTP = '246810';

export interface E2ETestContext {
  app: INestApplication;
  emailService: IEmailService;
  otpCrypto: IOtpCryptoService;
  googleOAuthClient: IGoogleOAuthClient;
  rateLimitService: RateLimitService;
  sendRegistrationOtpSpy: jest.SpyInstance;
  sendPasswordResetOtpSpy: jest.SpyInstance;
}

export async function createE2ETestApp(): Promise<E2ETestContext> {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.init();

  const authModuleRef = app.select(AuthModule);
  const emailService = authModuleRef.get<IEmailService>(EMAIL_SERVICE);
  const otpCrypto = authModuleRef.get<IOtpCryptoService>(OTP_CRYPTO_SERVICE);
  const googleOAuthClient = authModuleRef.get<IGoogleOAuthClient>(GOOGLE_OAUTH_CLIENT);
  const rateLimitService = app.get(RateLimitService);

  jest.spyOn(otpCrypto, 'generateCode').mockReturnValue(FIXED_TEST_OTP);
  const sendRegistrationOtpSpy = jest
    .spyOn(emailService, 'sendRegistrationOtpEmail')
    .mockResolvedValue(true);
  const sendPasswordResetOtpSpy = jest
    .spyOn(emailService, 'sendPasswordResetOtpEmail')
    .mockResolvedValue(true);

  return {
    app,
    emailService,
    otpCrypto,
    googleOAuthClient,
    rateLimitService,
    sendRegistrationOtpSpy,
    sendPasswordResetOtpSpy,
  };
}

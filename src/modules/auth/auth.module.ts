import { Module } from '@nestjs/common';

import { AppConfigService } from '../../shared/infrastructure/config/app-config.service';
import { UserModule } from '../user/user.module';
import { AUTH_SETTINGS } from './application/ports/auth-settings.interface';
import { AUTH_TOKEN_SERVICE } from './application/ports/auth-token-service.interface';
import { EMAIL_SERVICE } from './application/ports/email-service.interface';
import { GOOGLE_OAUTH_CLIENT } from './application/ports/google-oauth.interface';
import { OTP_CRYPTO_SERVICE } from './application/ports/otp-crypto-service.interface';
import { PASSWORD_HASHER } from './application/ports/password-hasher.interface';
import { OtpVerificationService } from './application/services/otp-verification.service';
import { TokenIssuerService } from './application/services/token-issuer.service';
import { GetGoogleLoginUrlUseCase } from './application/use-cases/get-google-login-url.use-case';
import { GoogleExchangeUseCase } from './application/use-cases/google-exchange.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutAllUseCase } from './application/use-cases/logout-all.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { SendOtpUseCase } from './application/use-cases/send-otp.use-case';
import { EMAIL_OTP_REPOSITORY } from './domain/repositories/email-otp.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository.interface';
import { Argon2PasswordHasher } from './infrastructure/external-services/argon2-password-hasher.service';
import { GoogleOAuthClient } from './infrastructure/external-services/google-oauth.service';
import { HmacOtpCryptoService } from './infrastructure/external-services/hmac-otp-crypto.service';
import { JwtAuthTokenService } from './infrastructure/external-services/jwt-auth-token.service';
import { NodemailerEmailService } from './infrastructure/external-services/nodemailer-email.service';
import { PrismaEmailOtpRepository } from './infrastructure/persistence/email-otp.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/refresh-token.repository';
import { AuthController } from './presentation/controllers/auth.controller';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    TokenIssuerService,
    OtpVerificationService,
    SendOtpUseCase,
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    LogoutAllUseCase,
    GetGoogleLoginUrlUseCase,
    GoogleExchangeUseCase,
    ResetPasswordUseCase,
    {
      provide: AUTH_SETTINGS,
      useExisting: AppConfigService,
    },
    {
      provide: AUTH_TOKEN_SERVICE,
      useClass: JwtAuthTokenService,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: EMAIL_OTP_REPOSITORY,
      useClass: PrismaEmailOtpRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasher,
    },
    {
      provide: OTP_CRYPTO_SERVICE,
      useClass: HmacOtpCryptoService,
    },
    {
      provide: EMAIL_SERVICE,
      useClass: NodemailerEmailService,
    },
    {
      provide: GOOGLE_OAUTH_CLIENT,
      useClass: GoogleOAuthClient,
    },
  ],
})
export class AuthModule {}

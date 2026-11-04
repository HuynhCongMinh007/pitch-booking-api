import { timingSafeEqual } from 'node:crypto';

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { AppConfigService } from '../../../../shared/infrastructure/services/app-config.service';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../../shared/presentation/decorators/current-user.decorator';
import { RateLimit } from '../../../../shared/presentation/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../../../../shared/presentation/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../../../shared/presentation/guards/rate-limit.guard';
import { ZodValidationPipe } from '../../../../shared/presentation/pipes/zod-validation.pipe';
import { GetGoogleLoginUrlUseCase } from '../../application/use-cases/get-google-login-url.use-case';
import { GoogleExchangeUseCase } from '../../application/use-cases/google-exchange.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutAllUseCase } from '../../application/use-cases/logout-all.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { SendOtpUseCase } from '../../application/use-cases/send-otp.use-case';
import {
  GoogleOAuthException,
  InvalidRefreshTokenException,
} from '../../domain/exceptions/auth.exception';
import {
  type GoogleExchangeRequestDto,
  type LoginRequestDto,
  type RefreshTokenRequestDto,
  type RegisterRequestDto,
  type ResetPasswordRequestDto,
  type SendOtpRequestDto,
  googleExchangeRequestSchema,
  loginRequestSchema,
  refreshTokenRequestSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
  sendOtpRequestSchema,
} from '../requests/auth.request';
import {
  OAUTH_GOOGLE_COOKIE_PATH,
  buildCookieOptions,
  clearAuthCookies,
  setAuthCookies,
} from '../utils/auth-cookie.util';

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

@ApiTags('auth')
@UseGuards(RateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly sendOtpUseCase: SendOtpUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
    private readonly getGoogleLoginUrlUseCase: GetGoogleLoginUrlUseCase,
    private readonly googleExchangeUseCase: GoogleExchangeUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit('REGISTER')
  @ApiOperation({ summary: 'Register a new user account with email OTP verification' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        otp: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  async register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterRequestDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.registerUseCase.execute(body);
    if (result.tokens) {
      setAuthCookies(
        response,
        this.config,
        result.tokens.access_token,
        result.tokens.refresh_token,
      );
    }
    return result;
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @RateLimit('SEND_OTP')
  @ApiOperation({ summary: 'Send OTP code for registration or password reset' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        purpose: { type: 'string' },
        resend: { type: 'boolean' },
      },
    },
  })
  sendOtp(@Body(new ZodValidationPipe(sendOtpRequestSchema)) body: SendOtpRequestDto) {
    return this.sendOtpUseCase.execute(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit('LOGIN')
  @ApiConsumes('application/json', 'application/x-www-form-urlencoded')
  @ApiOperation({ summary: 'Login with email or username and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.loginUseCase.execute(body);
    setAuthCookies(response, this.config, tokens.access_token, tokens.refresh_token);
    return tokens;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit('REFRESH')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new token pair' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        refresh_token: { type: 'string' },
      },
    },
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body(new ZodValidationPipe(refreshTokenRequestSchema)) body: RefreshTokenRequestDto,
  ) {
    const rawRefreshToken =
      body.refresh_token ||
      (typeof request.cookies?.refresh_token === 'string'
        ? request.cookies.refresh_token
        : undefined);

    if (!rawRefreshToken) {
      throw new InvalidRefreshTokenException('Refresh token is required in body or cookie', 400);
    }

    const tokens = await this.refreshTokenUseCase.execute({ refreshToken: rawRefreshToken });
    setAuthCookies(response, this.config, tokens.access_token, tokens.refresh_token);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session and revoke refresh token' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        refresh_token: { type: 'string' },
      },
    },
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body(new ZodValidationPipe(refreshTokenRequestSchema)) body: RefreshTokenRequestDto,
  ) {
    const rawRefreshToken =
      body.refresh_token ||
      (typeof request.cookies?.refresh_token === 'string'
        ? request.cookies.refresh_token
        : undefined);

    if (rawRefreshToken) {
      try {
        await this.logoutUseCase.execute({ refreshToken: rawRefreshToken });
      } catch (error) {
        if (!(error instanceof DomainException)) {
          throw error;
        }
      }
    }

    clearAuthCookies(response, this.config);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all sessions for current user' })
  async logoutAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.logoutAllUseCase.execute({ userId: currentUser.userId });
    clearAuthCookies(response, this.config);
    return { message: 'Logged out from all sessions successfully' };
  }

  @Get('google/login')
  @ApiOperation({ summary: 'Redirect user to Google OAuth2 consent screen' })
  async googleLogin(@Res() response: Response) {
    const { authorizationUrl, state } = await this.getGoogleLoginUrlUseCase.execute();
    response.cookie(this.config.oauthStateCookieName, state, {
      ...buildCookieOptions(this.config, OAUTH_GOOGLE_COOKIE_PATH),
      maxAge: this.config.oauthStateMaxAgeSeconds * 1000,
    });
    response.redirect(authorizationUrl);
  }

  @Post('google/exchange')
  @HttpCode(HttpStatus.OK)
  @RateLimit('LOGIN')
  @ApiOperation({ summary: 'Exchange Google OAuth2 authorization code for JWT tokens' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        state: { type: 'string' },
      },
    },
  })
  async googleExchange(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body(new ZodValidationPipe(googleExchangeRequestSchema)) body: GoogleExchangeRequestDto,
  ) {
    const expectedState = request.cookies?.[this.config.oauthStateCookieName];
    if (typeof expectedState !== 'string' || !timingSafeCompare(expectedState, body.state)) {
      throw new GoogleOAuthException(
        'Invalid or expired OAuth state. Please start Google login again.',
        400,
      );
    }

    const tokens = await this.googleExchangeUseCase.execute({ code: body.code });

    response.clearCookie(
      this.config.oauthStateCookieName,
      buildCookieOptions(this.config, OAUTH_GOOGLE_COOKIE_PATH),
    );
    setAuthCookies(response, this.config, tokens.access_token, tokens.refresh_token);
    return tokens;
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit('VERIFY_OTP')
  @ApiOperation({ summary: 'Reset user password using OTP code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        otp: { type: 'string' },
        new_password: { type: 'string' },
      },
    },
  })
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordRequestSchema)) body: ResetPasswordRequestDto,
  ) {
    return this.resetPasswordUseCase.execute({
      email: body.email,
      otp: body.otp,
      newPassword: body.new_password,
    });
  }
}

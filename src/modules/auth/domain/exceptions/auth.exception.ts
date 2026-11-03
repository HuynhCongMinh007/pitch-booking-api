import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';

export const INVALID_OTP_MSG = 'Invalid or expired OTP. Please request a new one.';
export const OTP_LOCKED_MSG =
  'OTP has expired or exceeded maximum attempts. Please request a new OTP.';
export const OTP_SENT_GENERIC_MSG = 'If the email is eligible, an OTP has been sent to it.';

export class InvalidCredentialsException extends DomainException {
  constructor(message = 'Email or password is incorrect') {
    super(message, 'INVALID_CREDENTIALS', 401);
  }
}

export class EmailNotVerifiedException extends DomainException {
  constructor(message = 'Please verify your email.') {
    super(message, 'EMAIL_NOT_VERIFIED', 403);
  }
}

export class EmailAlreadyRegisteredException extends DomainException {
  constructor(message = 'Email has already been registered. Please log in.') {
    super(message, 'EMAIL_ALREADY_REGISTERED', 400);
  }
}

export class UsernameAlreadyUsedException extends DomainException {
  constructor(message = 'Username has already been used') {
    super(message, 'USERNAME_ALREADY_USED', 400);
  }
}

export class InvalidOtpException extends DomainException {
  constructor(message = INVALID_OTP_MSG) {
    super(message, 'INVALID_OTP', 400);
  }
}

export class OtpCooldownException extends DomainException {
  constructor(cooldownSeconds: number) {
    super(
      `Please wait ${cooldownSeconds} seconds before requesting a new code.`,
      'OTP_COOLDOWN',
      429,
    );
  }
}

export class ConcurrentAuthOperationException extends DomainException {
  constructor(message: string) {
    super(message, 'CONCURRENT_AUTH_OPERATION', 409);
  }
}

export class InvalidRefreshTokenException extends DomainException {
  constructor(
    message = 'Refresh token is invalid, expired or revoked',
    statusCode: 400 | 401 = 401,
  ) {
    super(message, 'INVALID_REFRESH_TOKEN', statusCode);
  }
}

export class GoogleOAuthException extends DomainException {
  constructor(message: string, statusCode: 400 | 500 | 503 = 400) {
    super(message, 'GOOGLE_OAUTH_ERROR', statusCode);
  }
}


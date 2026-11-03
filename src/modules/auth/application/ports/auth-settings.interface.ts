export const AUTH_SETTINGS = Symbol('AUTH_SETTINGS');

export interface IAuthSettings {
  readonly otpExpireMinutes: number;
  readonly maxOtpAttempts: number;
  readonly otpResendCooldownSeconds: number;
}


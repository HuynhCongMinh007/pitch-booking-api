export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface SendOtpEmailParams {
  toEmail: string;
  username: string;
  otp: string;
}

export interface IEmailService {
  sendRegistrationOtpEmail(params: SendOtpEmailParams): Promise<boolean>;
  sendPasswordResetOtpEmail(params: SendOtpEmailParams): Promise<boolean>;
}


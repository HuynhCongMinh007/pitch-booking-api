import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

import { AppConfigService } from '../../../../shared/infrastructure/services/app-config.service';
import { escapeHtml } from '../../../../shared/utils/sanitizer.util';
import type {
  IEmailService,
  SendOtpEmailParams,
} from '../../application/ports/email-service.interface';

export interface BuildOtpHtmlOptions {
  title: string;
  username: string;
  description: string;
  otp: string;
  expireMinutes: number;
  isReset?: boolean;
}

export function buildOtpHtml(options: BuildOtpHtmlOptions): string {
  const title = escapeHtml(options.title);
  const username = escapeHtml(options.username);
  const description = escapeHtml(options.description);
  const otp = escapeHtml(options.otp);
  const isReset = Boolean(options.isReset);

  const boxBg = isReset ? '#fef2f2' : '#f0fdf4';
  const boxBorder = isReset ? '#ef4444' : '#22c55e';
  const codeColor = isReset ? '#b91c1c' : '#15803d';
  const warning = isReset
    ? 'If you did not make this request, your account is safe and you can ignore this email.'
    : 'For your security, do not share this code with anyone.';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - PitchBooking</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; text-align: center; margin-bottom: 24px; }
    .content { font-size: 15px; line-height: 1.6; color: #334155; }
    .otp-box { text-align: center; margin: 28px 0; background-color: ${boxBg}; border: 1px dashed ${boxBorder}; border-radius: 8px; padding: 16px; }
    .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: ${codeColor}; font-family: monospace; }
    .footer { margin-top: 32px; font-size: 13px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">PitchBooking</h1>
    <div class="content">
      <p>Hello <strong>${username}</strong>,</p>
      <p>${description}</p>
      <div class="otp-box"><div class="otp-code">${otp}</div></div>
      <p>This code will expire in <strong>${options.expireMinutes} minutes</strong>. ${warning}</p>
    </div>
    <div class="footer">&copy; PitchBooking. All rights reserved.</div>
  </div>
</body>
</html>`;
}

@Injectable()
export class NodemailerEmailService implements IEmailService {
  private readonly logger = new Logger(NodemailerEmailService.name);

  constructor(private readonly config: AppConfigService) {}

  async sendRegistrationOtpEmail(params: SendOtpEmailParams): Promise<boolean> {
    const expireMinutes = this.config.otpExpireMinutes;
    const subject = `${params.otp} is your PitchBooking verification code`;
    const textContent =
      `Hello ${params.username},\n\n` +
      `Your verification code is: ${params.otp}\n\n` +
      `This code will expire in ${expireMinutes} minutes.\n` +
      `If you did not create a PitchBooking account, please ignore this email.\n\n` +
      `Best regards,\nThe PitchBooking Team`;

    const htmlContent = buildOtpHtml({
      title: 'Verify your email',
      username: params.username,
      description:
        'Thank you for registering. Use the 6-digit verification code below to verify your email address:',
      otp: params.otp,
      expireMinutes,
      isReset: false,
    });

    return this.sendEmail(params.toEmail, subject, htmlContent, textContent);
  }

  async sendPasswordResetOtpEmail(params: SendOtpEmailParams): Promise<boolean> {
    const expireMinutes = this.config.otpExpireMinutes;
    const subject = `${params.otp} is your PitchBooking password reset code`;
    const textContent =
      `Hello ${params.username},\n\n` +
      `Your password reset code is: ${params.otp}\n\n` +
      `This code will expire in ${expireMinutes} minutes.\n` +
      `If you did not request a password reset, please ignore this email.\n\n` +
      `Best regards,\nThe PitchBooking Team`;

    const htmlContent = buildOtpHtml({
      title: 'Reset Password',
      username: params.username,
      description:
        'We received a request to reset your password. Use the 6-digit verification code below to proceed:',
      otp: params.otp,
      expireMinutes,
      isReset: true,
    });

    return this.sendEmail(params.toEmail, subject, htmlContent, textContent);
  }

  private async sendEmail(
    toEmail: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<boolean> {
    if (!this.config.smtpUser || !this.config.smtpPassword) {
      this.logger.warn(
        `SMTP not configured. Skipping email sending. Target: ${toEmail}, Subject: ${subject}`,
      );
      return false;
    }

    const fromEmail = this.config.emailsFromEmail ?? this.config.smtpUser;
    const fromHeader = this.config.emailsFromName
      ? `${this.config.emailsFromName} <${fromEmail}>`
      : fromEmail;

    const transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSsl,
      requireTLS: !this.config.smtpSsl && this.config.smtpTls,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      },
      connectionTimeout: 15_000,
      socketTimeout: 15_000,
    });

    await transporter.sendMail({
      from: fromHeader,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    this.logger.log(`Email sent successfully to ${toEmail}`);
    return true;
  }
}


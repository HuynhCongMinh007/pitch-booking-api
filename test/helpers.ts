import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/shared/infrastructure/prisma.service';
import { resetRateLimits } from '../src/shared/infrastructure/rate-limit';
import { EmailService } from '../src/services/email.service';

/**
 * Start the whole app for e2e tests. Emails are never actually sent.
 * Returns { app, api, prisma, emailService } where `api()` creates a supertest client.
 */
export type TestContext = Awaited<ReturnType<typeof createTestApp>>;

export async function createTestApp() {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.init();

  const emailService = app.get(EmailService);
  jest.spyOn(emailService, 'sendRegistrationOtpEmail').mockResolvedValue(true);
  jest.spyOn(emailService, 'sendPasswordResetOtpEmail').mockResolvedValue(true);

  return {
    app,
    api: () => request(app.getHttpServer()),
    prisma: app.get(PrismaService),
    emailService,
  };
}

export function resetTestState(emailService: EmailService): void {
  resetRateLimits();
  jest.mocked(emailService.sendRegistrationOtpEmail).mockClear();
  jest.mocked(emailService.sendPasswordResetOtpEmail).mockClear();
}

export function randomSuffix(length = 10): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, length);
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

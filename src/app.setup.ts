import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';

import { settings } from './shared/infrastructure/config';
import { HttpExceptionFilter } from './shared/presentation/http-exception.filter';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
const API_CSP = "default-src 'none'; frame-ancestors 'none'";
const DOCS_PATHS = ['/docs', '/openapi.json'];

function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.set(SECURITY_HEADERS);
  if (!DOCS_PATHS.some((path) => req.path.startsWith(path))) {
    res.set('Content-Security-Policy', API_CSP);
  }
  next();
}

/** Middlewares, CORS, error format and API docs (shared by main.js and the tests). */
export function configureApp<T extends INestApplication>(app: T): T {
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(cookieParser());

  app.enableCors({
    origin: settings.FRONTEND_URL ? [settings.FRONTEND_URL] : ['http://localhost:3000'],
    credentials: true,
  });

  app.use(securityHeaders);
  app.useGlobalFilters(new HttpExceptionFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('PitchBooking API').setVersion('1.0.0').build(),
  );
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'openapi.json' });

  return app;
}

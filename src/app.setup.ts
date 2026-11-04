import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';

import { HttpExceptionFilter } from './shared/presentation/filters/http-exception.filter';
import { TransformInterceptor } from './shared/presentation/interceptors/transform.interceptor';

const DOCS_PREFIXES = ['/docs', '/redoc', '/openapi.json'];
const API_CSP = "default-src 'none'; frame-ancestors 'none'";

/** Middlewares, CORS, error format and API docs (shared by main.ts and tests). */
export function configureApp<T extends INestApplication>(app: T): T {
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const isDocsRoute = DOCS_PREFIXES.some((prefix) => req.path.startsWith(prefix));
    if (!isDocsRoute) {
      res.setHeader('Content-Security-Policy', API_CSP);
    }
    next();
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/db'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('PitchBooking API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'openapi.json',
    swaggerOptions: { defaultModelsExpandDepth: -1 },
  });

  return app;
}

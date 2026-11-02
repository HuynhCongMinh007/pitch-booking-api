import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { settings } from './shared/infrastructure/config';
import { HttpExceptionFilter, securityHeadersMiddleware } from './shared/presentation';

/** Middlewares, CORS, error format and API docs (shared by main.ts and tests). */
export function configureApp<T extends INestApplication>(app: T): T {
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(cookieParser());

  app.enableCors({
    origin: settings.FRONTEND_URL ? [settings.FRONTEND_URL] : ['http://localhost:3000'],
    credentials: true,
  });

  app.use(securityHeadersMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('PitchBooking API').setVersion('1.0.0').build(),
  );
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'openapi.json' });

  return app;
}

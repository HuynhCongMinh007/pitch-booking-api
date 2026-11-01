import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

import { ApplicationError, ApplicationErrorKind } from '../application/application.error';
import { DomainError, DomainErrorKind } from '../domain/errors/domain.error';
import type { BearerHttpException } from '../infrastructure/security';

const STATUS_BY_KIND: Record<DomainErrorKind | ApplicationErrorKind, number> = {
  invalid: HttpStatus.UNPROCESSABLE_ENTITY,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
};

/**
 * Formats every error like the FastAPI backend did:
 *   - HttpException('message')       -> { "detail": "message" }
 *   - HttpException({ custom body }) -> the body as-is (validation errors, rate limit)
 *   - DomainError / ApplicationError -> status from `kind`, { "detail": "message" }
 *   - anything else                  -> 500 { "detail": "Internal Server Error" }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError || exception instanceof ApplicationError) {
      res.status(STATUS_BY_KIND[exception.kind]).json({ detail: exception.message });
      return;
    }

    if (!(exception instanceof HttpException)) {
      const error = exception as Error | undefined;
      this.logger.error(error?.message, error?.stack);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ detail: 'Internal Server Error' });
      return;
    }

    const status = exception.getStatus();
    const response = exception.getResponse();

    let body: unknown;
    if (typeof response === 'string') {
      body = { detail: response };
    } else if (!('statusCode' in response)) {
      // Custom body passed by our code, e.g. { detail: [...] } or { error: '...' }
      body = response;
    } else {
      // Nest built-in exceptions: { statusCode, message, error }
      body = { detail: (response as Record<string, unknown>).message };
    }

    const { headers } = exception as BearerHttpException;
    if (headers) {
      res.set(headers);
    }
    res.status(status).json(body);
  }
}

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger, } from '@nestjs/common';
import type { Request, Response } from 'express';

import { DomainException } from '../../domain/exceptions/domain.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';

    if (exception instanceof DomainException) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      code = HttpStatus[statusCode] ?? 'HTTP_ERROR';
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        const rawMessage = (res as Record<string, unknown>).message ?? exception.message;
        message = Array.isArray(rawMessage) ? rawMessage.join('; ') : String(rawMessage);
      }
    } else {
      this.logger.error(
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (statusCode === HttpStatus.UNAUTHORIZED && !response.getHeader('WWW-Authenticate')) {
      response.setHeader('WWW-Authenticate', 'Bearer');
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      error: { code, message },
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}

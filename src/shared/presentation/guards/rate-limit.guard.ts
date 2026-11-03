import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { type RateLimitPreset, RateLimitService, } from '../../infrastructure/rate-limit/rate-limit.service';
import { RATE_LIMIT_METADATA_KEY } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const preset = this.reflector.getAllAndOverride<RateLimitPreset | undefined>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!preset) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = request.ip || request.socket?.remoteAddress || 'unknown';
    const routeId = `${context.getClass().name}.${context.getHandler().name}`;

    const allowed = this.rateLimitService.consume(preset, routeId, clientIp);
    if (!allowed) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}


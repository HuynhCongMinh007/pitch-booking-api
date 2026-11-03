import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { TokenPayload } from '../../application/ports/token-service.interface';

export interface AuthenticatedUser {
  userId: number;
  sub: string;
  jti: string;
  payload: TokenPayload;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);


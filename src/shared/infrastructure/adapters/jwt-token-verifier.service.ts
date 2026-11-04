import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

import type {
  ITokenVerifier,
  TokenPayload,
} from '../../application/ports/token-verifier.interface';
import { DomainException } from '../../domain/exceptions/domain.exception';
import { AppConfigService } from '../services/app-config.service';

@Injectable()
export class JwtTokenVerifierService implements ITokenVerifier {
  constructor(private readonly config: AppConfigService) {}

  verifyAccessToken(token: string): TokenPayload {
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, this.config.secretKey, {
        algorithms: [this.config.jwtAlgorithm],
      });
    } catch {
      throw new DomainException('Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    if (typeof decoded !== 'object' || decoded === null) {
      throw new DomainException('Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    if (decoded.type !== 'access') {
      throw new DomainException('Expected access token', 'UNAUTHORIZED', 401);
    }

    if (typeof decoded.sub !== 'string' || !decoded.sub) {
      throw new DomainException('Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    return decoded as unknown as TokenPayload;
  }
}


import { Global, Module } from '@nestjs/common';

import { TOKEN_SERVICE } from '../../application/ports/token-service.interface';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { JwtTokenService } from './jwt-token.service';

@Global()
@Module({
  providers: [
    RateLimitService,
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
  ],
  exports: [TOKEN_SERVICE, RateLimitService],
})
export class SecurityModule {}


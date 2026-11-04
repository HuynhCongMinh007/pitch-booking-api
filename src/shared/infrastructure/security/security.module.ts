import { Global, Module } from '@nestjs/common';

import { TOKEN_VERIFIER } from '../../application/ports/token-verifier.interface';
import { JwtTokenVerifierService } from './jwt-token-verifier.service';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [
    RateLimitService,
    {
      provide: TOKEN_VERIFIER,
      useClass: JwtTokenVerifierService,
    },
  ],
  exports: [TOKEN_VERIFIER, RateLimitService],
})
export class SecurityModule {}

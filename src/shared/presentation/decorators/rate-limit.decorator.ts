import { SetMetadata } from '@nestjs/common';

import type { RateLimitPreset } from '../../infrastructure/rate-limit/rate-limit.service';

export const RATE_LIMIT_METADATA_KEY = 'pitchbooking:rate_limit_preset';

export const RateLimit = (preset: RateLimitPreset) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, preset);


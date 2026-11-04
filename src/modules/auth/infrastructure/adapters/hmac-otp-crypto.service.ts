import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../../../shared/infrastructure/services/app-config.service';
import type { IOtpCryptoService } from '../../application/ports/otp-crypto-service.interface';

@Injectable()
export class HmacOtpCryptoService implements IOtpCryptoService {
  constructor(private readonly config: AppConfigService) {}

  generateCode(length = 6): string {
    let digits = '';
    for (let i = 0; i < length; i += 1) {
      digits += String(randomInt(0, 10));
    }
    return digits;
  }

  hashCode(code: string): string {
    return createHmac('sha256', Buffer.from(this.config.otpSecretKey, 'utf8'))
      .update(Buffer.from(code, 'utf8'))
      .digest('hex');
  }

  verifyCode(plainCode: string, hashedCode: string): boolean {
    const computed = Buffer.from(this.hashCode(plainCode), 'utf8');
    const expected = Buffer.from(hashedCode, 'utf8');
    if (computed.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(computed, expected);
  }
}


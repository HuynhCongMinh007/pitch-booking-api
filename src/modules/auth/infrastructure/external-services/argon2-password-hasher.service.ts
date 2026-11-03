import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

import type {
  IPasswordHasher,
  PasswordVerificationResult,
} from '../../application/ports/password-hasher.interface';

@Injectable()
export class Argon2PasswordHasher implements IPasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, { type: argon2.argon2id });
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, plainPassword);
    } catch {
      return false;
    }
  }

  async verifyAndUpdate(
    plainPassword: string,
    passwordHash: string,
  ): Promise<PasswordVerificationResult> {
    const valid = await this.verify(plainPassword, passwordHash);
    if (!valid) {
      return { valid: false, upgradedHash: null };
    }

    let needsUpgrade = false;
    try {
      needsUpgrade = argon2.needsRehash(passwordHash);
    } catch {
      needsUpgrade = false;
    }

    const upgradedHash = needsUpgrade ? await this.hash(plainPassword) : null;
    return { valid: true, upgradedHash };
  }
}


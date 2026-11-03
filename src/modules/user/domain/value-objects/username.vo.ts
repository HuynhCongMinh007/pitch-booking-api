import { randomUUID } from 'node:crypto';

import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { ValueObject } from '../../../../shared/domain/value-objects/base.vo';

export const USERNAME_REGEX = /^[A-Za-z0-9_.]+$/;

export class Username extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Username {
    const trimmed = raw.trim();
    if (trimmed.length < 6 || trimmed.length > 50 || !USERNAME_REGEX.test(trimmed)) {
      throw new DomainException(
        'Username must be 6-50 characters and contain only letters, digits, underscores, or dots',
        'INVALID_USERNAME',
        422,
      );
    }
    return new Username(trimmed);
  }

  static generateDefaultFromEmail(email: string): Username {
    const localRaw = email.split('@')[0] ?? '';
    const localPart = localRaw.replace(/[^A-Za-z0-9_.]/g, '').slice(0, 40) || 'user';
    const suffix = randomUUID().replace(/-/g, '').slice(0, 6);
    return new Username(`${localPart}_${suffix}`);
  }

  get value(): string {
    return this.props.value;
  }
}


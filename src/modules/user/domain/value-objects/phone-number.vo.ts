import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { ValueObject } from '../../../../shared/domain/value-objects/base.vo';

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

export class PhoneNumber extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): PhoneNumber {
    const cleaned = raw.trim().replace(/[\s\-().]/g, '');
    if (!PHONE_REGEX.test(cleaned) || cleaned.length > 20) {
      throw new DomainException(
        'Invalid phone number (must contain 7 to 15 digits)',
        'INVALID_PHONE_NUMBER',
        422,
      );
    }
    return new PhoneNumber(cleaned);
  }

  get value(): string {
    return this.props.value;
  }
}


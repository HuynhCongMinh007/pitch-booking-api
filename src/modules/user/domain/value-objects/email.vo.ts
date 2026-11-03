import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { ValueObject } from '../../../../shared/domain/value-objects/base.vo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!normalized || normalized.length > 255 || !EMAIL_REGEX.test(normalized)) {
      throw new DomainException('Invalid email address', 'INVALID_EMAIL', 422);
    }
    return new Email(normalized);
  }

  get value(): string {
    return this.props.value;
  }
}


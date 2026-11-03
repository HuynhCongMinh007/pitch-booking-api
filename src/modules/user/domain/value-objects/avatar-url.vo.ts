import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { ValueObject } from '../../../../shared/domain/value-objects/base.vo';

const HTTP_URL_REGEX = /^https?:\/\/\S+$/i;

export class AvatarUrl extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): AvatarUrl {
    const trimmed = raw.trim();
    if (!HTTP_URL_REGEX.test(trimmed) || trimmed.length > 500) {
      throw new DomainException('avatar_url must be an http(s) URL', 'INVALID_AVATAR_URL', 422);
    }
    return new AvatarUrl(trimmed);
  }

  get value(): string {
    return this.props.value;
  }
}


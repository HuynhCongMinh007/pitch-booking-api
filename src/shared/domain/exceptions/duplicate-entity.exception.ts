import { DomainException } from './domain.exception';

export class DuplicateEntityException extends DomainException {
  readonly targetFields: readonly string[];

  constructor(message = 'Duplicate entity violation', targetFields: readonly string[] = []) {
    super(message, 'DUPLICATE_ENTITY', 409);
    this.targetFields = targetFields;
  }
}


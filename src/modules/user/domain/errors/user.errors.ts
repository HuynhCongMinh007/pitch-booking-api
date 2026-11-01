import { DomainError } from '../../../../shared/domain/errors/domain.error';

export class InvalidUserError extends DomainError {
  readonly code = 'USER_INVALID';
  readonly kind = 'invalid';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserError';
  }
}


export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';
  readonly kind = 'not_found';

  constructor(userId: number) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class UsernameAlreadyTakenError extends DomainError {
  readonly code = 'USER_USERNAME_TAKEN';
  readonly kind = 'conflict';

  constructor() {
    super('Username is already taken');
    this.name = 'UsernameAlreadyTakenError';
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = 'USER_EMAIL_REGISTERED';
  readonly kind = 'conflict';

  constructor() {
    super('Email has already been registered');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

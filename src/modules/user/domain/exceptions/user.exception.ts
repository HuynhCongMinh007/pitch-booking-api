import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';

export class UserNotFoundException extends DomainException {
  constructor(message = 'User not found') {
    super(message, 'USER_NOT_FOUND', 404);
  }
}

export class AccountDisabledException extends DomainException {
  constructor(message = 'Account has been disabled') {
    super(message, 'ACCOUNT_DISABLED', 403);
  }
}

export class UsernameAlreadyTakenException extends DomainException {
  constructor(message = 'Username is already taken') {
    super(message, 'USERNAME_ALREADY_TAKEN', 409);
  }
}

export class InvalidUserProfileException extends DomainException {
  constructor(message: string) {
    super(message, 'INVALID_USER_PROFILE', 422);
  }
}


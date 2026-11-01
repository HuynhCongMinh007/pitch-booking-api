import { ApplicationError } from '../../../../shared/application/application.error';

export class AccountDisabledError extends ApplicationError {
  readonly code = 'USER_ACCOUNT_DISABLED';
  readonly kind = 'forbidden';

  constructor() {
    super('Account has been disabled');
    this.name = 'AccountDisabledError';
  }
}

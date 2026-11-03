export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordVerificationResult {
  valid: boolean;
  upgradedHash: string | null;
}

export interface IPasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, passwordHash: string): Promise<boolean>;
  verifyAndUpdate(
    plainPassword: string,
    passwordHash: string,
  ): Promise<PasswordVerificationResult>;
}


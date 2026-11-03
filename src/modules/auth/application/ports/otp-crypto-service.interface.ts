export const OTP_CRYPTO_SERVICE = Symbol('OTP_CRYPTO_SERVICE');

export interface IOtpCryptoService {
  generateCode(length?: number): string;
  hashCode(code: string): string;
  verifyCode(plainCode: string, hashedCode: string): boolean;
}


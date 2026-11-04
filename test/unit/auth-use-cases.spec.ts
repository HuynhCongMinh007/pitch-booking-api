import type { IAuthTokenService } from '../../src/modules/auth/application/ports/auth-token-service.interface';
import type { IEmailService } from '../../src/modules/auth/application/ports/email-service.interface';
import type { IOtpCryptoService } from '../../src/modules/auth/application/ports/otp-crypto-service.interface';
import type { IPasswordHasher } from '../../src/modules/auth/application/ports/password-hasher.interface';
import { LoginUseCase } from '../../src/modules/auth/application/use-cases/login.use-case';
import { SendOtpUseCase } from '../../src/modules/auth/application/use-cases/send-otp.use-case';
import { OtpVerificationService } from '../../src/modules/auth/application/services/otp-verification.service';
import { TokenIssuerService } from '../../src/modules/auth/application/services/token-issuer.service';
import { OtpPurpose } from '../../src/modules/auth/domain/enums/otp-purpose.enum';
import { InvalidCredentialsException } from '../../src/modules/auth/domain/exceptions/auth.exception';
import type { IEmailOtpRepository } from '../../src/modules/auth/domain/repositories/email-otp.repository.interface';
import type { IRefreshTokenRepository } from '../../src/modules/auth/domain/repositories/refresh-token.repository.interface';
import type { IUserRepository } from '../../src/modules/user/domain/repositories/user.repository.interface';
import type { IUnitOfWork } from '../../src/shared/application/ports/unit-of-work.interface';

describe('Auth UseCases Unit Tests (Isolated from DB)', () => {
  const unitOfWork: IUnitOfWork = {
    execute: <T>(work: () => Promise<T>) => work(),
  };

  it('LoginUseCase still verifies against dummy hash when user is not found (anti-timing)', async () => {
    const userRepository: jest.Mocked<IUserRepository> = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByEmailOrUsername: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const passwordHasher: jest.Mocked<IPasswordHasher> = {
      hash: jest.fn().mockResolvedValue('dummy_hash_value'),
      verify: jest.fn().mockResolvedValue(false),
      verifyAndUpdate: jest.fn().mockResolvedValue({ valid: false, upgradedHash: null }),
    };

    const tokenService = {} as IAuthTokenService;
    const refreshRepo = {} as IRefreshTokenRepository;
    const tokenIssuer = new TokenIssuerService(tokenService, refreshRepo);

    const loginUseCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      unitOfWork,
      tokenIssuer,
    );

    await expect(
      loginUseCase.execute({ username: 'unknown@example.com', password: 'secretPassword' }),
    ).rejects.toThrow(InvalidCredentialsException);

    expect(passwordHasher.hash).toHaveBeenCalledTimes(1);
    expect(passwordHasher.verifyAndUpdate).toHaveBeenCalledWith(
      'secretPassword',
      'dummy_hash_value',
    );
  });

  it('SendOtpUseCase returns generic response without sending email when RESET_PASSWORD email does not exist', async () => {
    const userRepository: jest.Mocked<IUserRepository> = {
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByUsername: jest.fn(),
      findByEmailOrUsername: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const otpRepository = {} as IEmailOtpRepository;
    const passwordHasher = {} as IPasswordHasher;
    const emailService: jest.Mocked<IEmailService> = {
      sendRegistrationOtpEmail: jest.fn(),
      sendPasswordResetOtpEmail: jest.fn(),
    };
    const otpCrypto = {} as IOtpCryptoService;
    const settings = {
      otpExpireMinutes: 5,
      maxOtpAttempts: 5,
      otpResendCooldownSeconds: 60,
    };

    const otpVerificationService = new OtpVerificationService(otpRepository, otpCrypto, settings);
    const sendOtpUseCase = new SendOtpUseCase(
      userRepository,
      otpRepository,
      passwordHasher,
      emailService,
      settings,
      unitOfWork,
      otpVerificationService,
    );

    const result = await sendOtpUseCase.execute({
      email: 'Unknown@Example.com',
      purpose: OtpPurpose.RESET_PASSWORD,
      resend: false,
    });

    expect(result.email).toBe('unknown@example.com');
    expect(result.isAlreadySent).toBe(false);
    expect(emailService.sendPasswordResetOtpEmail).not.toHaveBeenCalled();
  });
});

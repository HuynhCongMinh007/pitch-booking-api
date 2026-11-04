import { JwtAuthTokenService } from '../../src/modules/auth/infrastructure/external-services/jwt-auth-token.service';
import { DomainException } from '../../src/shared/domain/exceptions/domain.exception';
import { AppConfigService } from '../../src/shared/infrastructure/config/app-config.service';
import { JwtTokenVerifierService } from '../../src/shared/infrastructure/security/jwt-token-verifier.service';

describe('JWT Issuer (Auth) & Verifier (Shared) Interoperability', () => {
  const config = new AppConfigService();
  const authTokenService = new JwtAuthTokenService(config);
  const tokenVerifier = new JwtTokenVerifierService(config);

  it('verifies access tokens created by JwtAuthTokenService via JwtTokenVerifierService', () => {
    const issued = authTokenService.createAccessToken(42);
    const payload = tokenVerifier.verifyAccessToken(issued.token);

    expect(payload.sub).toBe('42');
    expect(payload.type).toBe('access');
    expect(payload.jti).toBeDefined();
  });

  it('rejects refresh tokens when passed to JwtTokenVerifierService.verifyAccessToken', () => {
    const refresh = authTokenService.createRefreshToken(42);

    expect(() => tokenVerifier.verifyAccessToken(refresh.token)).toThrow(DomainException);
    expect(() => tokenVerifier.verifyAccessToken(refresh.token)).toThrow('Expected access token');
  });

  it('verifies refresh tokens and rejects access tokens in JwtAuthTokenService.verifyRefreshToken', () => {
    const refresh = authTokenService.createRefreshToken(99);
    const access = authTokenService.createAccessToken(99);

    const payload = authTokenService.verifyRefreshToken(refresh.token);
    expect(payload.sub).toBe('99');
    expect(payload.type).toBe('refresh');

    expect(() => authTokenService.verifyRefreshToken(access.token)).toThrow(
      'Expected refresh token',
    );
  });
});


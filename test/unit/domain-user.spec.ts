import { buildOtpHtml } from '../../src/modules/auth/infrastructure/adapters/nodemailer-email.service';
import { UserEntity } from '../../src/modules/user/domain/entities/user.entity';
import { Gender, parseGender } from '../../src/modules/user/domain/enums/gender.enum';
import { UserRole } from '../../src/modules/user/domain/enums/user-role.enum';
import { AccountDisabledException } from '../../src/modules/user/domain/exceptions/user.exception';
import { AvatarUrl } from '../../src/modules/user/domain/value-objects/avatar-url.vo';
import { Email } from '../../src/modules/user/domain/value-objects/email.vo';
import { PhoneNumber } from '../../src/modules/user/domain/value-objects/phone-number.vo';
import { Username } from '../../src/modules/user/domain/value-objects/username.vo';
import {
  sanitizeText,
  stripEmptyString,
} from '../../src/shared/presentation/utils/sanitizer.util';

describe('User Domain & Sanitizer Unit Tests', () => {
  describe('Sanitizer utilities', () => {
    it('escapes XSS script and HTML tags', () => {
      expect(sanitizeText('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
      );
      expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe(
        '&lt;img src=x onerror=alert(1)&gt;',
      );
    });

    it('trims strings and converts whitespace-only strings to null', () => {
      expect(sanitizeText('   Hello World   ')).toBe('Hello World');
      expect(sanitizeText('   ')).toBeNull();
      expect(sanitizeText(null)).toBeNull();

      expect(stripEmptyString('  abc  ')).toBe('abc');
      expect(stripEmptyString('   ')).toBeNull();
      expect(stripEmptyString(null)).toBeNull();
    });

    it('escapes XSS in OTP email HTML template', () => {
      const htmlContent = buildOtpHtml({
        title: 'Verify <script>',
        username: 'Player <script>alert("XSS")</script>',
        description: 'Please enter code: <img src=x onerror=steal()>',
        otp: '123456',
        expireMinutes: 5,
        isReset: false,
      });

      expect(htmlContent).not.toContain('<script>');
      expect(htmlContent).toContain('&lt;script&gt;');
      expect(htmlContent).not.toContain('<img');
      expect(htmlContent).toContain('&lt;img');
    });
  });

  describe('Value Objects', () => {
    it('normalizes and validates Email', () => {
      const email = Email.create('  John.Doe@Example.COM ');
      expect(email.value).toBe('john.doe@example.com');
      expect(() => Email.create('not-an-email')).toThrow();
    });

    it('validates Username rules and generates default from email', () => {
      expect(Username.create('player_01.vn').value).toBe('player_01.vn');
      expect(() => Username.create('abcde')).toThrow();
      expect(() => Username.create('user@domain')).toThrow();
      expect(() => Username.create('bad user')).toThrow();

      const generated = Username.generateDefaultFromEmail('john+tag@example.com');
      expect(generated.value).toMatch(/^johntag_[0-9a-f]{6}$/);
    });

    it('cleans and validates PhoneNumber', () => {
      expect(PhoneNumber.create('+84 (912) 345-678').value).toBe('+84912345678');
      expect(PhoneNumber.create('0912345678').value).toBe('0912345678');
      expect(() => PhoneNumber.create('not-a-phone')).toThrow();
    });

    it('validates AvatarUrl', () => {
      expect(AvatarUrl.create('https://example.com/avatar.jpg').value).toBe(
        'https://example.com/avatar.jpg',
      );
      expect(() => AvatarUrl.create('javascript:alert(1)')).toThrow();
      expect(() => AvatarUrl.create('data:text/html;base64,PHNjcmlwdD4=')).toThrow();
    });

    it('parses Gender case-insensitively', () => {
      expect(parseGender('male')).toBe(Gender.MALE);
      expect(parseGender('FEMALE')).toBe(Gender.FEMALE);
      expect(parseGender('   ')).toBeNull();
      expect(parseGender(null)).toBeNull();
      expect(() => parseGender('alien')).toThrow();
    });
  });

  describe('UserEntity invariants', () => {
    it('completes pending registration and enforces active/verified checks', () => {
      const pending = UserEntity.createPendingRegistration({
        email: Email.create('test@example.com'),
        passwordHash: 'temp_hash',
      });
      expect(pending.role).toBe(UserRole.CUSTOMER);
      expect(pending.isActive).toBe(true);
      expect(pending.isEmailVerified).toBe(false);
      expect(() => pending.ensureEmailVerified()).toThrow('Please verify your email.');

      pending.completeRegistration({
        username: Username.create('real_player'),
        passwordHash: 'final_hash',
      });
      expect(pending.username).toBe('real_player');
      expect(pending.isEmailVerified).toBe(true);
      expect(() =>
        pending.completeRegistration({
          username: Username.create('another_name'),
          passwordHash: 'hash2',
        }),
      ).toThrow('Email has already been registered');
    });

    it('rejects future dateOfBirth and disabled accounts', () => {
      const disabled = UserEntity.reconstitute(
        {
          username: 'disabled_user',
          email: 'disabled@example.com',
          passwordHash: 'hash',
          role: UserRole.CUSTOMER,
          isActive: false,
          isEmailVerified: true,
          fullName: null,
          phoneNumber: null,
          address: null,
          avatarUrl: null,
          dateOfBirth: null,
          gender: null,
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        1,
      );

      expect(() => disabled.ensureActive()).toThrow(AccountDisabledException);

      const tomorrow = new Date(Date.now() + 2 * 86_400_000);
      expect(() => disabled.updateProfile({ dateOfBirth: tomorrow })).toThrow(
        'date_of_birth cannot be in the future',
      );
    });
  });
});


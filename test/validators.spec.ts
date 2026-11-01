import {
  normalizeGender,
  sanitizeText,
  stripEmptyString,
  todayIsoDate,
  validateAvatarUrl,
  validateDateNotInFuture,
  validatePhoneNumber,
} from '../src/utils/validators';

function shiftDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

test('sanitizeText escapes XSS', () => {
  expect(sanitizeText('<script>alert("XSS")</script>')).toBe(
    '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
  );
});

test('sanitizeText handles html tags', () => {
  const sanitized = sanitizeText('<img src=x onerror=alert(1)>');
  expect(sanitized).not.toContain('<');
  expect(sanitized).not.toContain('>');
  expect(sanitized).toBe('&lt;img src=x onerror=alert(1)&gt;');
});

test('sanitizeText trims and empties', () => {
  expect(sanitizeText('   Hello World   ')).toBe('Hello World');
  expect(sanitizeText('   ')).toBeNull();
  expect(sanitizeText(null)).toBeNull();
});

test('stripEmptyString', () => {
  expect(stripEmptyString('  abc  ')).toBe('abc');
  expect(stripEmptyString('   ')).toBeNull();
  expect(stripEmptyString(null)).toBeNull();
});

test('normalizeGender', () => {
  expect(normalizeGender('male')).toBe('MALE');
  expect(normalizeGender('FEMALE')).toBe('FEMALE');
  expect(normalizeGender('OTHER')).toBe('OTHER');
  expect(normalizeGender(null)).toBeNull();
  expect(normalizeGender('   ')).toBeNull();
  expect(normalizeGender('invalid')).toBe('INVALID');
});

test('validateAvatarUrl', () => {
  expect(validateAvatarUrl('https://example.com/avatar.jpg')).toBe('https://example.com/avatar.jpg');
  expect(validateAvatarUrl('http://example.com/pic.png')).toBe('http://example.com/pic.png');
  expect(validateAvatarUrl(null)).toBeNull();
  expect(() => validateAvatarUrl('javascript:alert(1)')).toThrow('avatar_url must be an http');
  expect(() => validateAvatarUrl('data:text/html;base64,PHNjcmlwdD4=')).toThrow(
    'avatar_url must be an http',
  );
});

test('validatePhoneNumber', () => {
  expect(validatePhoneNumber('+84 (912) 345-678')).toBe('+84912345678');
  expect(validatePhoneNumber('0912345678')).toBe('0912345678');
  expect(validatePhoneNumber(null)).toBeNull();
  expect(() => validatePhoneNumber('abc')).toThrow('Invalid phone number');
});

test('validateDateNotInFuture', () => {
  const pastDate = shiftDays(-100);
  expect(validateDateNotInFuture(pastDate)).toBe(pastDate);
  expect(validateDateNotInFuture(todayIsoDate())).toBe(todayIsoDate());
  expect(validateDateNotInFuture(null)).toBeNull();
  expect(() => validateDateNotInFuture(shiftDays(1))).toThrow('cannot be in the future');
});

import { InvalidUserError } from '../errors/user.errors';
import { Gender } from '../gender';
import { UserRole } from '../user-role';

export const USER_USERNAME_MIN_LENGTH = 6;
export const USER_USERNAME_MAX_LENGTH = 50;
export const USER_EMAIL_MAX_LENGTH = 255;
export const USER_FULL_NAME_MAX_LENGTH = 255;
export const USER_ADDRESS_MAX_LENGTH = 255;
export const USER_AVATAR_URL_MAX_LENGTH = 500;
export const USER_BIO_MAX_LENGTH = 1000;

const USERNAME_PATTERN = /^[A-Za-z0-9_.]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;

export interface UserProps {
  id: number | null;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  fullName: string | null;
  phoneNumber: string | null;
  address: string | null;
  avatarUrl: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  bio: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type NewUserProps = Pick<UserProps, 'username' | 'email' | 'passwordHash'> &
  Partial<Pick<UserProps, 'role' | 'isActive' | 'isEmailVerified' | 'fullName' | 'avatarUrl'>>;

export type ProfileChanges = Partial<
  Pick<
    UserProps,
    'fullName' | 'phoneNumber' | 'address' | 'avatarUrl' | 'dateOfBirth' | 'gender' | 'bio'
  >
>;

export class User {
  private readonly _id: number | null;
  private _username: string;
  private readonly _email: string;
  private _passwordHash: string;
  private readonly _role: UserRole;
  private _isActive: boolean;
  private _isEmailVerified: boolean;
  private _fullName: string | null;
  private _phoneNumber: string | null;
  private _address: string | null;
  private _avatarUrl: string | null;
  private _dateOfBirth: Date | null;
  private _gender: Gender | null;
  private _bio: string | null;
  private readonly _createdAt: Date | null;
  private readonly _updatedAt: Date | null;

  private constructor(props: UserProps) {
    this._id = props.id;
    this._username = props.username;
    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._isActive = props.isActive;
    this._isEmailVerified = props.isEmailVerified;
    this._fullName = props.fullName;
    this._phoneNumber = props.phoneNumber;
    this._address = props.address;
    this._avatarUrl = props.avatarUrl;
    this._dateOfBirth = props.dateOfBirth;
    this._gender = props.gender;
    this._bio = props.bio;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): number | null {
    return this._id;
  }
  get username(): string {
    return this._username;
  }
  get email(): string {
    return this._email;
  }
  get passwordHash(): string {
    return this._passwordHash;
  }
  get role(): UserRole {
    return this._role;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get isEmailVerified(): boolean {
    return this._isEmailVerified;
  }
  get fullName(): string | null {
    return this._fullName;
  }
  get phoneNumber(): string | null {
    return this._phoneNumber;
  }
  get address(): string | null {
    return this._address;
  }
  get avatarUrl(): string | null {
    return this._avatarUrl;
  }
  get dateOfBirth(): Date | null {
    return this._dateOfBirth;
  }
  get gender(): Gender | null {
    return this._gender;
  }
  get bio(): string | null {
    return this._bio;
  }
  get createdAt(): Date | null {
    return this._createdAt;
  }
  get updatedAt(): Date | null {
    return this._updatedAt;
  }

  get canLogin(): boolean {
    return this._isActive && this._isEmailVerified;
  }

  static create(props: NewUserProps): User {
    const username = props.username.trim();
    const email = props.email.trim().toLowerCase();
    const fullName = props.fullName ?? null;
    const avatarUrl = props.avatarUrl ?? null;

    User.assertUsername(username);
    User.assertEmail(email);
    User.assertPasswordHash(props.passwordHash);
    User.assertMaxLength('fullName', USER_FULL_NAME_MAX_LENGTH, fullName);
    User.assertAvatarUrl(avatarUrl);

    return new User({
      id: null,
      username,
      email,
      passwordHash: props.passwordHash,
      role: props.role ?? UserRole.CUSTOMER,
      isActive: props.isActive ?? true,
      isEmailVerified: props.isEmailVerified ?? false,
      fullName,
      phoneNumber: null,
      address: null,
      avatarUrl,
      dateOfBirth: null,
      gender: null,
      bio: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  static reconstitute(props: UserProps): User {
    return new User({ ...props });
  }

  /** Finish registration after the OTP was verified. */
  completeRegistration(username: string, passwordHash: string): void {
    const newUsername = username.trim();
    User.assertUsername(newUsername);
    User.assertPasswordHash(passwordHash);

    this._username = newUsername;
    this._passwordHash = passwordHash;
    this._isActive = true;
    this._isEmailVerified = true;
  }

  changeUsername(username: string): void {
    const newUsername = username.trim();
    User.assertUsername(newUsername);

    this._username = newUsername;
  }

  changePassword(passwordHash: string): void {
    User.assertPasswordHash(passwordHash);

    this._passwordHash = passwordHash;
  }

  updateProfile(changes: ProfileChanges): void {
    // 1. normalize
    const phoneNumber =
      typeof changes.phoneNumber === 'string'
        ? changes.phoneNumber.replace(/[\s\-().]/g, '')
        : changes.phoneNumber;

    // 2. check the rules of every field that was sent
    if (changes.fullName !== undefined) {
      User.assertMaxLength('fullName', USER_FULL_NAME_MAX_LENGTH, changes.fullName);
    }
    if (phoneNumber !== undefined) {
      User.assertPhoneNumber(phoneNumber);
    }
    if (changes.address !== undefined) {
      User.assertMaxLength('address', USER_ADDRESS_MAX_LENGTH, changes.address);
    }
    if (changes.avatarUrl !== undefined) {
      User.assertAvatarUrl(changes.avatarUrl);
    }
    if (changes.dateOfBirth !== undefined) {
      User.assertDateOfBirth(changes.dateOfBirth);
    }
    if (changes.gender !== undefined) {
      User.assertGender(changes.gender);
    }
    if (changes.bio !== undefined) {
      User.assertMaxLength('bio', USER_BIO_MAX_LENGTH, changes.bio);
    }

    // 3. apply
    if (changes.fullName !== undefined) this._fullName = changes.fullName;
    if (phoneNumber !== undefined) this._phoneNumber = phoneNumber;
    if (changes.address !== undefined) this._address = changes.address;
    if (changes.avatarUrl !== undefined) this._avatarUrl = changes.avatarUrl;
    if (changes.dateOfBirth !== undefined) this._dateOfBirth = changes.dateOfBirth;
    if (changes.gender !== undefined) this._gender = changes.gender;
    if (changes.bio !== undefined) this._bio = changes.bio;
  }

  activate(): void {
    this._isActive = true;
  }

  deactivate(): void {
    this._isActive = false;
  }

  toProps(): UserProps {
    return {
      id: this._id,
      username: this._username,
      email: this._email,
      passwordHash: this._passwordHash,
      role: this._role,
      isActive: this._isActive,
      isEmailVerified: this._isEmailVerified,
      fullName: this._fullName,
      phoneNumber: this._phoneNumber,
      address: this._address,
      avatarUrl: this._avatarUrl,
      dateOfBirth: this._dateOfBirth,
      gender: this._gender,
      bio: this._bio,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private static assertUsername(username: string): void {
    if (username.length < USER_USERNAME_MIN_LENGTH || username.length > USER_USERNAME_MAX_LENGTH) {
      throw new InvalidUserError(
        `username must be ${USER_USERNAME_MIN_LENGTH} to ${USER_USERNAME_MAX_LENGTH} characters`,
      );
    }
    if (!USERNAME_PATTERN.test(username)) {
      throw new InvalidUserError('username may only contain letters, digits, "_" and "."');
    }
  }

  private static assertEmail(email: string): void {
    if (email.length > USER_EMAIL_MAX_LENGTH) {
      throw new InvalidUserError(`email must be at most ${USER_EMAIL_MAX_LENGTH} characters`);
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new InvalidUserError('email is not a valid e-mail address');
    }
  }

  private static assertPasswordHash(passwordHash: string): void {
    if (!passwordHash) {
      throw new InvalidUserError('passwordHash must not be empty');
    }
  }

  private static assertMaxLength(field: string, max: number, value: string | null): void {
    if (value !== null && value.length > max) {
      throw new InvalidUserError(`${field} must be at most ${max} characters`);
    }
  }

  private static assertPhoneNumber(phoneNumber: string | null): void {
    if (phoneNumber !== null && !PHONE_PATTERN.test(phoneNumber)) {
      throw new InvalidUserError('phoneNumber must contain 7 to 15 digits');
    }
  }

  private static assertAvatarUrl(avatarUrl: string | null): void {
    if (avatarUrl === null) return;
    User.assertMaxLength('avatarUrl', USER_AVATAR_URL_MAX_LENGTH, avatarUrl);
    if (!HTTP_URL_PATTERN.test(avatarUrl)) {
      throw new InvalidUserError('avatarUrl must be an http(s) URL');
    }
  }

  private static assertDateOfBirth(dateOfBirth: Date | null): void {
    if (dateOfBirth === null) return;
    if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.getTime() > Date.now()) {
      throw new InvalidUserError('dateOfBirth must be a valid date that is not in the future');
    }
  }

  private static assertGender(gender: Gender | null): void {
    if (gender !== null && !Object.values(Gender).includes(gender)) {
      throw new InvalidUserError(`gender must be one of: ${Object.values(Gender).join(', ')}`);
    }
  }
}

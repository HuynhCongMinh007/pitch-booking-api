import { BaseEntity } from '../../../../shared/domain/entities/base.entity';
import { DomainException } from '../../../../shared/domain/exceptions/domain.exception';
import { Gender } from '../enums/gender.enum';
import { UserRole } from '../enums/user-role.enum';
import { AccountDisabledException, InvalidUserProfileException, } from '../exceptions/user.exception';
import { AvatarUrl } from '../value-objects/avatar-url.vo';
import { Email } from '../value-objects/email.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { Username } from '../value-objects/username.vo';

export interface UserProps {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserProfileProps {
  username?: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
  bio?: string | null;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class UserEntity extends BaseEntity<UserProps, number> {
  private constructor(props: UserProps, id?: number) {
    super(props, id);
  }

  static createPendingRegistration(params: { email: Email; passwordHash: string }): UserEntity {
    const now = new Date();
    const defaultUsername = Username.generateDefaultFromEmail(params.email.value);
    return new UserEntity({
      username: defaultUsername.value,
      email: params.email.value,
      passwordHash: params.passwordHash,
      role: UserRole.CUSTOMER,
      isActive: true,
      isEmailVerified: false,
      fullName: null,
      phoneNumber: null,
      address: null,
      avatarUrl: null,
      dateOfBirth: null,
      gender: null,
      bio: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static createFromGoogle(params: {
    email: Email;
    passwordHash: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  }): UserEntity {
    const now = new Date();
    const defaultUsername = Username.generateDefaultFromEmail(params.email.value);
    return new UserEntity({
      username: defaultUsername.value,
      email: params.email.value,
      passwordHash: params.passwordHash,
      role: UserRole.CUSTOMER,
      isActive: true,
      isEmailVerified: true,
      fullName: params.fullName ?? null,
      avatarUrl: params.avatarUrl ?? null,
      phoneNumber: null,
      address: null,
      dateOfBirth: null,
      gender: null,
      bio: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: UserProps, id: number): UserEntity {
    return new UserEntity({ ...props }, id);
  }

  get username(): string {
    return this.props.username;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isEmailVerified(): boolean {
    return this.props.isEmailVerified;
  }

  get fullName(): string | null {
    return this.props.fullName;
  }

  get phoneNumber(): string | null {
    return this.props.phoneNumber;
  }

  get address(): string | null {
    return this.props.address;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  get dateOfBirth(): Date | null {
    return this.props.dateOfBirth;
  }

  get gender(): Gender | null {
    return this.props.gender;
  }

  get bio(): string | null {
    return this.props.bio;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  ensureActive(): void {
    if (!this.props.isActive) {
      throw new AccountDisabledException();
    }
  }

  ensureEmailVerified(): void {
    if (!this.props.isEmailVerified) {
      throw new DomainException('Please verify your email.', 'EMAIL_NOT_VERIFIED', 403);
    }
  }

  completeRegistration(params: { username: Username; passwordHash: string }): void {
    if (this.props.isEmailVerified) {
      throw new DomainException(
        'Email has already been registered. Please log in.',
        'EMAIL_ALREADY_REGISTERED',
        400,
      );
    }
    this.props.username = params.username.value;
    this.props.passwordHash = params.passwordHash;
    this.props.isActive = true;
    this.props.isEmailVerified = true;
    this.props.updatedAt = new Date();
  }

  activateViaGoogle(params: {
    passwordHash: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  }): void {
    this.props.isActive = true;
    this.props.isEmailVerified = true;
    if (this.props.username.includes('@')) {
      this.props.username = Username.generateDefaultFromEmail(this.props.email).value;
    }
    this.props.passwordHash = params.passwordHash;
    if (!this.props.fullName && params.fullName) {
      this.props.fullName = params.fullName;
    }
    if (!this.props.avatarUrl && params.avatarUrl) {
      this.props.avatarUrl = params.avatarUrl;
    }
    this.props.updatedAt = new Date();
  }

  changePassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash;
    this.props.updatedAt = new Date();
  }

  upgradePasswordHash(upgradedHash: string): void {
    this.props.passwordHash = upgradedHash;
    this.props.updatedAt = new Date();
  }

  updateProfile(changes: UpdateUserProfileProps): boolean {
    let changed = false;

    if (changes.username !== undefined) {
      const nextUsername = Username.create(changes.username).value;
      if (nextUsername !== this.props.username) {
        this.props.username = nextUsername;
        changed = true;
      }
    }

    if (changes.fullName !== undefined) {
      if (changes.fullName !== null && changes.fullName.length > 255) {
        throw new InvalidUserProfileException('full_name must be at most 255 characters');
      }
      if (changes.fullName !== this.props.fullName) {
        this.props.fullName = changes.fullName;
        changed = true;
      }
    }

    if (changes.phoneNumber !== undefined) {
      const nextPhone =
        changes.phoneNumber === null ? null : PhoneNumber.create(changes.phoneNumber).value;
      if (nextPhone !== this.props.phoneNumber) {
        this.props.phoneNumber = nextPhone;
        changed = true;
      }
    }

    if (changes.address !== undefined) {
      if (changes.address !== null && changes.address.length > 255) {
        throw new InvalidUserProfileException('address must be at most 255 characters');
      }
      if (changes.address !== this.props.address) {
        this.props.address = changes.address;
        changed = true;
      }
    }

    if (changes.avatarUrl !== undefined) {
      const nextAvatar =
        changes.avatarUrl === null ? null : AvatarUrl.create(changes.avatarUrl).value;
      if (nextAvatar !== this.props.avatarUrl) {
        this.props.avatarUrl = nextAvatar;
        changed = true;
      }
    }

    if (changes.dateOfBirth !== undefined) {
      if (changes.dateOfBirth !== null) {
        const dobIso = formatIsoDate(changes.dateOfBirth);
        if (dobIso > getTodayIsoDate()) {
          throw new InvalidUserProfileException('date_of_birth cannot be in the future');
        }
      }
      const prevDob = this.props.dateOfBirth ? formatIsoDate(this.props.dateOfBirth) : null;
      const nextDob = changes.dateOfBirth ? formatIsoDate(changes.dateOfBirth) : null;
      if (nextDob !== prevDob) {
        this.props.dateOfBirth = changes.dateOfBirth;
        changed = true;
      }
    }

    if (changes.gender !== undefined) {
      if (changes.gender !== this.props.gender) {
        this.props.gender = changes.gender;
        changed = true;
      }
    }

    if (changes.bio !== undefined) {
      if (changes.bio !== null && changes.bio.length > 1000) {
        throw new InvalidUserProfileException('bio must be at most 1000 characters');
      }
      if (changes.bio !== this.props.bio) {
        this.props.bio = changes.bio;
        changed = true;
      }
    }

    if (changed) {
      this.props.updatedAt = new Date();
    }

    return changed;
  }
}


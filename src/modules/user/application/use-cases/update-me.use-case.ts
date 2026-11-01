import { Injectable } from '@nestjs/common';

import { ProfileChanges, User } from '../../domain/entities/user.entity';
import { UsernameAlreadyTakenError, UserNotFoundError } from '../../domain/errors/user.errors';
import { UserRepository } from '../../domain/repositories/user.repository';
import { AccountDisabledError } from '../errors/user.errors';

export interface UpdateMeInput extends ProfileChanges {
  userId: number;
  username?: string;
}

/** PATCH /users/me */
@Injectable()
export class UpdateMeUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UpdateMeInput): Promise<User> {
    const { userId, username, ...profile } = input;

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    if (!user.isActive) throw new AccountDisabledError();

    const isUsernameChanged = username !== undefined && username.trim() !== user.username;
    const isProfileChanged = Object.values(profile).some((value) => value !== undefined);
    if (!isUsernameChanged && !isProfileChanged) return user;

    if (isUsernameChanged) {
      const owner = await this.userRepository.findByUsername(username);
      if (owner && owner.id !== user.id) throw new UsernameAlreadyTakenError();
      user.changeUsername(username);
    }
    user.updateProfile(profile);

    return this.userRepository.update(user);
  }
}

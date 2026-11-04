import { Inject, Injectable } from '@nestjs/common';

import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import { DuplicateEntityException } from '../../../../shared/domain/exceptions/duplicate-entity.exception';
import type { UserEntity } from '../../domain/entities/user.entity';
import type { Gender } from '../../domain/enums/gender.enum';
import {
  UserNotFoundException,
  UsernameAlreadyTakenException,
} from '../../domain/exceptions/user.exception';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';

export interface UpdateMeInput {
  userId: number;
  changes: {
    username?: string;
    fullName?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
    dateOfBirth?: Date | null;
    gender?: Gender | null;
    bio?: string | null;
  };
}

@Injectable()
export class UpdateMeUseCase implements IUseCase<UpdateMeInput, UserEntity> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: UpdateMeInput): Promise<UserEntity> {
    if (!Number.isInteger(input.userId) || input.userId <= 0) {
      throw new UserNotFoundException();
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException();
    }
    user.ensureActive();

    const changes = { ...input.changes };
    if (Object.keys(changes).length === 0) {
      return user;
    }

    if (changes.username !== undefined) {
      if (changes.username === user.username) {
        delete changes.username;
      } else {
        const existingUser = await this.userRepository.findByUsername(changes.username);
        if (existingUser && existingUser.id !== user.id) {
          throw new UsernameAlreadyTakenException();
        }
      }
    }

    const changed = user.updateProfile(changes);
    if (!changed) {
      return user;
    }

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof DuplicateEntityException) {
        throw new UsernameAlreadyTakenException();
      }
      throw error;
    }
  }
}

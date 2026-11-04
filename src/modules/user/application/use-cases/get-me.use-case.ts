import { Inject, Injectable } from '@nestjs/common';

import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import type { UserEntity } from '../../domain/entities/user.entity';
import { UserNotFoundException } from '../../domain/exceptions/user.exception';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';

export interface GetMeInput {
  userId: number;
}

@Injectable()
export class GetMeUseCase implements IUseCase<GetMeInput, UserEntity> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: GetMeInput): Promise<UserEntity> {
    if (!Number.isInteger(input.userId) || input.userId <= 0) {
      throw new UserNotFoundException();
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    user.ensureActive();
    return user;
  }
}

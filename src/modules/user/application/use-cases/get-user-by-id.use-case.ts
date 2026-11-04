import { Inject, Injectable } from '@nestjs/common';

import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import type { UserEntity } from '../../domain/entities/user.entity';
import { UserNotFoundException } from '../../domain/exceptions/user.exception';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';

export interface GetUserByIdInput {
  userId: number;
}

@Injectable()
export class GetUserByIdUseCase implements IUseCase<GetUserByIdInput, UserEntity> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: GetUserByIdInput): Promise<UserEntity> {
    if (!Number.isInteger(input.userId) || input.userId <= 0) {
      throw new UserNotFoundException();
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user || !user.isActive) {
      throw new UserNotFoundException();
    }

    return user;
  }
}

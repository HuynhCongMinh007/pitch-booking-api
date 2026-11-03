import { Inject, Injectable } from '@nestjs/common';

import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import { UserNotFoundException } from '../../domain/exceptions/user.exception';
import { type IUserRepository, USER_REPOSITORY, } from '../../domain/repositories/user.repository.interface';
import { type MeResponseDto, mapUserToMeDto } from '../dtos/user.dto';

@Injectable()
export class GetMeUseCase implements IUseCase<{ userId: number }, MeResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) { }

  async execute(input: { userId: number }): Promise<MeResponseDto> {
    if (!Number.isInteger(input.userId) || input.userId <= 0) {
      throw new UserNotFoundException();
    }

    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    user.ensureActive();
    return mapUserToMeDto(user);
  }
}


import { Module } from '@nestjs/common';

import { GetMeUseCase } from './application/use-cases/get-me.use-case';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { UpdateMeUseCase } from './application/use-cases/update-me.use-case';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { PrismaUserRepository } from './infrastructure/persistence/user.repository';
import { UserController } from './presentation/controllers/user.controller';

@Module({
  controllers: [UserController],
  providers: [
    GetMeUseCase,
    UpdateMeUseCase,
    GetUserByIdUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule {}


import type { IRepository } from '../../../../shared/domain/repositories/repository.interface';
import type { UserEntity } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository extends IRepository<UserEntity, number> {
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findByEmailOrUsername(identifier: string): Promise<UserEntity | null>;
}


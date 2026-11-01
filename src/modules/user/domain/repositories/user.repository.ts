import { User } from '../entities/user.entity';

export abstract class UserRepository {
  abstract findById(id: number): Promise<User | null>;

  abstract findByEmail(email: string): Promise<User | null>;

  abstract findByUsername(username: string): Promise<User | null>;

  abstract findByEmailOrUsername(identifier: string): Promise<User | null>;

  abstract create(user: User): Promise<User>;

  abstract update(user: User): Promise<User>;
}

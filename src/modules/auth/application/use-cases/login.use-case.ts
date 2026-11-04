import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import {
  type IUnitOfWork,
  UNIT_OF_WORK,
} from '../../../../shared/application/ports/unit-of-work.interface';
import type { IUseCase } from '../../../../shared/application/use-cases/use-case.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../user/domain/repositories/user.repository.interface';
import { InvalidCredentialsException } from '../../domain/exceptions/auth.exception';
import { type IPasswordHasher, PASSWORD_HASHER } from '../ports/password-hasher.interface';
import { type IssuedTokenPair, TokenIssuerService } from '../services/token-issuer.service';

export interface LoginInput {
  username: string;
  password: string;
}

@Injectable()
export class LoginUseCase implements IUseCase<LoginInput, IssuedTokenPair> {
  private dummyPasswordHashPromise: Promise<string> | null = null;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly tokenIssuerService: TokenIssuerService,
  ) {}

  async execute(input: LoginInput): Promise<IssuedTokenPair> {
    const user = await this.userRepository.findByEmailOrUsername(input.username);
    const passwordHash = user ? user.passwordHash : await this.getDummyPasswordHash();

    const { valid, upgradedHash } = await this.passwordHasher.verifyAndUpdate(
      input.password,
      passwordHash,
    );

    if (!user || user.id === undefined || !valid) {
      throw new InvalidCredentialsException();
    }

    user.ensureActive();
    user.ensureEmailVerified();

    return this.unitOfWork.execute(async () => {
      if (upgradedHash) {
        user.upgradePasswordHash(upgradedHash);
        await this.userRepository.save(user);
      }
      return this.tokenIssuerService.issueTokens(user.id!);
    });
  }

  private getDummyPasswordHash(): Promise<string> {
    if (!this.dummyPasswordHashPromise) {
      this.dummyPasswordHashPromise = this.passwordHasher.hash(randomUUID().replace(/-/g, ''));
    }
    return this.dummyPasswordHashPromise;
  }
}

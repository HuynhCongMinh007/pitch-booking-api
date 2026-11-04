import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { IUnitOfWork } from '../../application/ports/unit-of-work.interface';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  private readonly txStorage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  get client(): PrismaService | Prisma.TransactionClient {
    return this.txStorage.getStore() ?? this.prisma;
  }

  async execute<T>(work: () => Promise<T>): Promise<T> {
    if (this.txStorage.getStore()) {
      return work();
    }
    return this.prisma.$transaction((tx) => this.txStorage.run(tx, work));
  }
}

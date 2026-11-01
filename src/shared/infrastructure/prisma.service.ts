import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { settings } from './config';

// Kept here so existing imports (`../core/prisma.service`) keep working
export { isIntegrityError } from './prisma-errors';

/** The PrismaService itself, or the `tx` client inside prisma.$transaction(). */
export type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Single PrismaClient for the whole app (Nest providers are singletons).
 * The connection pool lives inside the client; tune it in DATABASE_URL,
 * e.g. `?connection_limit=10&pool_timeout=20`.
 */
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({ datasourceUrl: settings.DATABASE_URL });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

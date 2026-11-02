import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env if not loaded yet
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_TEST_DB_URL =
  'postgresql://postgres:postgres@localhost:5432/pitchbooking_test';

export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DB_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL environment variable is not defined.');
  }
  return url;
}

let testPrismaClient: PrismaClient | null = null;

export function getTestPrismaClient(): PrismaClient {
  if (!testPrismaClient) {
    testPrismaClient = new PrismaClient({
      datasources: {
        db: {
          url: getTestDatabaseUrl(),
        },
      },
    });
  }
  return testPrismaClient;
}

/**
 * Truncate all application tables to ensure isolated test runs.
 */
export async function truncateTestDatabase(prisma?: PrismaClient): Promise<void> {
  const client = prisma || getTestPrismaClient();
  await client.$executeRawUnsafe(`
    TRUNCATE TABLE "email_otps", "refresh_tokens", "users" CASCADE;
  `);
}

/**
 * Disconnect the test Prisma client.
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testPrismaClient) {
    await testPrismaClient.$disconnect();
    testPrismaClient = null;
  }
}

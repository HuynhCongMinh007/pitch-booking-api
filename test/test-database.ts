// Shared by test/setup-env.js and scripts/create-test-db.js
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const TEST_DB_NAME = process.env.TEST_DB_NAME || 'pitchbooking_test';

/** TEST_DATABASE_URL, or DATABASE_URL with the database name replaced by TEST_DB_NAME. */
export function getTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const devUrl = (
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pitchbooking'
  ).replace('postgresql+asyncpg://', 'postgresql://');
  const url = new URL(devUrl);
  url.pathname = `/${TEST_DB_NAME}`;
  return url.toString();
}

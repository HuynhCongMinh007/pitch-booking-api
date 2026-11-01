// Runs before every test file: point the app at the test database (never dev/prod)
import { getTestDatabaseUrl, TEST_DB_NAME } from './test-database';

const testDatabaseUrl = getTestDatabaseUrl();
const databaseName = new URL(testDatabaseUrl).pathname.slice(1);
if (databaseName !== TEST_DB_NAME) {
  throw new Error(
    `SAFETY ERROR: tests would use database '${databaseName}', expected test database '${TEST_DB_NAME}'!`,
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.SECRET_KEY = process.env.SECRET_KEY || 'test-secret-key';

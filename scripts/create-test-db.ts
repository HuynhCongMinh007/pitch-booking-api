/**
 * Create the test database (pitchbooking_test) if needed and apply all Prisma migrations.
 * Run it whenever you set up a fresh environment or add new migrations:
 *     npm run test:db
 */
import { execSync } from 'node:child_process';

import { getTestDatabaseUrl } from '../test/support/test-database';

const testDatabaseUrl = getTestDatabaseUrl();
console.log(
  `Applying migrations to test database ${new URL(testDatabaseUrl).pathname.slice(1)}...`,
);

// `prisma migrate deploy` creates the database when it does not exist yet
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: testDatabaseUrl },
});

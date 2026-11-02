import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Force test environment
process.env.NODE_ENV = 'test';

// Direct Prisma and DB connections to the test database
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// Ensure test secrets are present
process.env.SECRET_KEY = process.env.SECRET_KEY || 'test-secret-key-pitchbooking-be-jwt';
process.env.OTP_SECRET_KEY = process.env.OTP_SECRET_KEY || 'test-otp-secret-key-pitchbooking-be';

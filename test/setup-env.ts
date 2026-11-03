import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';

import { getTestDatabaseUrl } from './support/test-database';

// Load environment variables from project root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Force test environment
process.env.NODE_ENV = 'test';

// Direct Prisma and DB connections to the test database (never touch dev DB)
process.env.DATABASE_URL = getTestDatabaseUrl();

// Ensure test secrets are present
process.env.SECRET_KEY = process.env.SECRET_KEY || 'test-secret-key-pitchbooking-be-jwt';
process.env.OTP_SECRET_KEY = process.env.OTP_SECRET_KEY || 'test-otp-secret-key-pitchbooking-be';

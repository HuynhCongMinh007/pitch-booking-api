import { Gender, OtpPurpose, PrismaClient, UserRole } from '@prisma/client';
import {
  disconnectTestDatabase,
  getTestPrismaClient,
  truncateTestDatabase,
} from '../support/test-database';
import { createUserFixture } from '../support/fixtures/user.fixture';

describe('Database Integration Test (pitchbooking_test)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = getTestPrismaClient();
  });

  beforeEach(async () => {
    await truncateTestDatabase(prisma);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('should create a user in pitchbooking_test with default UserRole.CUSTOMER and Gender', async () => {
    const user = await createUserFixture(prisma, {
      username: 'john_doe',
      email: 'john@example.com',
      gender: Gender.MALE,
    });

    expect(user.id).toBeDefined();
    expect(user.username).toBe('john_doe');
    expect(user.role).toBe(UserRole.CUSTOMER);
    expect(user.gender).toBe(Gender.MALE);

    const found = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(found).not.toBeNull();
    expect(found?.email).toBe('john@example.com');
    expect(found?.role).toBe(UserRole.CUSTOMER);
    expect(found?.gender).toBe(Gender.MALE);
  });

  it('should create users with UserRole.PITCH_OWNER and UserRole.PITCH_STAFF', async () => {
    const owner = await createUserFixture(prisma, {
      username: 'stadium_owner',
      email: 'owner@pitch.com',
      role: UserRole.PITCH_OWNER,
    });
    expect(owner.role).toBe(UserRole.PITCH_OWNER);

    const staff = await createUserFixture(prisma, {
      username: 'stadium_staff',
      email: 'staff@pitch.com',
      role: UserRole.PITCH_STAFF,
      gender: Gender.FEMALE,
    });
    expect(staff.role).toBe(UserRole.PITCH_STAFF);
    expect(staff.gender).toBe(Gender.FEMALE);
  });

  it('should create email_otp with OtpPurpose.REGISTER and RESET_PASSWORD', async () => {
    const user = await createUserFixture(prisma);

    const otp = await prisma.emailOtp.create({
      data: {
        user_id: user.id,
        code_hash: 'hashed_otp_123456',
        purpose: OtpPurpose.REGISTER,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    expect(otp.id).toBeDefined();
    expect(otp.purpose).toBe(OtpPurpose.REGISTER);
    expect(otp.user_id).toBe(user.id);
  });
});

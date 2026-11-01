-- Databases created by the old Python/Alembic backend have no DEFAULT on these columns
-- (SQLAlchemy filled them in the app). Add them so the schema matches schema.prisma.
-- On a database created from 0_init this changes nothing.

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer',
ALTER COLUMN "is_active" SET DEFAULT true;

ALTER TABLE "refresh_tokens" ALTER COLUMN "revoked" SET DEFAULT false;

ALTER TABLE "email_otps" ALTER COLUMN "attempts" SET DEFAULT 0;

ALTER TABLE "teams" ALTER COLUMN "is_active" SET DEFAULT true;

ALTER TABLE "team_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER',
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "team_member_positions" ALTER COLUMN "is_primary" SET DEFAULT false;

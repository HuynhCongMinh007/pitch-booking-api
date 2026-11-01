-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'customer',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "full_name" VARCHAR(255),
    "phone_number" VARCHAR(20),
    "address" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "bio" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_otps" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" SERIAL NOT NULL,
    "sport_type" VARCHAR(20) NOT NULL DEFAULT 'FOOTBALL',
    "pitch_type" VARCHAR(20) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "avatar_url" VARCHAR(255),
    "created_by_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_positions" (
    "team_member_id" INTEGER NOT NULL,
    "position_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "team_member_positions_pkey" PRIMARY KEY ("team_member_id","position_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ix_users_username" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ix_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "ix_users_phone_number" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "ix_refresh_tokens_token_hash" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "ix_refresh_tokens_user_id" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "ix_email_otps_purpose" ON "email_otps"("purpose");

-- CreateIndex
CREATE INDEX "ix_email_otps_user_id" ON "email_otps"("user_id");

-- CreateIndex
CREATE INDEX "ix_positions_code" ON "positions"("code");

-- CreateIndex
CREATE INDEX "ix_positions_pitch_type" ON "positions"("pitch_type");

-- CreateIndex
CREATE INDEX "ix_positions_sport_type" ON "positions"("sport_type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_positions_sport_pitch_code" ON "positions"("sport_type", "pitch_type", "code");

-- CreateIndex
CREATE INDEX "ix_teams_created_by_id" ON "teams"("created_by_id");

-- CreateIndex
CREATE INDEX "ix_teams_name" ON "teams"("name");

-- CreateIndex
CREATE INDEX "ix_team_members_team_id" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "ix_team_members_user_id" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_team_members_team_user" ON "team_members"("team_id", "user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_member_positions" ADD CONSTRAINT "team_member_positions_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_member_positions" ADD CONSTRAINT "team_member_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- CreateIndex (partial unique index: only one LEADER per team; not expressible in schema.prisma)
CREATE UNIQUE INDEX "uq_team_leader" ON "team_members"("team_id") WHERE role = 'LEADER';

-- Seed default positions (same data as the original Alembic migration)
INSERT INTO "positions" ("sport_type", "pitch_type", "code", "name", "description") VALUES
    -- Sân 5 (Futsal / Phủi sân 5)
    ('FOOTBALL', 'PITCH_5', 'GK', 'Thủ môn', 'Goalkeeper sân 5'),
    ('FOOTBALL', 'PITCH_5', 'FIXO', 'Thòng / Fixo', 'Hậu vệ thòng / Fixo'),
    ('FOOTBALL', 'PITCH_5', 'ALA_L', 'Ala trái', 'Tiền vệ cánh trái sân 5'),
    ('FOOTBALL', 'PITCH_5', 'ALA_R', 'Ala phải', 'Tiền vệ cánh phải sân 5'),
    ('FOOTBALL', 'PITCH_5', 'PIVOT', 'Cắm / Pivot', 'Tiền đạo cắm sân 5'),
    -- Sân 7 (Phủi sân 7)
    ('FOOTBALL', 'PITCH_7', 'GK', 'Thủ môn', 'Thủ môn sân 7'),
    ('FOOTBALL', 'PITCH_7', 'THONG', 'Hậu vệ thòng', 'Hậu vệ quét / trung vệ thòng sân 7'),
    ('FOOTBALL', 'PITCH_7', 'CANH_L', 'Cánh trái', 'Hậu vệ / Tiền vệ cánh trái sân 7'),
    ('FOOTBALL', 'PITCH_7', 'CANH_R', 'Cánh phải', 'Hậu vệ / Tiền vệ cánh phải sân 7'),
    ('FOOTBALL', 'PITCH_7', 'GIUA', 'Tiền vệ giữa', 'Tiền vệ trung tâm điều tiết sân 7'),
    ('FOOTBALL', 'PITCH_7', 'CAM', 'Tiền đạo cắm', 'Tiền đạo mục tiêu sân 7'),
    -- Sân 11
    ('FOOTBALL', 'PITCH_11', 'GK', 'Thủ môn', 'Goalkeeper'),
    ('FOOTBALL', 'PITCH_11', 'CB', 'Trung vệ', 'Center Back'),
    ('FOOTBALL', 'PITCH_11', 'LB', 'Hậu vệ cánh trái', 'Left Back'),
    ('FOOTBALL', 'PITCH_11', 'RB', 'Hậu vệ cánh phải', 'Right Back'),
    ('FOOTBALL', 'PITCH_11', 'CDM', 'Tiền vệ phòng ngự', 'Defensive Midfielder'),
    ('FOOTBALL', 'PITCH_11', 'CM', 'Tiền vệ trung tâm', 'Central Midfielder'),
    ('FOOTBALL', 'PITCH_11', 'CAM', 'Tiền vệ tấn công', 'Attacking Midfielder'),
    ('FOOTBALL', 'PITCH_11', 'ST', 'Tiền đạo cắm', 'Striker'),
    ('FOOTBALL', 'PITCH_11', 'LW', 'Tiền đạo cánh trái', 'Left Winger'),
    ('FOOTBALL', 'PITCH_11', 'RW', 'Tiền đạo cánh phải', 'Right Winger');

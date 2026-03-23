-- EMP-1: Upgrade recruiter_profiles as employer table (non-destructive)
-- Adds surrogate primary key while preserving existing user_id relationship semantics.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Add new surrogate key column.
ALTER TABLE "recruiter_profiles"
  ADD COLUMN IF NOT EXISTS "id" UUID;

ALTER TABLE "recruiter_profiles"
  ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

UPDATE "recruiter_profiles"
SET "id" = uuid_generate_v4()
WHERE "id" IS NULL;

ALTER TABLE "recruiter_profiles"
  ALTER COLUMN "id" SET NOT NULL;

-- 2) Keep user_id as unique for 1:1 with users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recruiter_profiles_user_id_key'
      AND conrelid = 'recruiter_profiles'::regclass
  ) THEN
    ALTER TABLE "recruiter_profiles"
      ADD CONSTRAINT "recruiter_profiles_user_id_key" UNIQUE ("user_id");
  END IF;
END $$;

-- 3) Move primary key from user_id to id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recruiter_profiles_pkey'
      AND conrelid = 'recruiter_profiles'::regclass
  ) THEN
    ALTER TABLE "recruiter_profiles" DROP CONSTRAINT "recruiter_profiles_pkey";
  END IF;
END $$;

ALTER TABLE "recruiter_profiles"
  ADD CONSTRAINT "recruiter_profiles_pkey" PRIMARY KEY ("id");

-- 4) Add employer business fields.
ALTER TABLE "recruiter_profiles"
  ADD COLUMN IF NOT EXISTS "company_email" VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recruiter_profiles_company_email_key'
      AND conrelid = 'recruiter_profiles'::regclass
  ) THEN
    ALTER TABLE "recruiter_profiles"
      ADD CONSTRAINT "recruiter_profiles_company_email_key" UNIQUE ("company_email");
  END IF;
END $$;

ALTER TABLE "recruiter_profiles"
  ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false;

-- 5) Tighten timestamps for Prisma @updatedAt compatibility.
ALTER TABLE "recruiter_profiles"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "recruiter_profiles"
SET "created_at" = CURRENT_TIMESTAMP
WHERE "created_at" IS NULL;

ALTER TABLE "recruiter_profiles"
  ALTER COLUMN "created_at" SET NOT NULL;

ALTER TABLE "recruiter_profiles"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "recruiter_profiles"
SET "updated_at" = CURRENT_TIMESTAMP
WHERE "updated_at" IS NULL;

ALTER TABLE "recruiter_profiles"
  ALTER COLUMN "updated_at" SET NOT NULL;

-- Add OAuth support fields to users

DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('local', 'google', 'github', 'linkedin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "auth_provider" auth_provider NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS "google_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "github_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "linkedin_id" VARCHAR(255);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_google_id_key'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_google_id_key" UNIQUE ("google_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_github_id_key'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_github_id_key" UNIQUE ("github_id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_linkedin_id_key'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_linkedin_id_key" UNIQUE ("linkedin_id");
  END IF;
END $$;


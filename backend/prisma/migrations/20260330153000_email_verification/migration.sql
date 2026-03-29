-- Add OAuth email verification fields
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "email_verification_token" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "email_verification_expires" TIMESTAMPTZ(6);

-- Backward-compatibility: existing verified accounts remain usable
UPDATE "users"
SET "email_verified" = TRUE
WHERE "is_verified" = TRUE;

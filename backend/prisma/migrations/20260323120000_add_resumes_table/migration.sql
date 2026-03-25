-- RES-1: resumes table (S3 URL + metadata, multiple per user, optional default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "resumes" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "file_url" VARCHAR(500) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_size" INTEGER,
  "mime_type" VARCHAR(100),
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_resumes_user" ON "resumes" ("user_id");

ALTER TABLE "resumes"
  ADD CONSTRAINT "resumes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

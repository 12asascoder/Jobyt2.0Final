-- At most one default resume per user (race-safe with transactional updates + INSERT)
CREATE UNIQUE INDEX IF NOT EXISTS "unique_default_resume_per_user"
  ON "resumes" ("user_id")
  WHERE "is_default" = TRUE;

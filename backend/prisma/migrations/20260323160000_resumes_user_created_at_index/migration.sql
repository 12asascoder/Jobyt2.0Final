-- RES-4: resume retrieval performance
-- Optimizes listing resumes by most-recent-first.

CREATE INDEX IF NOT EXISTS "idx_resumes_user_created_at"
  ON "resumes" ("user_id", "created_at" DESC);


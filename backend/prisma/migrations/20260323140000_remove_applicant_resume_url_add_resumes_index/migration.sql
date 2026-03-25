-- Normalize resumes: drop duplicate resume_url on applicant_profiles; optimize resumes index
ALTER TABLE "applicant_profiles" DROP COLUMN IF EXISTS "resume_url";

DROP INDEX IF EXISTS "idx_resumes_user";

CREATE INDEX "idx_resumes_user_default" ON "resumes" ("user_id", "is_default");

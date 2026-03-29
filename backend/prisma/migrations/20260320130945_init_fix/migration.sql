-- AlterTable
DO $$ BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'jobs'
			AND column_name = 'search_vector'
			AND is_generated = 'NEVER'
	) THEN
		ALTER TABLE "jobs" ALTER COLUMN "search_vector" DROP DEFAULT;
	END IF;
END $$;

-- AlterTable
ALTER TABLE "recruiter_profiles" ALTER COLUMN "updated_at" DROP DEFAULT;

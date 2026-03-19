# Backend Work Log (EMP-1: recruiter_profiles Upgrade)

## 1) What was analyzed before changing schema

I reviewed backend source usage and Prisma schema to avoid breaking existing flows.

- User system:
  - `users` is the identity table with roles: `applicant`, `recruiter`, `admin`.
  - `jobs.recruiter_id` references `users.id`.
- Employer representation:
  - `recruiter_profiles` is already the employer table in this project.
  - Existing logic uses a 1:1 link with `users` through `recruiter_profiles.user_id`.
- Current dependencies:
  - Most backend modules use raw SQL joins like `recruiter_profiles.user_id = jobs.recruiter_id`.
  - Prisma usage for recruiter profile checks exists in `employerGuard`.

## 2) Why we upgraded recruiter_profiles (and did not create employers)

Creating a new `employers` table would duplicate data and force a broad refactor across auth, jobs,
applications, analytics, and profile APIs.

Instead, we upgraded `recruiter_profiles` in place so:

1. Existing SQL joins remain valid.
2. Existing foreign key paths remain valid.
3. Current recruiter APIs keep working without changing endpoint contracts.

## 3) Prisma schema changes made

Updated `prisma/schema.prisma` model: `recruiter_profiles`

1. Added `id` as a new UUID primary key.
2. Kept `user_id` and made it `@unique` to preserve 1:1 with `users`.
3. Added `company_email` as optional + unique.
4. Added `is_verified` as boolean with default `false`.
5. Updated `updated_at` to Prisma-managed `@updatedAt`.
6. Kept relation to `users` via `user_id` unchanged.

## 4) Migration approach and safety

Created migration:

- `prisma/migrations/202603190001_upgrade_recruiter_profiles_employer_fields/migration.sql`

Migration is non-destructive:

1. Adds new columns (`id`, `company_email`, `is_verified`) without dropping table/data.
2. Backfills `id` for existing rows before making it NOT NULL.
3. Moves primary key from `user_id` to `id` safely.
4. Preserves uniqueness of `user_id` for existing relation logic.
5. Adds unique constraint for `company_email`.
6. Normalizes timestamp nullability/defaults for compatibility with Prisma `@updatedAt`.

## 5) Backward compatibility impact

No existing recruiter/job relation path was changed:

- `jobs.recruiter_id` still points to `users.id`.
- `recruiter_profiles.user_id` still points to `users.id`.
- Existing SQL joins on `user_id` continue to work.

This means future employer modules can use the new `recruiter_profiles.id` as a stable internal identifier,
while old modules continue using `user_id` safely.

## 6) Validation summary

1. Prisma schema validation passed.
2. Prisma client generation passed.
3. TypeScript compile check passed (`tsc --noEmit`).
4. Backend startup path remains intact; local run showed expected infra issues only (`Redis unavailable`, `port 5000 already in use`), not schema/type failures.

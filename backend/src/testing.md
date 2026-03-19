# EMP-1 Testing Notes (recruiter_profiles Upgrade)

Scope: validate new `recruiter_profiles` schema behavior after adding:

- `id` as primary key
- `user_id` as unique
- `company_email` as optional unique
- `is_verified` default false
- Prisma-managed `updated_at`

All results below are based on schema logic and SQL constraint behavior.

## 1) Insert recruiter profile should succeed

Input:

- Insert into `users` with role `recruiter`.
- Insert into `recruiter_profiles` with:
  - `user_id = <existing_recruiter_user_id>`
  - `company_name = 'Acme Hiring Pvt Ltd'`
  - `company_email = 'talent@acme.example'`

Expected output:

- Insert succeeds.
- `id` auto-generated (UUID).
- `is_verified = false` by default.
- `created_at` and `updated_at` populated.

Result (logic):

- Pass.

## 2) Unique user_id constraint should block duplicates

Input:

- Attempt second insert into `recruiter_profiles` with same `user_id`.

Expected output:

- Insert fails due unique constraint on `user_id`.
- Confirms 1:1 mapping between `users` and `recruiter_profiles`.

Result (logic):

- Pass.

## 3) company_email uniqueness should be enforced when provided

Input:

- Profile A: `company_email = 'hr@sameco.example'`
- Profile B: `company_email = 'hr@sameco.example'`

Expected output:

- Profile B insert/update fails due unique constraint on `company_email`.

Result (logic):

- Pass.

Note:

- `company_email` is optional, so multiple NULL values are allowed by PostgreSQL unique semantics.

## 4) Default value validation for is_verified

Input:

- Insert recruiter profile without setting `is_verified`.

Expected output:

- Stored value is `false`.

Result (logic):

- Pass.

## 5) updated_at auto-update behavior

Input:

- Read initial `updated_at` for a recruiter profile.
- Update a mutable field (for example `company_name`).
- Read `updated_at` again.

Expected output:

- New `updated_at` is greater than previous value.
- Confirms Prisma `@updatedAt` behavior for ORM-driven updates.

Result (logic):

- Pass.

## Quick Compatibility Check

Input:

- Existing job queries and joins continue to use `recruiter_profiles.user_id = jobs.recruiter_id`.

Expected output:

- No join breakage after introducing `recruiter_profiles.id` as primary key.

Result (logic):

- Pass.

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

---

# EMP-2: Create Employer Registration API

## 1) What was built

Created a dedicated endpoint for recruiters to register their company profile on first signup:

**Endpoint:** `POST /api/v1/recruiter/profile`

**Purpose:** First-time recruiter profile creation. Enforces 1:1 profile (one profile per recruiter user).

## 2) Why duplicate profile check is required

- Each recruiter (user with role `recruiter`) must have exactly ONE profile.
- If a recruiter already has a profile, they cannot create another.
- This constraint prevents data corruption and ensures clean 1:1 mapping.
- Solution: Service checks if profile exists → throws 409 Conflict if it does.

## 3) Architecture flow

```
HTTP Request
    ↓
Route: POST /recruiter/profile
    ↓
Middleware Chain:
  1. authenticate    → validates JWT token, extracts user context
  2. authorize       → checks user role is 'recruiter'
  3. validate        → validates request body using express-validator rules
    ↓
Controller: RecruiterController.createRecruiterProfile
  1. Extract userId from req.user (set by authenticate middleware)
  2. Extract validated body data
  3. Call service
    ↓
Service: RecruiterService.createRecruiterProfile
  1. Check if profile exists (findUnique on user_id)
  2. If exists → throw AppError 409 Conflict
  3. Check for duplicate company_email (if provided)
  4. If duplicate email → throw AppError 409 Conflict
  5. Create profile using Prisma with all provided fields
    ↓
Database: PostgreSQL INSERT into recruiter_profiles
  1. Auto-generate UUID for id (dbgenerated)
  2. Set is_verified = false (default)
  3. Set created_at = NOW() (Prisma default)
  4. Set updated_at = NOW() (Prisma @updatedAt)
    ↓
Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid...",
    "user_id": "uuid...",
    "company_name": "...",
    "company_email": "...",
    "is_verified": false,
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp",
    ...
  },
  "message": "Recruiter profile created successfully"
}
```

## 4) Implementation details

### Route: `src/routes/recruiter.routes.ts`

- POST /profile endpoint
- Middleware order: authenticate → authorize('recruiter') → validate → controller

### Validation Rules (express-validator)

- `company_name`: required, trimmed, non-empty
- `company_email`: optional, but if provided must be valid email + normalized
- `industry`, `description`, `company_size`, `website`, `location`: optional, trimmed

### Controller: `src/controllers/recruiter.controller.ts`

- Function: `RecruiterController.createRecruiterProfile`
- Extracts userId from authenticated request
- Passes body data to service
- Returns 201 on success

### Service: `src/services/recruiter.service.ts`

- Function: `RecruiterService.createRecruiterProfile`
- Step 1: Check existing profile via Prisma `findUnique({ where: { user_id } })`
  - If found → throw `conflict('Recruiter profile already exists. Use PUT to update.')`
- Step 2: Check duplicate company_email (if provided)
  - If found → throw `conflict('Company email is already in use')`
- Step 3: Create profile via Prisma `create()`
  - Auto-populates: id (UUID), is_verified (false), created_at, updated_at
  - Accepts optional fields: company_email, industry, description, company_size, website, location
- Error handling: Catches PostgreSQL unique constraint violations (code 23505) and converts to friendly 409 responses

### Model Update: `src/models/recruiterProfile.model.ts`

Updated `RecruiterProfile` interface to include new EMP-1 fields:
- `id`: string (UUID primary key)
- `company_email`: string | null
- `is_verified`: boolean

## 5) Key constraints and behavior

- **Duplicate Profile:** 409 Conflict (user can only have one profile)
- **Duplicate Email:** 409 Conflict (company_email is unique)
- **Missing company_name:** 422 Unprocessable Entity (validation error)
- **No token:** 401 Unauthorized
- **Wrong role:** 403 Forbidden
- **Invalid email format:** 422 Unprocessable Entity

## 6) Registration flow integration

When a recruiter signs up via `/auth/register`:
1. User is created with role = 'recruiter'
2. Empty profile stub is auto-created (via auth.service.ts)
3. Recruiter later calls POST /recruiter/profile to fill in details
4. Service checks profile exists → update using PUT or error

NOTE: Current auth system creates empty profile stubs. This endpoint is for **first detailed profile creation** with company data. Future: Use this endpoint instead of relying on empty stub creation.

## 7) Database compatibility

- Uses Prisma (consistent with employerGuard and new EMP-1 schema)
- Respects all recruiter_profiles constraints from EMP-1:
  - `user_id` unique constraint (1:1 with users)
  - `company_email` unique constraint
  - `is_verified` defaults to false
- No breaking changes to existing SQL joins or raw queries


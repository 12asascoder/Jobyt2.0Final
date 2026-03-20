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

---

# EMP-3: Implement Employer Profile API (GET)

## 1) What was built

Created a read-only endpoint for recruiters to fetch their company profile:

**Endpoint:** `GET /api/v1/recruiter/profile`

**Purpose:** Retrieve authenticated recruiter's profile data. Profile data is pre-loaded by employerGuard middleware.

## 2) Why employerGuard is used instead of querying DB again

- `employerGuard` middleware is a reusable, efficient pattern already implemented
- It validates authentication, checks recruiter role, and loads profile in one step
- Avoids duplicate database queries across multiple endpoints
- Profile is attached to `req.employer` for controller use
- Improves code reusability and consistency across recruiter routes

## 3) Architecture flow

```
HTTP Request
    ↓
Route: GET /recruiter/profile
    ↓
Middleware Chain:
  1. authenticate           → validates JWT token, extracts user context (userId, role)
  2. authorize('recruiter') → checks user role is 'recruiter'
  3. employerGuard          → verifies recruiter role again + loads profile into req.employer
    ↓
Controller: RecruiterController.getRecruiterProfile
  1. Read profile from req.employer (already loaded, no DB query)
  2. Return success response with profile
    ↓
Response: 200 OK
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
  "message": "Recruiter profile fetched successfully"
}
```

## 4) Implementation details

### Route: `src/routes/recruiter.routes.ts`

- GET /profile endpoint
- Middleware order: authenticate → authorize('recruiter') → employerGuard → controller
- No body validation needed (GET request, no body payload)

### Controller: `src/controllers/recruiter.controller.ts`

- Function: `RecruiterController.getRecruiterProfile`
- Reads `req.employer` (pre-loaded by employerGuard)
- No database queries in controller
- Returns 200 with SendSuccess helper

### Why NO service layer for GET

- Profile is already loaded by employerGuard middleware
- No business logic needed beyond returning the data
- Keeps code simple and maintainable
- Follows DRY principle (Don't Repeat Yourself)

## 5) Key error handling (handled by middleware, NOT controller)

- **No token:** 401 Unauthorized (authenticate middleware)
- **Wrong role (applicant/admin):** 403 Forbidden (authorize + employerGuard middleware)
- **No profile exists:** 403 Forbidden (employerGuard middleware)

Controller itself is exception-free; all errors handled upstream.

## 6) Flow comparison: POST vs GET

| Aspect | POST /recruiter/profile | GET /recruiter/profile |
|--------|------------------------|----------------------|
| Middleware | authenticate → authorize → validate | authenticate → authorize → employerGuard |
| Controller | Extract from body + call service | Read from req.employer |
| Service | Check duplicates, create profile | N/A (no service) |
| Logic | Write operation | Read operation |
| Response | 201 Created | 200 OK |

## 7) Database efficiency

- **POST:** 2 queries (check existing, create)
- **GET:** 1 query (load profile in employerGuard, cached in req.employer)
- Saves database round trips by leveraging middleware caching

---

# EMP-4: Update Employer Profile API (PUT)

## 1) What was built

Created an endpoint to update (modify) an existing recruiter company profile:

**Endpoint:** `PUT /api/v1/recruiter/profile`

**Purpose:** Partial update of recruiter's profile. Only provided fields are updated; others remain unchanged.

## 2) Why employerGuard is reused for PUT

- employerGuard already validates authentication, role, and loads profile
- Avoids duplicate database queries and role checks
- Profile is available in req.employer for context (though not directly used in update)
- Consistent middleware pattern across all recruiter endpoints (GET, POST, PUT)

## 3) Partial update strategy

Unlike POST (create with required `company_name`), PUT allows:
- All fields are optional
- Only provided fields are updated in database
- If no fields provided → return 400 "No fields provided for update"
- Empty body detected in controller and rejected before calling service

## 4) Email uniqueness handling for PUT

When company_email is provided:
1. Check if another profile already has that email
2. If yes AND belongs to different recruiter → throw 409 Conflict
3. If yes AND belongs to same recruiter → allow (same user updating own email)
4. Prisma handles the update with unique constraint enforcement

## 5) Architecture flow

```
HTTP Request
    ↓
Route: PUT /recruiter/profile
    ↓
Middleware Chain:
  1. authenticate           → validates JWT token, extracts user context
  2. authorize('recruiter') → checks user role is 'recruiter'
  3. employerGuard          → verifies recruiter role + loads profile (for context)
  4. validate               → validates all provided fields
    ↓
Controller: RecruiterController.updateRecruiterProfile
  1. Check if body is empty → reject with 400 if so
  2. Extract userId from req.user
  3. Extract validated body data (partial update object)
  4. Call service.updateRecruiterProfile(userId, data)
    ↓
Service: RecruiterService.updateRecruiterProfile
  1. If company_email provided:
     - Check findUnique({ where: { company_email } })
     - If found AND different user → throw conflict 409
  2. Update profile with Prisma:
     update({ where: { user_id }, data: { only_provided_fields } })
  3. Return updated profile
    ↓
Database: PostgreSQL UPDATE recruiter_profiles
  1. Update only columns in data object
  2. Auto-trigger Prisma @updatedAt
  3. Preserve id, user_id, is_verified, created_at
    ↓
Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid...",
    "user_id": "uuid...",
    "company_name": "...(updated if provided)",
    "company_email": "...(updated if provided)",
    "is_verified": false,
    "created_at": "unchanged",
    "updated_at": "new timestamp"
  },
  "message": "Recruiter profile updated successfully"
}
```

## 6) Implementation details

### Route: `src/routes/recruiter.routes.ts`

- PUT /profile endpoint
- Middleware order: authenticate → authorize('recruiter') → employerGuard → validate → controller
- All validation fields optional with isEmail check on company_email

### Validation Rules (express-validator)

- `company_name`: optional, trimmed, not empty if provided
- `company_email`: optional, valid email if provided, normalized
- `industry`, `description`, `company_size`, `website`, `location`, `logo_url`: optional, trimmed strings

### Controller: `src/controllers/recruiter.controller.ts`

- Function: `RecruiterController.updateRecruiterProfile`
- Checks if body is empty (no fields) → returns 400
- Extracts userId from req.user
- Extracts validated body data
- Calls service with partial update object
- Returns 200 on success

### Service: `src/services/recruiter.service.ts`

- Function: `RecruiterService.updateRecruiterProfile`
- Step 1: If company_email provided
  - Find existing profile with that email
  - If found AND different user → throw conflict 409
  - If found AND same user → allow (user updating own email)
- Step 2: Update profile with Prisma
  - Only updates fields provided in data object
  - Prisma @updatedAt automatically triggered
- Step 3: Return updated profile with all fields
- Error handling: Catches PostgreSQL unique constraint violations (23505)

## 7) Allowed vs Restricted fields

**Updatable fields (can be changed):**
- company_name
- company_email (with uniqueness check)
- industry
- description
- company_size
- website
- location
- logo_url

**Non-updatable fields (rejected if attempt to update):**
- id (primary key, immutable)
- user_id (foreign key, immutable)
- is_verified (admin-only, see admin APIs)
- created_at (auto-set on creation)
- updated_at (auto-managed by Prisma @updatedAt)

## 8) Error handling & status codes

| Scenario | Status | Message | Handled By |
|----------|--------|---------|------------|
| No Authorization header | 401 | "No token provided" | authenticate |
| Wrong role (applicant/admin) | 403 | "Forbidden: Insufficient permissions" | authorize |
| No profile exists | 403 | "Recruiter profile not found" | employerGuard |
| Empty request body | 400 | "No fields provided for update" | controller |
| Invalid email format | 422 | "Company email must be a valid email address" | validate |
| Duplicate company_email | 409 | "Company email is already in use" | service |
| Valid partial update | 200 | "Recruiter profile updated successfully" | controller response |

## 9) Efficiency notes

- Single query in employerGuard for authentication/authorization
- One additional query in service to check email uniqueness (if email provided)
- One update query to persist changes
- Total: 2-3 queries depending on whether email is updated
- No redundant profile lookups; reuses employerGuard context

---

# EMP-5: Admin Employer Verification API (PATCH)

## 1) What was built

Created an admin-only endpoint to verify or unverify recruiter profiles:

**Endpoint:** `PATCH /api/v1/admin/recruiter/:id/verify`

**Purpose:** Allow admins to control recruiter trust state by updating only `is_verified`.

## 2) Why only admin can access this endpoint

- Verification status is a trust and moderation signal, not a self-serve recruiter field.
- Recruiters must never be able to mark themselves verified.
- Restricting this operation to admins preserves platform integrity for applicants and jobs.
- Route protection ensures only authenticated admins can change verification.

## 3) Flow diagram

```
HTTP Request
    ↓
Route: PATCH /admin/recruiter/:id/verify
    ↓
Middleware Chain:
  1. authenticate           → validates JWT token
  2. authorize('admin')     → enforces admin role
  3. validate               → ensures body has required boolean is_verified
    ↓
Controller: AdminController.verifyRecruiter
  1. Extract profileId from req.params.id
  2. Extract is_verified from req.body
  3. Call service.verifyRecruiterProfile(profileId, is_verified)
    ↓
Service: AdminService.verifyRecruiterProfile
  1. Find recruiter profile by id (Prisma findUnique)
  2. If not found → throw 404 "Recruiter profile not found"
  3. Update with Prisma update({ where: { id }, data: { is_verified } })
  4. Return updated profile
    ↓
Response: 200 OK
{
  "success": true,
  "data": { ...updatedProfile },
  "message": "Recruiter verification status updated successfully"
}
```

## 4) Implementation details

### Route: `src/routes/admin.routes.ts`

- Added `PATCH /recruiter/:id/verify`
- Validation: `is_verified` required and boolean
- Middleware order for this endpoint: authenticate → authorize('admin') → validate → controller

### Controller: `src/controllers/admin.controller.ts`

- Added `AdminController.verifyRecruiter`
- Extracts:
  - `recruiterProfileId` from `req.params.id`
  - `is_verified` from `req.body`
- Calls `AdminService.verifyRecruiterProfile(...)`
- Returns standardized success response using `sendSuccess`
- No database logic in controller

### Service: `src/services/admin.service.ts`

- Added `AdminService.verifyRecruiterProfile(profileId, isVerified)`
- Uses Prisma to:
  - find profile by `id`
  - throw 404 if missing
  - update only `is_verified`
- Update is restricted to:
  - `update({ where: { id }, data: { is_verified: isVerified } })`

## 5) Security reasoning

- Only admin role can modify verification state.
- Endpoint does not accept or update any other recruiter field.
- Service hardcodes update data to `is_verified` to prevent privilege escalation.
- Missing profile handling prevents silent failures and keeps admin actions auditable.

## 6) Error handling and status codes

| Scenario | Status | Message |
|----------|--------|---------|
| No token | 401 | Handled by authenticate middleware |
| Non-admin user | 403 | Handled by authorize('admin') middleware |
| Recruiter profile not found | 404 | "Recruiter profile not found" |
| Valid verify/unverify | 200 | "Recruiter verification status updated successfully" |

## 7) Enhancements (Audit Logging + Optimization)

- Added admin audit logging after successful verification status changes.
  - Action stored as `VERIFY_RECRUITER` or `UNVERIFY_RECRUITER`
  - Target tracked as recruiter profile id
  - Reason recorded as `Verification set to true/false`

Why this matters:
- Verification is a trust-sensitive admin action and should be traceable.
- Audit logs provide accountability, incident analysis support, and compliance history.

- Added redundant update prevention:
  - If existing `is_verified` already matches requested value, service returns current profile without Prisma update write.

Why this matters:
- Avoids unnecessary database writes.
- Reduces write load and prevents noisy update timestamps when no real state change happens.

- Strengthened route validation:
  - `is_verified` now uses strict boolean validation.

Why this matters:
- Rejects loosely-typed values early and reduces ambiguity in admin actions.
- Improves API reliability by enforcing an explicit boolean contract.

---

# Migration Fix (EMP-5 Blocker Resolution)

## Issues found

- Prisma migrate failed on shadow DB with: `cannot use column reference in DEFAULT expression`.
- Root cause was in migration `20260320130945_init_fix/migration.sql` where `jobs.search_vector` default referenced `title` and `description` columns.
- UUID generator dependency risk was validated for `uuid_generate_v4()` usage in `000_init/migration.sql`.

## Fixes applied

- Ensured `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` is the first executable SQL statement at the top of `000_init/migration.sql`.
- Replaced invalid statement in `20260320130945_init_fix/migration.sql`:
  - From: `ALTER COLUMN "search_vector" SET DEFAULT (...)`
  - To: `ALTER COLUMN "search_vector" DROP DEFAULT`
- Required alignment in `prisma/schema.prisma`:
  - Removed `@default(dbgenerated(...))` from `jobs.search_vector` so Prisma no longer generates invalid PostgreSQL migration SQL.
- Re-checked migration defaults for PostgreSQL compatibility:
  - No remaining defaults that reference other table columns.
  - Kept safe defaults (literals, booleans, `CURRENT_TIMESTAMP`, `uuid_generate_v4()`).

## Why fix was needed

- PostgreSQL does not allow DEFAULT expressions that depend on other columns in the same row.
- Prisma applies migrations to a shadow database; this invalid default caused migration validation to fail before schema creation.
- Keeping `search_vector` without computed default is production-safe and avoids non-portable SQL behavior in migrations.

---

# JOB-1: Jobs Table Validation & Upgrade

## What was checked

- Verified `jobs` table already exists in `prisma/migrations/000_init/migration.sql` and was not recreated.
- Validated required columns and defaults:
  - `id` UUID PK with `uuid_generate_v4()`
  - `recruiter_id` UUID
  - required fields `title`, `description`
  - optional fields `location`, `salary_min`, `salary_max`
  - enum-backed `type`, `status`
  - `skills` TEXT[]
  - `is_boosted` default false, `views_count` default 0
  - `deleted_at` nullable timestamp
  - `created_at` and `updated_at` default `CURRENT_TIMESTAMP`
  - `search_vector` as `tsvector` with no default expression
- Validated required indexes exist:
  - `idx_jobs_recruiter`
  - `idx_jobs_search` (GIN)
  - `idx_jobs_skills` (GIN)
- Validated FK exists and is correct:
  - `jobs.recruiter_id` → `users.id` with `ON DELETE CASCADE`
- Validated Prisma alignment in `prisma/schema.prisma`:
  - `jobs` model matches SQL table shape
  - `search_vector` has no `dbgenerated` default
  - job enums map correctly to DB enum values

## What was changed

- No JOB-1 schema upgrade was required.
- No new migration was created because the table structure and constraints already satisfy JOB-1 requirements.
- Performed runtime validation with PostgreSQL transaction checks:
  - table exists
  - insert into `jobs` succeeds with defaults
  - FK violation is rejected
  - soft delete update (`deleted_at`) works
  - required indexes are present

## Why changes were needed

- Objective for JOB-1 was safety and production readiness without duplicate table creation.
- Since `jobs` already met the required production contract, creating a redundant migration would add risk without benefit.
- Keeping migration history unchanged for JOB-1 prevents unnecessary schema churn and protects existing data.



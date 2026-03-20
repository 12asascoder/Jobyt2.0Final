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

---

# EMP-2 Testing Notes (Employer Registration API)

Scope: validate `POST /api/v1/recruiter/profile` endpoint

API creates recruiter profile on first signup. Tests verify:
- Authentication (no token → 401)
- Authorization (wrong role → 403)
- Validation (missing/invalid fields → 422)
- Duplicate profile prevention (409)
- Successful creation (201)

All results below are based on middleware/controller/service logic.

## 1) No token → 401 Unauthorized

Input:

- POST /api/v1/recruiter/profile
- No Authorization header

Expected output:

- HTTP 401
- Response: `{ "success": false, "message": "No token provided" }`

Result (logic):

- Pass. `authenticate` middleware checks header and rejects if missing.

## 2) Wrong role → 403 Forbidden

Input:

- POST /api/v1/recruiter/profile
- Authorization: Bearer <valid_applicant_token> (role = 'applicant')
- Body: `{ "company_name": "Test Co" }`

Expected output:

- HTTP 403
- Response: `{ "success": false, "message": "Forbidden: Insufficient permissions" }`

Result (logic):

- Pass. `authorize('recruiter')` middleware checks role and rejects applicants/admins.

## 3) Missing company_name → 422 Unprocessable Entity

Input:

- POST /api/v1/recruiter/profile
- Authorization: Bearer <valid_recruiter_token>
- Body: `{ "company_email": "test@example.com" }` (no company_name)

Expected output:

- HTTP 422
- Response: `{ "success": false, "message": "Validation failed", "errors": [{ "field": "...", "message": "Company name is required" }] }`

Result (logic):

- Pass. `validate` middleware checks `body('company_name').notEmpty()` and rejects empty/missing.

## 4) Invalid company_email format → 422 Unprocessable Entity

Input:

- POST /api/v1/recruiter/profile
- Authorization: Bearer <valid_recruiter_token>
- Body: `{ "company_name": "Test Co", "company_email": "not-an-email" }`

Expected output:

- HTTP 422
- Response: `{ "success": false, "message": "Validation failed", "errors": [{ "field": "...", "message": "Company email must be a valid email address" }] }`

Result (logic):

- Pass. `validate` middleware checks `body('company_email').isEmail()` and rejects invalid format.

## 5) Duplicate profile → 409 Conflict

Input:

- POST /api/v1/recruiter/profile (first call)
- Authorization: Bearer <recruiter_1_token>
- Body: `{ "company_name": "Company A" }`
- Response: 201, profile created

- POST /api/v1/recruiter/profile (second call, same user)
- Authorization: Bearer <recruiter_1_token>
- Body: `{ "company_name": "Company B" }`

Expected output:

- HTTP 409
- Response: `{ "success": false, "message": "Recruiter profile already exists. Use PUT to update." }`

Result (logic):

- Pass. Service calls `prisma.recruiter_profiles.findUnique({ where: { user_id } })` and throws `conflict()` if found.

## 6) Duplicate company_email → 409 Conflict

Input:

- POST /api/v1/recruiter/profile (recruiter_1)
- Authorization: Bearer <recruiter_1_token>
- Body: `{ "company_name": "Company A", "company_email": "hr@company.com" }`
- Response: 201, profile created

- POST /api/v1/recruiter/profile (recruiter_2)
- Authorization: Bearer <recruiter_2_token>
- Body: `{ "company_name": "Company B", "company_email": "hr@company.com" }` (same email)

Expected output:

- HTTP 409
- Response: `{ "success": false, "message": "Company email is already in use" }`

Result (logic):

- Pass. Service checks duplicate email before create: `prisma.recruiter_profiles.findUnique({ where: { company_email } })` and throws if found.

## 7) Valid input → 201 Created

Input:

- POST /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Body:
  ```json
  {
    "company_name": "Acme Corp",
    "company_email": "hr@acme.com",
    "industry": "Technology",
    "description": "Leading tech recruitment firm",
    "company_size": "50-100",
    "website": "https://acme.com",
    "location": "San Francisco, CA"
  }
  ```

Expected output:

- HTTP 201
- Response:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-...",
      "user_id": "uuid-...",
      "name": "Acme Corp",
      "company_name": "Acme Corp",
      "company_email": "hr@acme.com",
      "industry": "Technology",
      "description": "Leading tech recruitment firm",
      "company_size": "50-100",
      "website": "https://acme.com",
      "location": "San Francisco, CA",
      "logo_url": null,
      "is_verified": false,
      "created_at": "2026-03-19T...",
      "updated_at": "2026-03-19T..."
    },
    "message": "Recruiter profile created successfully"
  }
  ```

Result (logic):

- Pass. All validations pass, service creates profile with auto-generated id, is_verified=false, timestamps set by Prisma.

## 8) Minimal input → 201 Created (only required fields)

Input:

- POST /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Body: `{ "company_name": "Minimal Corp" }` (only required field)

Expected output:

- HTTP 201
- Response:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-...",
      "user_id": "uuid-...",
      "name": "Minimal Corp",
      "company_name": "Minimal Corp",
      "company_email": null,
      "industry": null,
      "description": null,
      "company_size": null,
      "website": null,
      "location": null,
      "logo_url": null,
      "is_verified": false,
      "created_at": "2026-03-19T...",
      "updated_at": "2026-03-19T..."
    },
    "message": "Recruiter profile created successfully"
  }
  ```

Result (logic):

- Pass. Service creates profile with provided company_name; optional fields are null/skipped.

## Integration Notes

- After successful profile creation (201), recruiter can update profile via PUT /api/v1/users/me (existing endpoint)
- is_verified field can be set true by admin via verification workflow (future implementation)
- company_email can be used for employer verification notifications

---

# EMP-3 Testing Notes (Employer Profile API - GET)

Scope: validate `GET /api/v1/recruiter/profile` endpoint

API fetches recruiter profile. Tests verify:
- Authentication (no token → 401)
- Authorization (wrong role → 403)
- Profile exists check (no profile → 403)
- Successful retrieval (200)

All results below are based on middleware/controller logic.

## 1) No token → 401 Unauthorized

Input:

- GET /api/v1/recruiter/profile
- No Authorization header

Expected output:

- HTTP 401
- Response: `{ "success": false, "message": "No token provided" }`

Result (logic):

- Pass. `authenticate` middleware checks header and rejects if missing.

## 2) Wrong role → 403 Forbidden

Input:

- GET /api/v1/recruiter/profile
- Authorization: Bearer <valid_applicant_token> (role = 'applicant')

Expected output:

- HTTP 403
- Response: `{ "success": false, "message": "Forbidden: Insufficient permissions" }`

Result (logic):

- Pass. `authorize('recruiter')` middleware checks role and rejects applicants/admins.

## 3) No profile exists → 403 Forbidden

Input:

- GET /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token> (recruiter has no profile row)

Expected output:

- HTTP 403
- Response: `{ "success": false, "message": "Recruiter profile not found" }`

Result (logic):

- Pass. `employerGuard` middleware attempts `prisma.recruiter_profiles.findUnique({ where: { user_id } })` and rejects if null.

## 4) Valid recruiter with profile → 200 OK

Input:

- GET /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token> (recruiter exists and has complete profile)
- Profile data:
  - id: "550e8400-e29b-41d4-a716-446655440000"
  - user_id: "660e8400-e29b-41d4-a716-446655440000"
  - company_name: "TechCorp Inc"
  - company_email: "hr@techcorp.com"
  - industry: "Technology"
  - description: "Leading software recruitment firm"
  - company_size: "100-500"
  - website: "https://techcorp.com"
  - location: "San Francisco, CA"
  - is_verified: false

Expected output:

- HTTP 200
- Response:
  ```json
  {
    "success": true,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "TechCorp Inc",
      "company_name": "TechCorp Inc",
      "company_email": "hr@techcorp.com",
      "industry": "Technology",
      "description": "Leading software recruitment firm",
      "company_size": "100-500",
      "logo_url": null,
      "website": "https://techcorp.com",
      "location": "San Francisco, CA",
      "is_verified": false,
      "created_at": "2026-03-19T10:30:00Z",
      "updated_at": "2026-03-19T10:30:00Z"
    },
    "message": "Recruiter profile fetched successfully"
  }
  ```

Result (logic):

- Pass. employerGuard loads profile into req.employer; controller returns it directly.

## 5) Minimal profile (only required fields) → 200 OK

Input:

- GET /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Profile data (minimal):
  - id: "550e8400-e29b-41d4-a716-446655440000"
  - user_id: "660e8400-e29b-41d4-a716-446655440000"
  - company_name: "Minimal Corp"
  - company_email: null
  - industry: null
  - description: null
  - is_verified: false

Expected output:

- HTTP 200
- Response:
  ```json
  {
    "success": true,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Minimal Corp",
      "company_name": "Minimal Corp",
      "company_email": null,
      "industry": null,
      "description": null,
      "company_size": null,
      "logo_url": null,
      "website": null,
      "location": null,
      "is_verified": false,
      "created_at": "2026-03-19T10:30:00Z",
      "updated_at": "2026-03-19T10:30:00Z"
    },
    "message": "Recruiter profile fetched successfully"
  }
  ```

Result (logic):

- Pass. employerGuard loads whatever profile exists; controller returns it with null fields.

## 6) No database query in controller (efficiency check)

Input:

- GET /api/v1/recruiter/profile (after profile loaded by employerGuard)

Expected behavior:

- Controller reads `req.employer` (in-memory, no DB call)
- Returns profile immediately

Result (logic):

- Pass. Follows middleware caching pattern for efficiency.

## Integration Notes

- GET endpoint works seamlessly with POST (EMP-2) flow
- After POST /recruiter/profile (201), recruiters can immediately GET /recruiter/profile (200)
- Profile data returned by GET is fresh from employerGuard's single query
- No N+1 query problem; exactly one query per request (in employerGuard)

---

# EMP-4 Testing Notes (Employer Profile API - PUT)

Scope: validate `PUT /api/v1/recruiter/profile` endpoint

API updates recruiter profile (partial update allowed). Tests verify:
- Authentication (no token → 401)
- Authorization (wrong role → 403)
- Profile exists check (no profile → 403)
- Empty body rejection (400)
- Validation (invalid email → 422)
- Email uniqueness (duplicate email → 409)
- Partial update (some fields → 200)
- Full update (all fields → 200)

All results below are based on middleware/controller/service logic.

## 1) No token → 401 Unauthorized

Input:

- PUT /api/v1/recruiter/profile
- No Authorization header
- Body: `{ "company_name": "Updated Corp" }`

Expected output:

- HTTP 401
- Response: `{ "success": false, "message": "No token provided" }`

Result (logic):

- Pass. `authenticate` middleware checks header and rejects if missing.

## 2) Wrong role → 403 Forbidden

Input:

- PUT /api/v1/recruiter/profile
- Authorization: Bearer <valid_applicant_token> (role = 'applicant')
- Body: `{ "company_name": "Updated Corp" }`

Expected output:

- HTTP 403
- Response: `{ "success": false, "message": "Forbidden: Insufficient permissions" }`

Result (logic):

- Pass. `authorize('recruiter')` middleware checks role and rejects applicants/admins.

## 3) No profile exists → 403 Forbidden

Input:

- PUT /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token> (recruiter has no profile)
- Body: `{ "company_name": "Updated Corp" }`

Expected output:

- HTTP 403
- Response: `{ "success": false, "message": "Recruiter profile not found" }`

Result (logic):

- Pass. `employerGuard` middleware checks for profile existence and rejects if null.

## 4) Empty body → 400 Bad Request

Input:

- PUT /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Body: `{}` (empty object)

Expected output:

- HTTP 400
- Response: `{ "success": false, "message": "No fields provided for update" }`

Result (logic):

- Pass. Controller checks `Object.keys(req.body).length === 0` and rejects.

## 5) Invalid email format → 422 Unprocessable Entity

Input:

- PUT /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Body: `{ "company_email": "not-an-email" }`

Expected output:

- HTTP 422
- Response: `{ "success": false, "message": "Validation failed", "errors": [{ "field": "...", "message": "Company email must be a valid email address" }] }`

Result (logic):

- Pass. `validate` middleware checks `body('company_email').isEmail()` and rejects invalid format.

## 6) Duplicate email (different recruiter) → 409 Conflict

Input:

- Recruiter A profile already has: email = "hr@companyA.com"
- Recruiter B attempts update:
  - PUT /api/v1/recruiter/profile
  - Authorization: Bearer <recruiter_B_token>
  - Body: `{ "company_email": "hr@companyA.com" }`

Expected output:

- HTTP 409
- Response: `{ "success": false, "message": "Company email is already in use" }`

Result (logic):

- Pass. Service checks `findUnique({ where: { company_email } })`, finds Recruiter A's profile with different user_id, throws conflict 409.

## 7) Partial update (company_name only) → 200 OK

Input:

- PUT /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Current profile: company_name="Old Corp", industry="Tech", description="Old desc"
- Body: `{ "company_name": "New Corp" }`

Expected output:

- HTTP 200
- Response:
  ```json
  {
    "success": true,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "New Corp",
      "company_name": "New Corp",
      "company_email": "hr@acme.com",
      "industry": "Tech",
      "description": "Old desc",
      "company_size": "100-500",
      "logo_url": null,
      "website": "https://acme.com",
      "location": "San Francisco, CA",
      "is_verified": false,
      "created_at": "2026-03-19T10:30:00Z",
      "updated_at": "2026-03-19T11:45:00Z"
    },
    "message": "Recruiter profile updated successfully"
  }
  ```

Result (logic):

- Pass. Prisma `update({ where: { user_id }, data: { company_name } })` updates only company_name field; others unchanged. updated_at auto-triggered.

## 8) Partial update (company_email only) → 200 OK

Input:

- PUT /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Current profile: company_email="hr@old.com"
- Body: `{ "company_email": "hr@new.com" }`

Expected output:

- HTTP 200
- Response:
  ```json
  {
    "success": true,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "company_name": "TechCorp Inc",
      "company_email": "hr@new.com",
      "is_verified": false,
      "created_at": "2026-03-19T10:30:00Z",
      "updated_at": "2026-03-19T11:45:00Z",
      ...
    },
    "message": "Recruiter profile updated successfully"
  }
  ```

Result (logic):

- Pass. Service checks new email not in use by other recruiter, Prisma updates only company_email.

## 9) Update own email (same recruiter) → 200 OK

Input:

- Recruiter has email = "hr@company.com"
- Attempts to update with same email:
  - PUT /api/v1/recruiter/profile
  - Authorization: Bearer <recruiter_token>
  - Body: `{ "company_email": "hr@company.com" }`

Expected output:

- HTTP 200
- Response: Profile with company_email = "hr@company.com"

Result (logic):

- Pass. Service finds profile with that email, checks if it's same user_id, allows update.

## 10) Full update (all fields provided) → 200 OK

Input:

- PUT /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Body:
  ```json
  {
    "company_name": "Acme Enterprise",
    "company_email": "careers@acme.com",
    "industry": "Consulting",
    "description": "Global consulting firm",
    "company_size": "500+",
    "website": "https://acme.com",
    "location": "New York, NY",
    "logo_url": "https://s3.../logo.png"
  }
  ```

Expected output:

- HTTP 200
- Response:
  ```json
  {
    "success": true,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Enterprise",
      "company_name": "Acme Enterprise",
      "company_email": "careers@acme.com",
      "industry": "Consulting",
      "description": "Global consulting firm",
      "company_size": "500+",
      "website": "https://acme.com",
      "location": "New York, NY",
      "logo_url": "https://s3.../logo.png",
      "is_verified": false,
      "created_at": "2026-03-19T10:30:00Z",
      "updated_at": "2026-03-19T11:45:00Z"
    },
    "message": "Recruiter profile updated successfully"
  }
  ```

Result (logic):

- Pass. All validations pass, Prisma updates all 8 fields, returns complete profile with new updated_at.

## 11) Non-updatable fields cannot be changed

Input:

- PUT /api/v1/recruiter/profile
- Authorization: Bearer <recruiter_token>
- Body: `{ "is_verified": true, "id": "fake-id" }`

Expected output:

- HTTP 200
- Response: Profile with is_verified = false (unchanged), id = original (unchanged)

Result (logic):

- Pass. Prisma schema prevents update to is_verified (no setter defined), id (primary key), so provided values are ignored. Profile returned with original values.

## Integration Notes

- PUT endpoint integrates with POST (create) and GET (read) flows
- Recruiter can create profile via POST, then update via PUT
- PUT allows partial updates; GET retrieves current state
- Email uniqueness enforced across all recruiters in update
- Empty body check prevents useless database operations

---

# EMP-5 Testing Notes (Admin Employer Verification API - PATCH)

Scope: validate `PATCH /api/v1/admin/recruiter/:id/verify` endpoint

API updates only recruiter profile `is_verified` status. Tests verify:
- Authentication (no token → 401)
- Authorization (non-admin → 403)
- Profile existence (invalid id → 404)
- Verify flow (true → 200)
- Unverify flow (false → 200)

All results below are based on middleware/controller/service logic.

## 1) No token → 401 Unauthorized

Input:

- PATCH /api/v1/admin/recruiter/550e8400-e29b-41d4-a716-446655440000/verify
- No Authorization header
- Body: `{ "is_verified": true }`

Expected output:

- HTTP 401
- Response: `{ "success": false, "message": "No token provided" }`

Result (logic):

- Pass. `authenticate` middleware rejects missing token.

## 2) Non-admin user → 403 Forbidden

Input:

- PATCH /api/v1/admin/recruiter/550e8400-e29b-41d4-a716-446655440000/verify
- Authorization: Bearer <valid_recruiter_or_applicant_token>
- Body: `{ "is_verified": true }`

Expected output:

- HTTP 403
- Response: `{ "success": false, "message": "Forbidden: Insufficient permissions" }`

Result (logic):

- Pass. `authorize('admin')` middleware blocks non-admin roles.

## 3) Invalid profile id (not found) → 404 Not Found

Input:

- PATCH /api/v1/admin/recruiter/11111111-1111-1111-1111-111111111111/verify
- Authorization: Bearer <valid_admin_token>
- Body: `{ "is_verified": true }`

Expected output:

- HTTP 404
- Response: `{ "success": false, "message": "Recruiter profile not found" }`

Result (logic):

- Pass. Service checks Prisma `findUnique({ where: { id } })` and throws 404 when profile is missing.

## 4) Valid verify (true) → 200 OK

Input:

- PATCH /api/v1/admin/recruiter/550e8400-e29b-41d4-a716-446655440000/verify
- Authorization: Bearer <valid_admin_token>
- Body: `{ "is_verified": true }`

Expected output:

- HTTP 200
- Response:
  ```json
  {
    "success": true,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "company_name": "TechCorp Inc",
      "is_verified": true,
      "created_at": "2026-03-19T10:30:00Z",
      "updated_at": "2026-03-19T12:15:00Z",
      "...": "other unchanged fields"
    },
    "message": "Recruiter verification status updated successfully"
  }
  ```

Result (logic):

- Pass. Service updates only `is_verified` using Prisma update by profile id.

## 5) Valid unverify (false) → 200 OK

Input:

- PATCH /api/v1/admin/recruiter/550e8400-e29b-41d4-a716-446655440000/verify
- Authorization: Bearer <valid_admin_token>
- Body: `{ "is_verified": false }`

Expected output:

- HTTP 200
- Response includes `is_verified: false`
- Message: "Recruiter verification status updated successfully"

Result (logic):

- Pass. Same service path updates verification flag to false.

## Constraint Validation

- Endpoint updates only `is_verified`
- No other recruiter profile fields are included in update payload
- Controller has no DB calls; all data logic stays in service layer

## EMP-5 Enhancement Tests (Audit + Optimization)

## 6) Same value twice → 200 OK, no DB update write

Input:

- First request:
  - PATCH /api/v1/admin/recruiter/550e8400-e29b-41d4-a716-446655440000/verify
  - Authorization: Bearer <valid_admin_token>
  - Body: `{ "is_verified": true }`
- Second request (same payload immediately):
  - PATCH /api/v1/admin/recruiter/550e8400-e29b-41d4-a716-446655440000/verify
  - Authorization: Bearer <valid_admin_token>
  - Body: `{ "is_verified": true }`

Expected output:

- Both responses: HTTP 200
- Second response returns current profile without changing verification state
- No second Prisma update write should occur because value is unchanged

Result (logic):

- Pass. Service short-circuits when `existingProfile.is_verified === isVerified`.

## 7) Verify action creates audit log

Input:

- PATCH /api/v1/admin/recruiter/550e8400-e29b-41d4-a716-446655440000/verify
- Authorization: Bearer <valid_admin_token>
- Body: `{ "is_verified": true }`

Expected output:

- HTTP 200
- Verification set to true
- New audit log row created with:
  - `action = VERIFY_RECRUITER`
  - `target_type = recruiter_profile`
  - `target_id = recruiter profile id`
  - `reason = Verification set to true`

Result (logic):

- Pass. Service writes audit record after successful update.

## 8) Unverify action creates audit log

Input:

- PATCH /api/v1/admin/recruiter/550e8400-e29b-41d4-a716-446655440000/verify
- Authorization: Bearer <valid_admin_token>
- Body: `{ "is_verified": false }`

Expected output:

- HTTP 200
- Verification set to false
- New audit log row created with:
  - `action = UNVERIFY_RECRUITER`
  - `target_type = recruiter_profile`
  - `target_id = recruiter profile id`
  - `reason = Verification set to false`

Result (logic):

- Pass. Service writes audit record after successful update.

---

# Migration Validation (EMP-5 Blocker Resolution)

## 1) Migration runs successfully

Input:

- Run: `npx prisma migrate dev`

Expected output:

- Prisma completes migration application including shadow database validation.

Result:

- Pass after removing invalid `search_vector` computed default from migration SQL.

## 2) DB schema created successfully

Input:

- Apply migrations from clean state.

Expected output:

- Tables, enums, indexes, and foreign keys are created in PostgreSQL without manual patching.

Result:

- Pass. Migration SQL is PostgreSQL-compatible for schema creation.

## 3) No SQL errors

Checks performed:

- `uuid-ossp` extension declaration present before `uuid_generate_v4()` defaults.
- No DEFAULT expressions reference other columns.
- `jobs.search_vector` remains plain `tsvector` without computed DEFAULT.
- Enum, array, and JSONB defaults remain valid SQL forms.

Result:

- Pass. No SQL syntax/default-expression blockers remain in migrations.



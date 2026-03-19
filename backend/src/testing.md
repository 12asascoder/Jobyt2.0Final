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


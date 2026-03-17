# Recruiter Middleware Testing Report

## Scope

This report validates recruiter-protected endpoints after integrating `employerGuard`.

Middleware flow under test:
1. `authenticate`
2. `authorize('recruiter')`
3. `employerGuard`
4. Controller

## Test Cases

### Case 1: No token
- Input:
  - Authorization header: missing
  - Role: N/A
  - DB profile: N/A
- Expected output:
  - HTTP 401
  - Message from auth middleware: `No token provided`
- Actual result (by code logic):
  - Pass
  - `authenticate` exits early with 401 before role/profile checks.

### Case 2: Invalid token
- Input:
  - Authorization header: `Bearer <invalid_or_expired_token>`
  - Role: N/A
  - DB profile: N/A
- Expected output:
  - HTTP 401
  - Message from auth middleware: `Invalid or expired token`
- Actual result (by code logic):
  - Pass
  - JWT verification fails in `authenticate`, request does not continue.

### Case 3: Valid token, wrong role
- Input:
  - Authorization header: valid JWT
  - Role in JWT: `applicant` or `admin`
  - DB profile: any
- Expected output:
  - HTTP 403
  - Message: `Access denied`
- Actual result (by code logic):
  - Pass
  - `authorize('recruiter')` blocks request before `employerGuard`.

### Case 4: Valid recruiter token, recruiter profile missing
- Input:
  - Authorization header: valid recruiter JWT
  - Role in JWT: `recruiter`
  - DB state: no `recruiter_profiles` row for `req.user.userId`
- Expected output:
  - HTTP 403
  - Message: `Recruiter profile not found`
- Actual result (by code logic):
  - Pass
  - `employerGuard` queries Prisma and returns 403 when profile is absent.

### Case 5: Valid recruiter token, recruiter profile exists
- Input:
  - Authorization header: valid recruiter JWT
  - Role in JWT: `recruiter`
  - DB state: matching `recruiter_profiles.user_id`
- Expected output:
  - Request reaches controller
  - Business logic executes normally
- Actual result (by code logic):
  - Pass
  - Guard attaches `req.employer` and calls `next()`.

### Case 6: Unexpected DB/runtime error in employerGuard
- Input:
  - Authorization header: valid recruiter JWT
  - DB state: runtime Prisma failure (network/query issue)
- Expected output:
  - HTTP 500
  - Message: `Internal server error`
- Actual result (by code logic):
  - Pass
  - Guard catches exception and returns 500.

## Routes Covered by This Middleware Integration

- `src/routes/job.routes.ts` (recruiter management block)
- `src/routes/application.routes.ts` (all recruiter endpoints)
- `src/routes/message.routes.ts` (`POST /conversations`)
- `src/routes/analytics.routes.ts` (all analytics endpoints)

## Conclusion

All required recruiter access scenarios are handled correctly by middleware order and guard logic.
The integration prevents invalid/unauthorized access before controller/service execution.

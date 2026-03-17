# Backend Work Log (Employer Guard Route Integration)

## 1) What I analyzed first

I reviewed the full backend flow in `src` before changing code.

- App bootstrap:
  - `src/server.ts` starts DB, Redis, and HTTP server.
  - `src/app.ts` registers middleware, mounts routes, and adds global error handling.
- Route wiring:
  - `src/routes/index.ts` mounts all domain routes under `/api/v1`.
  - Route files call controllers.
- Auth pattern:
  - `authenticate` sets `req.user` from JWT.
  - `authorize(...)` enforces role checks.
- Data/profile check:
  - `employerGuard` validates recruiter role/profile and attaches `req.employer`.

## 2) Why this change was needed

Some recruiter endpoints had role checks but did not consistently enforce recruiter profile existence.
That can cause downstream service logic to run without a valid recruiter profile context.

To fix this, recruiter endpoints now consistently use:

1. `authenticate`
2. `authorize('recruiter')`
3. `employerGuard`
4. Controller handler

This ensures token, role, and recruiter profile are all valid before business logic runs.

## 3) Files changed and what was changed

### `src/routes/job.routes.ts`
- Added `employerGuard` import.
- Updated recruiter route middleware chain to:
  - `router.use(authenticate, authorize('recruiter'), employerGuard)`
- Added comments explaining why middleware order matters.

### `src/routes/application.routes.ts`
- Added `employerGuard` import.
- Updated recruiter endpoints to include `employerGuard`:
  - `GET /recruiter/applicants`
  - `GET /recruiter/applicants/filtered`
  - `GET /recruiter/applicants/stats`
  - `GET /jobs/:jobId` (recruiter-only branch)
  - `PATCH /:id/status`
- Added comments documenting middleware sequencing and edge-case protection.

### `src/routes/message.routes.ts`
- Added `employerGuard` import.
- Updated recruiter-only conversation creation route:
  - `POST /conversations`
  - Chain is now `authorize('recruiter') -> employerGuard -> validate -> controller`

### `src/routes/analytics.routes.ts`
- Added `employerGuard` import.
- Updated route-level middleware chain to:
  - `router.use(authenticate, authorize('recruiter'), employerGuard)`
- Added comments describing why recruiter profile context is required.

## 4) Middleware flow (step-by-step)

For recruiter-protected routes:

1. `authenticate` checks for bearer token and verifies JWT.
2. If token is missing or invalid, request stops with `401`.
3. `authorize('recruiter')` checks role from `req.user`.
4. If role is not recruiter, request stops with `403`.
5. `employerGuard` loads recruiter profile by `req.user.userId` from `recruiter_profiles`.
6. If profile is missing, request stops with `403`.
7. Guard attaches `req.employer` and calls `next()`.
8. Controller executes with trusted recruiter context.

## 5) Routes modified (complete list)

- `src/routes/job.routes.ts`
  - Recruiter middleware section (`router.use(...)`)
- `src/routes/application.routes.ts`
  - `GET /recruiter/applicants`
  - `GET /recruiter/applicants/filtered`
  - `GET /recruiter/applicants/stats`
  - `GET /jobs/:jobId`
  - `PATCH /:id/status`
- `src/routes/message.routes.ts`
  - `POST /conversations`
- `src/routes/analytics.routes.ts`
  - Route-level middleware (`router.use(...)`)

## 6) Self-check summary

- Import paths are valid.
- Middleware order is consistent and documented.
- Recruiter profile lookup uses `req.user.userId`.
- `req.employer` is typed (no `any` assignment in guard).
- TypeScript check passes with `npm run type-check`.

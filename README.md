# Hiring Platform

A cloud-based two-sided hiring marketplace connecting job applicants with recruiters.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript, TailwindCSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (primary), Redis (cache/sessions) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Storage | AWS S3 + CloudFront CDN |
| Payments | Stripe / Razorpay |
| Email | SendGrid / AWS SES |
| Real-time | Socket.io |
| AI/ML | Python + FastAPI (sentence-transformers) |

## Project Structure

```
Hiring_platform/
├── frontend/          # Next.js app (port 3000)
├── backend/           # Express REST API (port 5000)
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Backend

```bash
cd backend
cp .env.example .env        # fill in your values
npm run db:init             # run schema.sql against your DB
npm run dev                 # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # fill in your values
npm run dev                         # starts on http://localhost:3000
```

## API

- Base URL: `http://localhost:5000/api/v1`
- Health check: `GET /api/v1/health`

## Delivery Roadmap

| Phase | Focus |
|-------|-------|
| Phase 1 | Infrastructure, Auth, RBAC, Credit ledger |
| Phase 2 | Profiles, Jobs, Payments, Referrals |
| Phase 3 | Applications, Messaging, Search, Notifications |
| Phase 4 | AI Matching, Analytics, Admin Dashboard |

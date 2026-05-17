# Matchboard

A dual-dashboard hiring platform built with Next.js, NeonDB, Google Auth, and Gemini.

## Features

- Recruiter dashboard with job posting form and application analytics
- Applicant dashboard with job browsing and resume upload
- Gemini-powered resume fit scoring with fallback scoring when no API key is present
- Google sign-in with role-based onboarding
- NeonDB-backed persistence

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `ADMIN_SESSION_SECRET` (admin cookie signing; can match `AUTH_SECRET` in dev)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` (seeds the first admin account when `admin_accounts` is empty)

## Admin panel

- Hidden login (not linked from the public app): `/admin/login`
- Dashboard: `/admin`
- Printable report: `/admin/report` (use **Export PDF** → browser print → Save as PDF)
- Admin auth uses username/password only (not Google OAuth)

## Mock data seed (no Gemini)

Populate the database with recruiters, jobs, applicants, and **pre-filled mock analysis** (no AI calls):

```bash
# Dev server must be running
curl http://localhost:3000/api/seed-mock
```

Creates 10–20 recruiters (random each run), varied jobs, overlapping + unique applicants, mixed pipeline statuses, and completed fit/analysis JSON in the database.

## Run

```bash
npm install
npm run dev
```

## Notes

- Tables are created automatically on first request.
- Resume parsing supports `.pdf`, `.docx`, and plain text files.
- If `GEMINI_API_KEY` is missing, the app falls back to a keyword-based fit score so the flow still works.

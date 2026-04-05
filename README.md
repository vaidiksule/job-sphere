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

## Run

```bash
npm install
npm run dev
```

## Notes

- Tables are created automatically on first request.
- Resume parsing supports `.pdf`, `.docx`, and plain text files.
- If `GEMINI_API_KEY` is missing, the app falls back to a keyword-based fit score so the flow still works.

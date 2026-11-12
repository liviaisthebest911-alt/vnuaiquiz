# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

VNU AI Quiz: a React 19 + Vite 8 + Tailwind 3 quiz SPA for VNU-HUS students, deployed on Vercel (`vercel.json` rewrites all routes to `index.html`). UI text, comments and commit messages are in Vietnamese — keep new user-facing strings in Vietnamese.

**Product direction changed (2026-11):** the app is becoming a university learning platform (subjects → chapters/topics, document library, question bank, per-subject final-exam practice, admin CMS). The THPTQG mock-exam module was removed in phase P0 — don't reintroduce it. Design docs in `docs/` (PROJECT_AUDIT, ARCHITECTURE, DATABASE_DESIGN, API_SPECIFICATION, IMPLEMENTATION_ROADMAP) are the source of truth for new work — follow the roadmap phase order.

The repo holds two independent npm projects:
- **Root** — the frontend SPA (`src/`). Study data still lives in `localStorage`. Optional env (`.env.example`): `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` enable login (`src/lib/supabase.js`, Auth only); `VITE_API_URL` enables backend calls via `src/lib/api.js`. Unset → the Account page says login isn't configured and nothing hits the network (unit tests/E2E run this way).
- **`backend/`** — a separate Express 5 server (own `package.json`, own `node_modules`). The frontend calls it from the Account, Tài liệu (`Materials.jsx`) and Quản trị tài liệu (`AdminLibrary.jsx`, reached from Account for editor/admin) pages; shared Tailwind classes live in `src/components/ui.jsx`.

## Commands

```bash
npm install
npm run dev         # Vite dev server on http://localhost:5173 (host: true, falls back to next free port)
npm run build       # production build -> dist/
npm run preview
npm test            # Vitest (jsdom) over src/ — single test: npx vitest run src -t "<test name>"
npm run test:e2e    # Playwright (Chromium) against a production build served on :4173 — single: npx playwright test exam.spec -g "<name>"
npx tsc -p .        # type-check app (noEmit, strict: false, allowJs)
npx tsc -p e2e      # type-check Playwright tests + config (strict)

cd backend && npm install
npm run dev         # nodemon, PORT default 5000
npm test            # node --test: middleware unit tests + integration tests that spawn the real server (ports 5094-5099)
```

Node >= 20.19 is required (Vite 8). CI (`.github/workflows/ci.yml`) runs `npm audit --audit-level=moderate` + tsc (app, e2e) + unit + build + Playwright E2E for the frontend and audit + test for the backend — a newly published advisory fails CI; fix it, never suppress it (see `docs/SECURITY_AUDIT.md`). `backend/package.json` has an `overrides` entry forcing `minimatch ^11.0.1` under nodemon (security); drop it once nodemon itself depends on minimatch ≥ 11.0.1. No linter/formatter. Frontend test files opt into jsdom with a `// @vitest-environment jsdom` header (there is no vitest config); `window.matchMedia` must be stubbed in tests (and canvas `getContext` if a test reaches the confetti on scores ≥ 8). E2E specs import `test`/`expect` from `e2e/fixtures.ts`, whose auto-fixture fails any test that logs a JS error, `console.error` or an HTTP ≥ 400 response. Seed a custom question bank in unit tests via `localStorage['vnu-ai-quiz:questions']` — `App` loads it in place of `questions.json`.

## Frontend architecture

- **No router.** `react-router-dom` is installed but unused. `src/App.jsx` holds `page` state and a `switch` in `renderPage()`; `Layout` gets `setPage` for navigation. Pages are wrapped in framer-motion `AnimatePresence` + `Pagetransition`. To add a page, add a `case` in `App.jsx` and a nav entry in `Layout.jsx`.
- **State is lifted into `App.jsx`** (questions, bookmarks, progress, history) and persisted via `useEffect` → `src/utils/storage.js` (keys prefixed `vnu-ai-quiz:`). Replacing the question bank via Admin prunes bookmarks/progress to the new IDs.
- **Two question schemas coexist:**
  - Legacy bank `src/data/questions.json` (JS components in `src/components/`): `{ id: number, chapter, chapterName, question, options[], answer: index, explanation }`. Admin can import a replacement bank as JSON (see `DataGuideModal`).
- **Question bank** `src/data/questions.json` (200 questions, subject CNSAI, 5 chapters × 40): `{ id, chapter, chapterName, question, options[], answer: index, explanation }`. **`id` restarts at 1 in every chapter** — only `(chapter, id)` is unique. Always identify a question with `questionKey(q)` from `src/utils/questionKey.js` (`CNSAI:c<chapter>:q<id>`), never `q.id`: exam answers, scoring, minimap, review, bookmarks, progress and Admin import validation all use it. Bookmarks/progress persist under `vnu-ai-quiz:bookmarks.v2` / `progress.v2`; the old `id`-based keys are read-only migration sources (ids matching several chapters are intentionally not migrated). Admin can replace the bank with pasted JSON (see `DataGuideModal`). Do not delete this file.
- `Exam.jsx` is the 30-minute timed exam (40 random questions); results go to `App.jsx` history (summary only — no question ids).
- `src/features/exam/` now only holds shared exam UI kept for the future university exam module: `useExamTimer`, `StickyTimer`, `QuestionMinimap`, `CircularScore` (currently unused by any page).
- Never clear user `localStorage` keys (`vnu-ai-quiz:*`, legacy `vnuaiquiz_*`) — it's user data and is not migrated to the server.

## Backend

`backend/app.js` builds the Express app (exported for tests/Vercel); `index.js` only loads env, test-connects the DB and listens. All errors go through `middleware/errors.js` → `{ error: { code, message, details? } }`; throw `validationError(msg, details)` / `new HttpError(status, code, msg)` instead of writing error responses by hand. Response debug info only when `DEBUG_ERRORS=true` + `NODE_ENV=development` + no `VERCEL` env. `POST /api/quiz/generate` is **locked (returns 503 `FEATURE_DISABLED`)** in `routes/quiz.routes.js` until auth exists (P2). The unused `controllers/quiz.controller.js` still holds the logic: extracts text with `pdf-parse`, sends up to 30k chars to Gemini (`gemini-1.5-flash`, JSON response mode), returns `{ success, data: [{ question_text, options, correct_index, explanation, topic_tag }] }`. Note this output shape differs from both frontend schemas.

**Auth (P2):** `middleware/auth.js` — `requireAuth` verifies the Supabase access token against the project JWKS (`SUPABASE_URL`, ES256/RS256 via `jose`; HS256 legacy secret unsupported) and uses it **only for identity**; role + status come from `public.users`/`roles` on every request (never from JWT metadata or request bodies). Missing profile → 401, `blocked` → 403 `ACCOUNT_BLOCKED`. `requireRole('editor'|'admin')` is rank-based. Routes: `/api/v1/me` (GET/PATCH), `/api/v1/admin/:type/:id/{submit|publish|approve|reject|hide|unhide}` (§1b workflow, writes `audit_logs`; `publish` = admin draft → published). `/api/v1` has a per-instance in-memory rate limit (60/min/IP) — tests that hit it share one budget per process. CORS allowlist from `CORS_ORIGINS`. First admin: `DATABASE_URL=... npm run db:set-role -- <email> admin [--allow-remote]` (no self-promotion endpoint). `tests/auth.test.js` signs ES256 tokens against a local JWKS server and needs `TEST_DATABASE_URL`.

**Library (P4 milestone 1):** `routes/library.routes.js` (public, `optionalAuth` on every route: guest/user see a material only when it **and** its subject **and** chapter are `published`, else 404; editors can preview) and `routes/admin.library.routes.js` (subjects, chapters, upload: `upload-url` → browser PUTs straight to Storage → `POST /admin/materials` checks size, stored content-type and magic bytes, deletes rejected objects). It is mounted inside `admin.routes.js` before the generic workflow route. `services/storage.js` talks to Storage REST with `SUPABASE_SECRET_KEY` (bucket `materials`, private). Use `withTx` + `audit` from `config/db.js` for writes that need an `audit_logs` row. Tests use `tests/helpers/fakeSupabase.js` (JWKS + Storage in memory).

`config/db.js` creates a `pg` Pool (DATABASE_URL = Supabase pooler URL) and test-connects on import; routes use it directly (no ORM). TLS comes from `config/dbSsl.js`: verified (`rejectUnauthorized: true`, CA from `DATABASE_CA_CERT`) for remote hosts, off for localhost. Never put `sslmode` in `DATABASE_URL` — pg lets it override the `ssl` object.

**Database (P1):** schema = `backend/db/migrations/001_init.sql` (all of `DATABASE_DESIGN.md §3`, RLS on every table with no policies, `updated_at` triggers, `auth.users` → `users` profile trigger, deferred constraint trigger: single_choice = ≥2 options + exactly 1 correct). `002_revoke_data_api_grants.sql` revokes every `anon`/`authenticated` privilege in `public` (incl. default privileges) — the browser never uses the Data API. Postgres can't remove PUBLIC's default EXECUTE per schema, so any migration that creates a function in `public` must `revoke all on function ... from public, anon, authenticated` (db.test.js checks). Migrations are append-only; apply with `psql "$URL" -v ON_ERROR_STOP=1 -f <file>` (each file is one transaction). `001_init.down.sql` refuses to run once user data exists. Seed: `DATABASE_URL=... npm run db:seed` — reads the checksummed backup `db/seed/legacy/questions.2026-11-11.json` (not `src/data`), one transaction, idempotent via `(chapter_id, legacy_number)`, never overwrites edited rows; it deliberately ignores `.env` and refuses non-localhost hosts without `--allow-remote` (pg_dump production first). `tests/db.test.js` runs migration + seed ×2 on a throwaway DB when `TEST_DATABASE_URL` points to a **local** Postgres (CI provides a `postgres:16` service; locally e.g. `docker run --rm -d -p 127.0.0.1:55432:5432 -e POSTGRES_PASSWORD=test postgres:16`); `tests/fixtures/supabase-auth-stub.sql` fakes the Supabase `auth` schema.

Env vars (`backend/.env`, loaded by dotenv): `GEMINI_API_KEY`, `DATABASE_URL` (verified on staging via Session pooler :5432; transaction pooler :6543 untested), `DATABASE_CA_CERT`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CORS_ORIGINS`, `PORT`. Anything prefixed `VITE_` is bundled publicly, so secrets belong only in the backend.

# Beta QA Results

## QA Pass

- Date/time: 2026-07-10 17:26 +03:30
- Environment: local Windows development machine
- Repository: `D:\pf\PinFa`
- Database: PostgreSQL `pinfa` at `127.0.0.1:5432`, schema `public`
- App target: local Next.js dev server at `http://127.0.0.1:3000`
- Locale baseline: Persian default (`fa`, `rtl`) with English toggle support

## Commands Run

| Check | Result | Notes |
| --- | --- | --- |
| `cmd /c npx prisma validate` | PASS | Schema is valid. Prisma config injected `.env` successfully. |
| `cmd /c npx prisma generate` | PASS | First run hit Windows EPERM while a local dev server held the query-engine DLL; passed after stopping the local PinFa dev server. |
| `cmd /c npx prisma migrate status` | PASS | One migration found; database schema is up to date. |
| `cmd /c npm run prisma:seed` | PASS | Seed completed successfully. |
| Read-only seed sanity check | PASS | 1 active SUPER_ADMIN, 20 active categories, 3 required SystemSetting records, 1 active HOME_FEED_INLINE Yektanet AdSlot. |
| `cmd /c npm run build` | PASS | Build completed. Non-fatal Node experimental JSON module warnings appeared during build. |
| `cmd /c npm run lint` | PASS | ESLint completed with no errors. |
| `powershell.exe -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1` | PASS | Health, public pages, register, login, `/api/users/me`, authenticated pages, feed, search, notifications, logout, and logged-out auth block passed. |
| `git diff --check` | PASS | One trailing-blank-line issue was fixed; remaining output is line-ending warnings only. |

## Automated Smoke Coverage

The smoke script verified:

- `/api/health`
- public page rendering for `/`, `/auth/register`, `/auth/login`, `/search`
- user registration with a unique local test user
- login by email
- authenticated `/api/users/me`
- authenticated pages: `/profile`, `/onboarding/interests`, `/upload`, `/notifications`
- `/api/feed/home?limit=5`
- `/api/search?q=art&type=all&limit=5`
- `/api/notifications?limit=5`
- logout
- `/api/users/me` returns 401 after logout
- API responses checked in smoke do not expose `passwordHash`

The script starts a local dev server only when `/api/health` is not already healthy, and it stops only the process it started.

## Pass/Fail Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Environment and database | PASS | Prisma validate/generate/status passed; seed and read-only seed sanity check passed. |
| Build and lint | PASS | `npm run build` and `npm run lint` passed. |
| Core public route smoke | PASS | Smoke script loaded `/`, `/auth/register`, `/auth/login`, and `/search`. |
| Auth smoke | PASS | Register, login, current user, logout, and logged-out current user block passed. |
| Authenticated route smoke | PASS | `/profile`, `/onboarding/interests`, `/upload`, and `/notifications` rendered for a logged-in smoke user. |
| Feed API smoke | PASS | `/api/feed/home?limit=5` returned a JSON response with `items`. |
| Search API smoke | PASS | `/api/search?q=art&type=all&limit=5` returned the normalized query. |
| Notifications API smoke | PASS | Authenticated notifications endpoint returned `items`. |
| Seeded beta prerequisites | PASS | SUPER_ADMIN, categories, required settings, and active ad slot exist. |
| Upload/media/provider scenarios | MANUAL CHECKLIST | Covered by `docs/BETA_QA_TEST_PLAN.md`; not automated in the smoke script to avoid brittle local image/provider dependencies. |
| Admin moderation/report actions | MANUAL CHECKLIST | Covered by `docs/BETA_QA_TEST_PLAN.md`; requires admin/moderator test accounts and report/moderation data. |
| Mobile/browser visual QA | MANUAL CHECKLIST | Covered by `docs/BETA_QA_TEST_PLAN.md`; requires browser/device viewport verification. |

## Bugs Found

| Severity | Finding | Status |
| --- | --- | --- |
| P2 Major | Existing `scripts/smoke-test.ps1` used `SkipHttpErrorCheck`, which is not reliable with the requested Windows `powershell.exe` runner. | Fixed. |
| P2 Major | Existing smoke script required an already-running app server and did not test logout, logged-out auth blocking, or authenticated page rendering. | Fixed. |
| P3 Minor | `docs/BETA_LAUNCH_CHECKLIST.md` contained mojibake for Persian labels/ad text. | Fixed. |
| P3 Minor | `docs/KNOWN_ISSUES.md` still said most UI copy was English after Stage 17.5 localization. | Fixed. |
| P3 Minor | `npx prisma generate` failed once with Windows EPERM because the local Next dev server locked `query_engine-windows.dll.node`. | Resolved for this pass by stopping the local dev server; documented as a local workflow risk. |
| P3 Minor | `git diff --check` found a trailing blank line at EOF in `src/components/feed/NativeAdCard.tsx`. | Fixed. |

## Bugs Fixed In This Pass

- Replaced `scripts/smoke-test.ps1` with a Windows PowerShell-compatible smoke runner.
- Added local-host safety checks to avoid accidentally running destructive registration/login smoke tests against a remote production host.
- Added automatic local dev-server startup and cleanup.
- Added explicit PASS/FAIL output and non-zero exit on failure.
- Added authenticated page route smoke coverage.
- Fixed corrupted Persian text in the beta launch checklist.
- Updated known issues to reflect current bilingual UI status.
- Added beta QA test plan and bug report template.
- Removed a trailing blank line at EOF in `NativeAdCard.tsx`.

## Remaining Known Issues

See `docs/KNOWN_ISSUES.md`. Remaining items are accepted MVP/beta limitations, not P0/P1 blockers:

- Local upload storage is development-only.
- Image processing and SafeSearch run in the request path.
- SafeSearch depends on configured Google Vision credentials and falls back to manual review on failure.
- Rate limiting is still needed before wider launch.
- No push/email/SMS notifications.
- No advanced ML recommendations, comments, messaging, video, marketplace, payments, AI image generation, copyright detection, or duplicate-image detection.
- Real Yektanet behavior depends on production credentials/configuration.
- Windows local development can require stopping the dev server before regenerating Prisma Client.

## Release Candidate Status

READY_FOR_BETA

No P0 blockers remain from this QA pass. No unresolved P1 issues were found in the automated stability checks. P2/P3 limitations are documented for beta ownership and manual acceptance.

# Production Readiness Audit

Audit date: 2026-07-12

## Executive Summary

The application builds and its PostgreSQL schema is current. Authentication uses hashed database sessions, production cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`, public queries select bounded data, and unpublished Pins are filtered from public surfaces.

The current application is suitable for a controlled staging deployment on one persistent Linux host. It is not safe to deploy to an ephemeral or multi-instance platform without first providing durable shared image storage. Public beta also needs rate limiting, production monitoring, backups, and provider configuration verification.

No database schema change is required by this audit.

## Severity Summary

### P0 - Must Fix Before Deployment

1. **Provide durable image storage.** Uploaded originals and generated variants are written under `storage/uploads` on the app filesystem. Before any deployment, either mount a persistent, backed-up volume at that exact path and run one app instance, or replace local storage with object storage. An ephemeral filesystem will lose media on rebuild or restart.
2. **Set and verify production origin and TLS configuration.** `NEXT_PUBLIC_APP_URL` must be the public HTTPS origin before the production build. `NODE_ENV=production` and HTTPS termination are required for secure session cookies. The Node process must not be exposed directly around the trusted reverse proxy.
3. **Apply migrations before serving traffic.** Production must run `npm run prisma:migrate:deploy`, never `prisma migrate dev` or `prisma migrate reset`.

There is no known P0 application-code defect. The items above are deployment gates.

### P1 - Should Fix Before Public Beta

1. Add endpoint-level rate limiting for login, registration, upload, search, social actions, reports, and ad event APIs. The SDD requires login rate limiting, but no limiter exists.
2. Add explicit CSRF/origin protection for authenticated state-changing requests. `SameSite=Lax` is a useful baseline but is not a complete policy for every same-site deployment topology.
3. Move Sharp processing and Google Vision calls out of the upload request into a retryable worker queue. Current requests can run long and cannot be retried independently.
4. Add centralized logs, error tracking, metrics, and alerts. Current analytics are JSON lines written to stdout/stderr only.
5. Add automated PostgreSQL backups, image-volume backups, retention, and a restore drill. Database and image backups must be coordinated.
6. Add a readiness check that verifies PostgreSQL and writable media storage. `/api/health` is currently a liveness response only.
7. Sanitize provider failure details before long-term storage. SafeSearch fallback currently stores the provider exception message in `ModerationResult.rawResponseJson`; SDK messages should be treated as internal data.
8. Complete and verify the real Yektanet contract. The current provider is a replaceable native-ad placeholder/config adapter; provider-side impression/click callbacks remain placeholders.
9. If Docker is the selected deployment method, add and test a multi-stage Linux Dockerfile, `.dockerignore`, Compose staging definition, health check, and persistent upload volume before deployment.

### P2 - Can Be Documented And Fixed Later

1. Pin a supported Node LTS version in repository metadata. The audit ran on Node `v22.5.1`; use Node 22 LTS for deployment and build on the target Linux platform.
2. Add expired-session cleanup and data-retention jobs for `UserSession`, `UserEvent`, `AdEvent`, `AuditLog`, and old failed media.
3. Put published image variants behind object storage/CDN. They are currently streamed through a Node API route with a 60-second public cache.
4. Add database query metrics, slow-query alerting, and connection-pool tuning based on measured traffic.
5. Add automated browser/end-to-end coverage; current release checks are build, lint, smoke tests, and manual QA.

## Audit Findings

### Environment And URLs

- Prisma CLI explicitly loads `.env` through `prisma.config.ts`; the seed script also loads `dotenv/config`.
- `DATABASE_URL` is the only Prisma datasource input.
- `NEXT_PUBLIC_APP_URL` is used as Next.js metadata base and falls back to `http://localhost:3000`. Production must never rely on that fallback.
- There is no separate `APP_URL`, storage endpoint, queue, logging, or session-secret variable. Session tokens are random values whose hashes are stored in PostgreSQL, so no signing secret is currently required.
- The checked local `.env` has database and seed values but no production origin, Google Vision, or Yektanet values. This is acceptable locally and not a deployable production environment.

### Database

- PostgreSQL is accessed through a singleton Prisma Client. Development logs queries; production logs Prisma errors only.
- One initial migration exists and `prisma migrate status` reports the local database up to date.
- Public feed/search limits are bounded, notifications are limited to 100, moderation to 50, and reports to 50.
- Uniqueness constraints protect duplicate likes, saves, follows, and reports.
- Database risks are operational: no documented production pool budget, backups, point-in-time recovery, retention jobs, or restore test.
- The seed is idempotent, but it updates the seeded SUPER_ADMIN password and role. Run it deliberately, not on every app start, and prefer `SEED_ADMIN_PASSWORD_HASH` in production automation.

### Image Storage And Processing

- `src/lib/local-upload-storage.ts` writes to `process.cwd()/storage/uploads`.
- Files written are:
  - `storage/uploads/originals/<pin>-<uuid>.<ext>`
  - `storage/uploads/variants/thumbnail/<pin>-thumbnail-<uuid>.webp`
  - `storage/uploads/variants/feed/<pin>-feed-<uuid>.webp`
  - `storage/uploads/variants/detail/<pin>-detail-<uuid>.webp`
- The audit workspace contains 60 media files for 15 uploads, about 6.8 MB total.
- Sharp validates readability, normalizes orientation with `rotate()`, strips metadata by re-encoding, and creates 320x320 thumbnail, 736px-wide feed, and 1600px-wide detail WebP variants.
- Originals are served only to the owner/admin; processed variants require a published Pin or owner/admin access.
- Processing and SafeSearch happen synchronously in the upload request. A reverse proxy needs a body limit above the configured 10 MB upload limit and a timeout that accommodates processing/provider latency.

### Storage Failure Modes

- **Process restart on the same persistent disk:** files survive.
- **Container recreation or ephemeral host restart:** files disappear while database storage keys remain, producing image 404s.
- **Multiple app instances:** an upload exists only on the instance that wrote it; requests routed elsewhere can return 404.
- **Uncoordinated database/media restore:** records and files can point at different generations.
- **Disk full or read-only filesystem:** uploads fail; the current health endpoint will still report healthy.

The database already stores opaque relative storage keys, which is a useful migration boundary. Object-storage migration needs a `StorageProvider` interface for put/get/delete/signed-or-public URL operations, an S3-compatible implementation, key-copy/backfill tooling, CDN URL policy, private-original bucket policy, and a cutover/rollback plan.

### SafeSearch

- Google Vision supports application-default credentials, a credential file, raw service-account JSON, or split client email/private key values.
- Missing or failed provider configuration safely produces `HUMAN_REVIEW_REQUIRED` and `PENDING_REVIEW`; it does not auto-publish.
- Production must verify Google project/billing/API access, credential permissions, quotas, timeout behavior, and manual-review staffing before enabling uploads.

### Ads

- The active database `AdSlot` controls placement and frequency.
- Yektanet environment/config values are isolated in the provider adapter, URLs are protocol-validated, and provider failures do not break the feed.
- Production disables implicit local mocks. A real ad contract still requires provider configuration and acceptance testing; otherwise disable the slot or set `YEKTANET_ENABLED=false`.

### Sessions And Security

- Passwords use scrypt with random salts; session tokens are 256-bit random values and only SHA-256 hashes are stored.
- Production session cookies are `HttpOnly`, `Secure`, `SameSite=Lax`, host-scoped, and expire after 30 days.
- Inactive users cannot use existing sessions. Logout deletes the current database session.
- No password hash is selected by public profile/search queries. Email and phone are returned only in current-user/auth responses.
- Missing controls: rate limiting, explicit CSRF/origin checks, session cleanup, account verification flows, and trusted-proxy enforcement for forwarded IP headers.

### Logging And Errors

- Analytics logs are structured JSON to stdout/stderr and database event/audit tables capture product actions.
- API handlers generally return stable JSON messages and do not return stack traces.
- There is no log collector, correlation/request ID, alerting, redaction pipeline, uptime monitor, or error tracker.
- Reverse-proxy and platform logs must not record session cookies, credential JSON, raw upload bodies, or provider secrets.

### Docker Readiness

- No `Dockerfile`, `.dockerignore`, `docker-compose.yml`, or Compose equivalent exists.
- PostgreSQL is not bundled by the repository; local development currently uses an externally running PostgreSQL instance.
- No container volumes are configured. A container deployment is therefore not ready until image storage is mounted durably and the Linux Sharp/Prisma build is tested.
- Never copy Windows `node_modules` into Linux. Run `npm ci`, Prisma generation, and the Next.js build in the Linux build environment.

## Verification Status

| Command | Result | Notes |
| --- | --- | --- |
| `npx prisma validate` | PASS | Prisma schema is valid and `.env` was injected by `prisma.config.ts`. |
| `npx prisma generate` | PASS | Prisma Client 6.19.3 generated successfully. |
| `npx prisma migrate status` | PASS | One migration exists and the local PostgreSQL schema is current. |
| `npm run build` | PASS | Next.js 15.5.19 production build completed. Node emitted non-fatal experimental JSON-module warnings while collecting/generating pages. |
| `npm run lint` | PASS | ESLint completed without errors. |

Repeat validation, migration status, build, readiness checks, and authenticated smoke tests in the Linux staging environment before promotion.

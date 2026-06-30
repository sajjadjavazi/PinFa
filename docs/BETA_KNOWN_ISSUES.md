# Beta Known Issues

This list captures the remaining beta-launch risks after the MVP polish pass.

## Product And UX

- Public category browsing is not yet implemented as a dedicated page.
- Avatar upload is not implemented; the UI only displays an existing avatar URL.
- Admin analytics dashboards are still basic; structured logs exist, but there is no aggregated reporting UI.
- Empty-state copy is intentionally simple and should be localized before a Persian-language beta.

## Safety And Abuse

- Login, upload, like, save, follow, share, and report endpoints still need rate limiting.
- Email and phone verification token models exist, but verification flows are not implemented.
- Report threshold automation is not implemented; reports are visible to admins for manual action.
- Admin warning notifications are represented in the schema but do not yet have a send action.

## Infrastructure

- Images are stored locally through the current storage abstraction, not in S3/CDN-backed public storage.
- Image processing and SafeSearch moderation run in the upload request path instead of a retryable worker queue.
- `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, and Google Vision credentials must be set correctly per environment.
- Native ads use a Yektanet placeholder adapter until final provider integration details are available.

## Observability

- Analytics logs are written as structured server logs and user/ad events are stored in the database, but no log pipeline or dashboard is configured.
- Build and lint pass locally, but production deployment should add CI checks for type-check, lint, Prisma validation, and build.

# Known Issues

This list is for beta launch planning and should be reviewed before each release.

## Infrastructure

- Local upload storage is development-only and should be replaced with S3-compatible object storage plus CDN for production.
- There is no production object storage migration yet.
- Image processing and SafeSearch moderation run in the upload request path instead of a retryable worker queue.
- There is no background retry dashboard for failed image processing or moderation provider failures.

## Moderation And Safety

- SafeSearch depends on configured Google Vision credentials. If credentials are missing or the provider fails, Pins fall back to manual review.
- There is no copyright detection or duplicate-image detection.
- Report threshold automation is not implemented; admins must review reports manually.
- Endpoint-level rate limiting is still needed for login, uploads, likes, saves, follows, shares, reports, and search.
- Email and phone verification token models exist, but verification flows are not implemented.

## Product Scope

- No comments.
- No direct messaging.
- No video upload.
- No marketplace or payments.
- No AI image generation.
- No advanced ML recommendation engine.
- Category browsing is limited to search-driven discovery; dedicated category feed pages are not implemented.
- Avatar upload is not implemented; existing avatar URLs can be displayed.

## Ads

- Yektanet may run in mock/local placeholder mode if real provider credentials are missing.
- Provider reporting and internal `AdEvent` counts may not match exactly.
- Ads are inserted only in the home feed for the MVP.

## UX And Localization

- Most UI copy is English and should be localized before a Persian-language beta.
- Admin pages are responsive enough for basic use but are optimized for desktop moderation.
- Notification delivery is in-app only. There is no push, email, or SMS notification channel.

## Observability

- Analytics are structured logs plus database events, but no production log pipeline or dashboard is configured.
- No automated end-to-end test suite exists yet.

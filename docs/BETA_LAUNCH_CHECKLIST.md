# Beta Launch Checklist

Use this checklist before inviting beta users.

## Environment Variables

- `DATABASE_URL` points to the production or beta PostgreSQL database.
- `NEXT_PUBLIC_APP_URL` points to the public app origin.
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_DISPLAY_NAME`, and `SEED_ADMIN_PASSWORD` are set for initial seed only.
- Google Vision credentials are configured with one supported method:
  - `GOOGLE_APPLICATION_CREDENTIALS`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - `GOOGLE_VISION_CLIENT_EMAIL` and `GOOGLE_VISION_PRIVATE_KEY`
- Yektanet variables are configured if real ads are enabled:
  - `YEKTANET_ENABLED`
  - `YEKTANET_PUBLISHER_ID`
  - `YEKTANET_WIDGET_ID`
  - `YEKTANET_PLACEMENT_ID`
  - `YEKTANET_SCRIPT_URL` if required.

## Database

- Migrations are applied to the same `DATABASE_URL` used by the app.
- Prisma Client is generated.
- `Category` seed data exists.
- `SystemSetting` records exist for upload limits, SafeSearch thresholds, and ad frequency.
- One `SUPER_ADMIN` account exists and can log in.
- Backup and restore process is documented for the beta database.

## Upload And Moderation

- Upload accepts JPG, JPEG, PNG, and WEBP only.
- File signature validation is active.
- Sharp processing creates thumbnail, feed, and detail variants.
- Public surfaces use optimized variants, not raw originals.
- SafeSearch provider is configured or fallback sends Pins to manual review.
- Admin can approve, reject, and remove Pins.
- Audit logs are created for admin moderation actions.

## Content Policy

- Terms and content policy copy is ready for beta users.
- Moderators understand rejection criteria.
- Report reasons match moderation policy.
- Reports dashboard is monitored during beta.
- Rate limiting is planned before wider launch.

## Ads

- `AdSlot` for `HOME_FEED_INLINE` is configured.
- Ads are disabled or mock-only if real Yektanet credentials are missing.
- Ads are labeled clearly.
- Ad click logging is working.
- Feed still works if the ad provider fails.

## Mobile UX

- Home feed shows two columns on common mobile widths.
- Header wraps without horizontal scroll.
- Feed card action menu fits on small screens.
- Upload, auth, search, Pin detail, and Board detail pages are usable on mobile.
- Admin pages are usable enough for emergency moderation on mobile.

## Bilingual UI And RTL

- First visit defaults to Persian (`fa`).
- `<html lang="fa" dir="rtl">` is set when Persian is active.
- Language toggle switches to English without losing the current route.
- `<html lang="en" dir="ltr">` is set when English is active.
- Refresh preserves the selected language through `pinfa_locale`.
- Header, feed, auth, upload, search, notifications, profile, board, Pin detail, and admin pages are reviewed in Persian.
- Mobile feed remains two columns in Persian RTL.
- Feed card three-dot menus open correctly in RTL and LTR.
- Native ads show `تبلیغ` in Persian and `Advertisement` in English.
- Email, password, phone, URL, and username fields remain usable in RTL layouts.
- Persian UI uses Vazirmatn without making body text too heavy.
- Header logo renders as a circular mark without stretching.

## Persian Copy Review

- Persian copy uses familiar product wording rather than literal English translations.
- Main labels are reviewed: خانه، جست‌وجو، آپلود، پروفایل، اعلان‌ها، ذخیره، پسندیدن، اشتراک‌گذاری، گزارش.
- Empty, loading, and error states are understandable in Persian.
- Admin actions are understandable for moderators.
- User-generated content is not translated or mutated.

## Security

- `passwordHash`, email, and phone are not exposed in public responses.
- Admin pages and APIs require `MODERATOR` or `SUPER_ADMIN`.
- Authenticated actions reject logged-out users.
- Users cannot edit other users' profiles or Boards.
- Users cannot save into another user's Board.
- Non-published Pins are excluded from feed, search, public Boards, and public metadata.

## Final QA

- `docs/BETA_QA_TEST_PLAN.md` is reviewed.
- `docs/BETA_QA_RESULTS.md` is updated for the current release candidate.
- `scripts/smoke-test.ps1` passes against local development.
- Core public, authenticated, and admin route smoke tests are complete.
- Manual upload/moderation, board/save, like/share/report, search, ads, notifications, and admin reports scenarios are complete or explicitly deferred.
- Mobile widths 360px, 390px, 414px, and 430px are checked.
- Any P2/P3 issues accepted for beta are listed in `docs/KNOWN_ISSUES.md`.

## Go/No-Go

- `npx prisma validate` passes.
- `npx prisma generate` passes.
- `npm run build` passes.
- `npm run lint` passes or known lint exceptions are documented.
- Local smoke test passes.
- Admin login is verified.
- Upload and moderation path is verified.
- Report handling path is verified.
- Known issues are accepted by the beta owner.

## Known Risks

- Local storage is not production object storage.
- Image processing and SafeSearch currently run in the request path.
- Real ad provider behavior depends on final Yektanet configuration.
- No advanced ML recommendation, comments, messaging, video, or copyright detection.

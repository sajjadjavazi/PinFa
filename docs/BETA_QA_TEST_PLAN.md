# Beta QA Test Plan

This plan is the release-candidate QA checklist for the PinFa MVP. It is intentionally scoped to stability, regression detection, and beta readiness. It does not authorize new product features.

## Severity

- P0 Blocker: app cannot start, build fails, database unusable, auth broken, public feed broken, major data leak, or admin access broken.
- P1 Critical: upload or moderation broken, published-content visibility leak, admin moderation/report actions fail, mobile feed broken, or Persian default/RTL broken.
- P2 Major: board/save, like/share/report, search, notifications, or ads are broken in normal flows.
- P3 Minor: visual polish, copy, non-blocking layout, or non-critical empty/loading state issues.

## Test Accounts

- SUPER_ADMIN seeded from `.env`: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`.
- MODERATOR account: create manually or update a test user role in Prisma Studio.
- Normal USER account: created through `/auth/register` or the smoke script.
- Optional second USER account for follow, like, save, report, and notification scenarios.

## Test Data

- Seeded `Category` records from the SDD.
- Seeded `SystemSetting` records:
  - `safe_search_thresholds`
  - `upload_limits`
  - `feed_ad_frequency`
- Seeded active `AdSlot` for `HOME_FEED_INLINE` and provider `YEKTANET`.
- At least one PUBLISHED Pin with processed image variants.
- At least one PENDING_REVIEW Pin for admin moderation.
- At least one Report for admin report management.
- At least one Board with and without saved Pins.

## Required Commands

Run from the repository root:

```powershell
cmd /c npx prisma validate
cmd /c npx prisma generate
cmd /c npx prisma migrate status
cmd /c npm run prisma:seed
cmd /c npm run build
cmd /c npm run lint
powershell.exe -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1
```

## Environment And Database Checklist

- [ ] PostgreSQL is running.
- [ ] `DATABASE_URL` points to the intended local beta database.
- [ ] Prisma schema validates.
- [ ] Prisma Client generates.
- [ ] Migrations are applied to the current `DATABASE_URL`.
- [ ] Seed completes successfully.
- [ ] SUPER_ADMIN exists.
- [ ] Required SystemSetting records exist.
- [ ] HOME_FEED_INLINE Yektanet AdSlot exists.
- [ ] App builds.
- [ ] Lint passes or accepted exceptions are documented.
- [ ] Dev server starts and `/api/health` returns healthy JSON.

## Core Route Smoke Checklist

Public/user routes:

- [ ] `/`
- [ ] `/feed` if present
- [ ] `/auth/register`
- [ ] `/auth/login`
- [ ] `/search`
- [ ] `/pins/[id]` for a PUBLISHED Pin
- [ ] `/users/[username]`
- [ ] `/boards/[id]`

Authenticated routes:

- [ ] `/profile`
- [ ] `/onboarding/interests`
- [ ] `/upload`
- [ ] `/notifications`

Admin routes:

- [ ] `/admin`
- [ ] `/admin/moderation`
- [ ] `/admin/reports`

Each page should avoid blank screens, show safe loading/empty/error states, and remain usable on mobile.

## Auth QA

- [ ] Register new user.
- [ ] Login by email.
- [ ] Login by username if supported.
- [ ] Logout.
- [ ] `/api/users/me` returns current user when logged in.
- [ ] `/api/users/me` returns 401 when logged out.
- [ ] Duplicate username/email returns a friendly error.
- [ ] Wrong password returns a friendly error.
- [ ] `passwordHash` is never exposed in API responses.
- [ ] Session cookie persists during navigation.
- [ ] Protected pages redirect or block logged-out users.

## Bilingual And RTL QA

- [ ] First visit defaults to Persian.
- [ ] `<html lang="fa" dir="rtl">` is present in Persian.
- [ ] FA/EN toggle works.
- [ ] Refresh preserves selected language.
- [ ] English sets `<html lang="en" dir="ltr">`.
- [ ] Persian uses Vazirmatn.
- [ ] English uses the Latin/system font stack.
- [ ] RTL does not break feed, header, forms, menus, dropdowns, admin pages, notifications, or search.
- [ ] Mobile feed remains two columns in Persian and English.

## Feed QA

- [ ] Guest feed loads.
- [ ] Authenticated feed loads.
- [ ] Only PUBLISHED Pins appear.
- [ ] PROCESSING, PENDING_REVIEW, REJECTED, REMOVED, DELETED, and DRAFT Pins do not appear.
- [ ] Personalized feed ranking still works for logged-in users.
- [ ] Cursor pagination works.
- [ ] Mobile feed is two columns.
- [ ] Desktop feed is image-first.
- [ ] PinCard actions are hidden/minimal by default.
- [ ] Desktop hover/menu works.
- [ ] Mobile three-dot menu works.
- [ ] Clicking a Pin opens `/pins/[id]`.
- [ ] Feed uses `imageFeedUrl`.
- [ ] Original protected image URLs are not exposed in feed.

## Upload, Image Processing, And Moderation QA

- [ ] Safe JPG upload works.
- [ ] Safe PNG upload works.
- [ ] Safe WEBP upload works.
- [ ] Invalid file type is rejected.
- [ ] Oversized file is rejected.
- [ ] File signature validation works.
- [ ] Sharp variants are created.
- [ ] ImageAsset becomes READY on successful processing.
- [ ] Pin moves to PENDING_REVIEW or moderation-derived status.
- [ ] SafeSearch runs when configured.
- [ ] SafeSearch failure falls back to PENDING_REVIEW.
- [ ] Safe image becomes PUBLISHED when approved.
- [ ] Risky image becomes REJECTED or PENDING_REVIEW.
- [ ] ModerationResult stores provider response or safe error context.

## Admin Moderation QA

- [ ] SUPER_ADMIN can access moderation.
- [ ] MODERATOR can access moderation.
- [ ] Normal USER cannot access moderation.
- [ ] Logged-out user cannot access moderation.
- [ ] Pending Pins appear.
- [ ] Approve works.
- [ ] Reject works.
- [ ] Remove works.
- [ ] AuditLog is created.
- [ ] ModerationResult reviewer fields update.
- [ ] UI handles missing image, category, or uploader safely.

## Boards And Save QA

- [ ] Create Board.
- [ ] Board appears on `/profile`.
- [ ] Board detail opens.
- [ ] Public user profile shows public Boards.
- [ ] Save PUBLISHED Pin to Board.
- [ ] Duplicate save is prevented.
- [ ] Remove Pin from Board.
- [ ] Pin.saveCount updates safely.
- [ ] Board.pinCount updates safely.
- [ ] Board cover updates.
- [ ] Follow Board.
- [ ] Unfollow Board.
- [ ] Non-owner cannot edit/add/remove from another user's Board.
- [ ] Logged-out user cannot save.

## Like, Share, And Report QA

- [ ] Like PUBLISHED Pin.
- [ ] Duplicate like is prevented.
- [ ] Unlike works.
- [ ] likeCount updates safely.
- [ ] Share works.
- [ ] shareCount updates.
- [ ] Report Pin works.
- [ ] Report Board works.
- [ ] Report User works.
- [ ] Duplicate report with same reason is prevented.
- [ ] User cannot report self.
- [ ] Logged-out user cannot like/report.
- [ ] Non-public Pins cannot be liked or reported.
- [ ] UserEvent records are created.

## Search QA

- [ ] Search page opens.
- [ ] Empty query is safe.
- [ ] Short query is safe.
- [ ] Search Pins by title/description.
- [ ] Search Boards by title/description.
- [ ] Search Users by username/displayName.
- [ ] Search Categories by name/slug.
- [ ] Only PUBLISHED Pins appear.
- [ ] Only PUBLIC Boards appear.
- [ ] Only ACTIVE Users appear.
- [ ] Disabled Categories do not appear.
- [ ] `type=all` grouped results work.
- [ ] Typed tabs work.
- [ ] Authenticated search creates SEARCH UserEvent.
- [ ] Guest search works.

## Native Ads QA

- [ ] Active AdSlot inserts ads.
- [ ] Ads appear after configured organic Pin count.
- [ ] Ad is not first item.
- [ ] Ads are not back-to-back.
- [ ] Feed works if AdSlot is inactive.
- [ ] Feed works if Yektanet config is missing.
- [ ] Mock/local fallback works when configured.
- [ ] Ad card is clearly labeled `تبلیغ` / `Advertisement`.
- [ ] Ad card fits mobile feed.
- [ ] Ad click logs AD_CLICKED.
- [ ] AdEvent records are created.
- [ ] Provider failure does not crash feed.

## Notifications QA

- [ ] Logged-out user cannot access notifications.
- [ ] Logged-in user sees only own notifications.
- [ ] Follow creates notification.
- [ ] Like creates notification for Pin owner.
- [ ] Save creates notification for Pin owner.
- [ ] Own actions do not notify self.
- [ ] Admin approve/reject creates notification for Pin owner.
- [ ] Report resolve creates notification for reporter.
- [ ] Unread count works.
- [ ] Mark one as read works.
- [ ] Mark all as read works.
- [ ] Missing actor/target does not crash page.

## Admin Reports QA

- [ ] SUPER_ADMIN can open `/admin/reports`.
- [ ] MODERATOR can open `/admin/reports`.
- [ ] Normal USER cannot open.
- [ ] Logged-out user cannot open.
- [ ] Reports list works.
- [ ] Filters work.
- [ ] Report detail/preview works.
- [ ] Resolve works.
- [ ] Reject works.
- [ ] Remove reported Pin works.
- [ ] Suspend reported User works.
- [ ] Admin cannot suspend self.
- [ ] MODERATOR cannot suspend SUPER_ADMIN.
- [ ] AuditLog records are created.

## Mobile QA

Test widths: 360px, 390px, 414px, and 430px.

- [ ] Feed remains two columns.
- [ ] Header does not overflow.
- [ ] Language toggle fits.
- [ ] Logo remains circular.
- [ ] Menus do not overflow off-screen.
- [ ] Auth forms fit.
- [ ] Upload form fits.
- [ ] Search page fits.
- [ ] Notifications page fits.
- [ ] Pin detail page is readable.
- [ ] Board detail page is readable.
- [ ] Admin pages are usable enough for emergency moderation.

## Security Sanity QA

- [ ] `passwordHash` is never returned.
- [ ] Email/phone are not exposed publicly.
- [ ] Admin APIs require admin role.
- [ ] Users cannot edit other users' profiles.
- [ ] Users cannot edit other users' Boards.
- [ ] Users cannot save into other users' Boards.
- [ ] Non-PUBLISHED Pins do not leak into feed/search/public Boards.
- [ ] Upload restrictions work.
- [ ] Raw internal stack traces are not exposed to browser.
- [ ] External ad links use `rel="noopener noreferrer"`.

## Go/No-Go Criteria

Ready for beta only if:

- [ ] Build passes.
- [ ] Health endpoint works.
- [ ] Auth works.
- [ ] Feed works.
- [ ] Upload/moderation works.
- [ ] Admin moderation works.
- [ ] Board/save works.
- [ ] Like/share/report works.
- [ ] Search works.
- [ ] Notifications work.
- [ ] Admin reports work.
- [ ] Bilingual FA/EN works.
- [ ] Persian default RTL works.
- [ ] Mobile feed two-column layout works.
- [ ] No P0 bugs remain.
- [ ] No unresolved P1 bugs remain.
- [ ] Any remaining P2/P3 issues are documented and accepted.

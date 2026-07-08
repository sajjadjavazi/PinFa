# Local Test Plan

This plan covers the MVP beta smoke path for local development.

## Prerequisites

- Node.js and npm installed.
- PostgreSQL running locally.
- `.env` created from `.env.example`.
- `DATABASE_URL` points to the same database used by Prisma Studio and the app.

## Start PostgreSQL

Use whichever local PostgreSQL setup you already use. For the default `.env.example`, the expected database is:

```powershell
postgresql://pinfa:pinfa_password@127.0.0.1:5432/pinfa?schema=public
```

Verify the database exists before running migrations.

## Prepare The Database

```powershell
npm install
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

If you need a clean local reset:

```powershell
npm run prisma:reset
npm run prisma:seed
```

## Start The App

```powershell
npm run dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/search`
- `http://localhost:3000/auth/register`
- `http://localhost:3000/auth/login`
- `http://localhost:3000/upload`
- `http://localhost:3000/profile`
- `http://localhost:3000/notifications`
- `http://localhost:3000/admin/moderation`
- `http://localhost:3000/admin/reports`

## Manual Smoke Scenarios

- Register a new user, log out, and log back in.
- Select onboarding interests.
- Upload a JPG, PNG, or WEBP under the configured upload limit.
- Confirm the uploaded Pin enters processing/moderation and does not appear publicly until published.
- Approve a pending Pin as `SUPER_ADMIN` or `MODERATOR`.
- Confirm the published Pin appears in the home feed, search, Pin detail, and public Board pages.
- Create a Board, save the published Pin, remove it from the Board, and verify counters.
- Like, unlike, share, and report the published Pin.
- Resolve or reject a report in `/admin/reports`.
- Confirm notifications appear for follow, like, save, moderation, and report resolution flows.
- Toggle mobile viewport and verify the feed remains two columns.

## Prisma Studio Checks

```powershell
npm run prisma:studio
```

Check these tables after smoke testing:

- `User`
- `UserSession`
- `Category`
- `Pin`
- `ImageAsset`
- `ModerationResult`
- `Board`
- `BoardPin`
- `Like`
- `Report`
- `Notification`
- `UserEvent`
- `AdEvent`
- `AuditLog`

## Build Checks

```powershell
npm run prisma:validate
npm run prisma:generate
npm run build
npm run lint
```

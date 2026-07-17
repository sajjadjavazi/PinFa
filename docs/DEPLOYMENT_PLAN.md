# Deployment Plan

## Recommended First Architecture

Use one Linux application instance behind Nginx or Caddy, a managed PostgreSQL database, and HTTPS. Until object storage is implemented, mount a dedicated persistent disk at the application's `storage/uploads` path and keep the app at one replica.

This is the smallest architecture compatible with the current code:

1. Nginx/Caddy terminates TLS and forwards only to the private Node listener.
2. One Node 22 LTS process runs `next start`.
3. Managed PostgreSQL provides backups and point-in-time recovery.
4. A persistent, backed-up media disk stores originals and variants.
5. Google Vision is configured with a least-privilege service account.
6. Yektanet is explicitly configured and tested, or ads are disabled.
7. Platform logs capture stdout/stderr and alert on health, 5xx rate, disk use, and database connectivity.

For public beta, S3-compatible object storage plus CDN should replace the local media disk before adding a second application instance.

## Minimum Capacity

For staging or a small invite-only beta:

- App host: 2 vCPU, 4 GB RAM, 40 GB SSD for OS/build/logs.
- Media: separate 50 GB persistent volume initially, with disk alerts and backups. Size from measured upload growth before launch.
- PostgreSQL: managed 2 vCPU, 4 GB RAM, 20 GB SSD with automated backups/PITR.
- If app and PostgreSQL must share one VM: start at 4 vCPU, 8 GB RAM, 80 GB SSD plus a separate media volume.

Sharp and scrypt are CPU/memory intensive. Do not reduce the app below 2 vCPU/4 GB without load testing, and keep upload concurrency low until processing moves to workers.

## Host Requirements

- 64-bit Linux with glibc and Node 22 LTS.
- npm matching the Node distribution.
- PostgreSQL compatible with the Prisma 6 PostgreSQL connector.
- Writable persistent path at `<release-working-directory>/storage/uploads`.
- Outbound HTTPS access to Google Vision and the ad provider.
- Inbound traffic only through ports 80/443; PostgreSQL and Node stay private.
- Time synchronization and enough file descriptors for Node/PostgreSQL traffic.

## Build And Release Commands

Run builds on Linux. Do not copy local Windows dependencies.

```bash
npm ci
npm run prisma:generate
npm run build
npm run prisma:migrate:deploy
```

Seed only for a new environment or an intentional seed refresh:

```bash
npm run prisma:seed
```

Start the application:

```bash
NODE_ENV=production npm run start -- -H 127.0.0.1 -p 3000
```

Verify liveness:

```bash
curl --fail --silent https://staging.example.com/api/health
```

The current health route does not verify PostgreSQL or media storage, so also run an authenticated staging smoke test and a test upload before promotion.

## Release Sequence

1. Provision managed PostgreSQL, private networking/firewall, app host, and persistent media storage.
2. Configure DNS and TLS on the reverse proxy.
3. Create production secrets from `docs/ENVIRONMENT_VARIABLES.md`; never reuse `.env.example` values.
4. Restore or initialize the database, then run `npm run prisma:migrate:deploy`.
5. Seed once with a generated admin hash, verify the admin account, rotate/remove seed credentials, and do not seed on every start.
6. Build and start the app with the same `NEXT_PUBLIC_APP_URL` used at runtime.
7. Verify `/api/health`, database connectivity, media-path write/read/delete behavior, and free disk space.
8. Upload a safe image and verify original privacy, three variants, moderation result, and publication state.
9. Verify manual moderation, report actions, audit logs, auth cookie flags, feed/search visibility, notifications, and ad disabled/fallback behavior.
10. Run the smoke script against staging only after adapting it to non-destructive staging accounts. The current script intentionally refuses non-local targets.
11. Enable monitoring and backups, perform a restore rehearsal, then open limited beta traffic.

## Nginx And TLS Assumptions

- Redirect HTTP to HTTPS and use a modern TLS configuration.
- Proxy `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`; block direct public access to Node so forwarded IP headers are trustworthy.
- Set `client_max_body_size` above the 10 MB application limit, for example 12 MB.
- Use conservative upload/proxy timeouts while Sharp and SafeSearch remain synchronous, then tighten them after background jobs exist.
- Do not cache authenticated/API responses globally. Published image variants may be cached according to their response headers.
- Add HSTS only after HTTPS and subdomain behavior are verified.

## Docker Decision

The repository currently has no Docker artifacts. The recommended first deployment is a conventional single Linux VM/process because local media storage already requires a persistent host path.

If Docker is selected, first add a tested multi-stage Linux image that:

- installs dependencies and generates Prisma Client in Linux;
- builds Next.js with the production public origin;
- includes the Prisma schema/migrations and Sharp runtime dependencies;
- runs as a non-root user;
- mounts `/app/storage/uploads` as a persistent volume;
- uses one replica until object storage is available;
- performs migrations as a one-off release job, not concurrently in every replica.

A staging Compose file may include PostgreSQL and named volumes, but production should prefer managed PostgreSQL and provider-managed backups.

## Rollback

1. Keep the previous application artifact and environment snapshot.
2. Take a database backup before migrations.
3. Prisma migrations are forward-only operationally; prepare a tested corrective migration rather than relying on automatic down migrations.
4. Do not roll database records back independently of uploaded media. Snapshot or version the media volume at the same release boundary.
5. On failed release, restore the previous app artifact, verify schema compatibility, check `/api/health`, and run focused smoke tests.

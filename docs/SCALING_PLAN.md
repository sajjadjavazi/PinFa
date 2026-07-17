# Scaling Plan

## Current Scaling Boundary

The current MVP is a single-process Next.js application backed by PostgreSQL. It performs upload validation, Sharp transformations, Google Vision SafeSearch, feed ranking, API work, and image delivery in the same application tier. Uploaded media is stored on local disk.

This design is appropriate for controlled staging and a small single-instance beta. The local filesystem is the first hard boundary: do not add a second app instance until media is shared through object storage.

## Phase 0 - Controlled Staging And Invite Beta

- Run one Node instance behind TLS with a persistent media volume.
- Use managed PostgreSQL with automated backups/PITR.
- Add rate limits at the reverse proxy and application boundary.
- Collect stdout/stderr JSON logs and alert on 5xx responses, latency, disk space, provider failures, and moderation queue depth.
- Keep upload concurrency conservative because Sharp, scrypt, and SafeSearch consume request resources.
- Measure request latency, feed query time, database connections, media growth, and moderation workload before changing architecture.

Exit criteria: stable restore drill, no P0/P1 security issues, known capacity envelope, and verified provider credentials/fallbacks.

## Phase 1 - Shared Object Storage And CDN

Introduce a `StorageProvider` contract with operations for put, get/stream, delete, existence/head, and public/private URL generation.

Implement an S3-compatible provider with:

- private originals;
- public or CDN-backed processed variants;
- deterministic namespaced keys;
- server-side encryption and lifecycle rules;
- CORS limited to the production origin where direct browser access is used;
- signed URLs for protected originals/admin access;
- object versioning or a tested backup policy.

Migration sequence:

1. Add provider abstraction while retaining local reads.
2. Dual-write new uploads to object storage during a short verification window, or pause uploads for cutover.
3. Copy existing keys from `storage/uploads` and verify size/checksum.
4. Backfill URLs/serve through provider keys without changing content visibility.
5. Switch reads to object storage/CDN.
6. Monitor 404/error rates, then retire local files after a rollback window.

Exit criteria: all instances can read all media, CDN cache policy is verified, and originals remain private.

## Phase 2 - Background Image And Moderation Workers

Move processing out of the upload request:

1. Upload stores the original and creates `Pin(PROCESSING)` plus `ImageAsset(UPLOADED)`.
2. A durable job processes Sharp variants.
3. A moderation job calls SafeSearch after processing.
4. Idempotent workers update status and store failure/retry context.
5. Dead-letter jobs appear in an operator dashboard and never auto-publish.

Use a managed queue or Redis-backed job system only after operational ownership is defined. Jobs need idempotency keys, bounded retries, exponential backoff, provider timeouts, and reconciliation for stuck `PROCESSING` records.

Exit criteria: upload requests return quickly, retries are observable, and worker failure cannot publish content.

## Phase 3 - Stateless Multi-Instance Application

- Run two or more stateless app replicas behind a load balancer.
- Keep sessions in PostgreSQL initially; no sticky sessions are required.
- Run migrations as one release job before new replicas receive traffic.
- Add readiness probes for PostgreSQL and object storage.
- Set a database connection budget per replica; use a provider pooler/PgBouncer only with Prisma-compatible settings.
- Autoscale from latency/CPU/queue depth, not request count alone.
- Keep provider credentials in a secret manager and rotate without rebuilding images where possible.

## Database Growth Plan

Near-term:

- monitor slow queries, locks, connection count, vacuum health, index size, and storage growth;
- preserve existing bounded page sizes;
- verify backups and point-in-time recovery;
- archive expired sessions and define retention for high-volume event tables.

Likely first growth tables are `UserEvent`, `AdEvent`, `Notification`, `AuditLog`, and `ModerationResult`. Add retention/archive jobs before considering partitioning. Add or change indexes only from measured query plans, not speculation.

For higher read volume:

- cache low-volatility category/system-setting/ad-slot reads;
- consider a read replica only for queries that tolerate replication lag;
- keep writes and permission checks on the primary;
- evaluate full-text search or a search service only when PostgreSQL `contains` search becomes a measured bottleneck.

## Feed Scaling

The personalized feed currently scores a bounded candidate pool in application memory. Preserve the explainable ranking behavior while traffic is small. Measure candidate-query and scoring time. Later options are precomputed candidate sets, cached interest/follow context, or database-assisted ranking, but these are not needed before evidence shows pressure.

Do not mix ad insertion into ranking. Continue ranking organic Pins first and insert provider items afterward.

## Reliability And Operations

- Define SLOs for availability, API latency, upload success, moderation latency, and image availability.
- Add request IDs across proxy/app logs and redact credentials, cookies, and sensitive provider errors.
- Alert on failed SafeSearch calls, pending-review age, failed image processing, ad-provider failure rate, database saturation, and media-storage capacity.
- Test dependency outages: PostgreSQL, object storage, Google Vision, and Yektanet.
- Keep failed SafeSearch behavior fail-closed to manual review.
- Run regular database and media restore drills together.

## Cost Controls

- Track original and variant bytes per upload and set lifecycle/retention rules.
- Serve feed/detail variants through CDN rather than Node.
- Cap upload size/concurrency and provider calls per user/IP.
- Track Google Vision calls against accepted uploads and monitor quota/cost.
- Sample noncritical analytics logs if volume becomes excessive while retaining audit and moderation records.

## Scaling Triggers

Move to the next phase when one or more measured conditions occur:

- a second app instance is required for availability or throughput;
- media disk growth/backup time exceeds the single-host operating window;
- p95 upload latency or timeout rate rises because processing is synchronous;
- database connections approach 70% of the safe budget;
- p95 feed/search latency misses the beta SLO;
- event tables materially increase vacuum/index cost;
- provider failure/retry work exceeds manual operations capacity.

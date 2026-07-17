# Environment Variables

Never commit production values. Store secrets in the deployment platform's secret manager and restrict access to operators who need them.

## Required Runtime Variables

| Variable | Required | Purpose | Production guidance |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma PostgreSQL connection string | Use a dedicated least-privilege app role, TLS as required by the provider, and a private endpoint. Do not use the example password. |
| `NEXT_PUBLIC_APP_URL` | Yes | Absolute metadata/canonical/OG base URL | Set the final HTTPS origin, without a trailing path, before both build and start. Example: `https://pinfa.example`. |
| `NODE_ENV` | Yes | Enables production Next.js behavior and secure cookies | Set to `production`. |

Platform variables commonly used by `next start`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Node listen port; default is 3000. |
| `HOSTNAME` | No | Listen address when provided by the platform. Prefer a private interface behind the reverse proxy. |

There is currently no application-level session secret. Session tokens are generated randomly and their hashes are stored in PostgreSQL.

## Google Vision SafeSearch

Configure one credential method, not several.

### Credential File

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_APPLICATION_CREDENTIALS` | Conditional | Absolute path to a mounted service-account JSON file. |

### Raw JSON

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Conditional | Complete service-account JSON supplied by a secret manager. |

### Split Credentials

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_VISION_CLIENT_EMAIL` | Conditional | Service-account client email. |
| `GOOGLE_VISION_PRIVATE_KEY` | Conditional | Service-account private key; escaped `\n` values are normalized. |

Project selection:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_CLOUD_PROJECT` | Usually | Google Cloud project ID. |
| `GOOGLE_VISION_PROJECT_ID` | Optional alias | Project ID fallback used by the provider. |

The code also accepts legacy aliases (`GOOGLE_CLOUD_CREDENTIALS_JSON`, `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`), but new deployments should use the canonical names above. If credentials fail, uploads go to `PENDING_REVIEW`; they are not auto-published.

## Yektanet

| Variable | Required | Purpose | Production guidance |
| --- | --- | --- | --- |
| `YEKTANET_ENABLED` | Yes if ads are intended | Enables provider availability | Set explicitly to `true` or `false`. |
| `YEKTANET_PUBLISHER_ID` | Conditional | Publisher identifier | Required for remote provider configuration. |
| `YEKTANET_WIDGET_ID` | Conditional | Widget identifier | Required for remote provider configuration. |
| `YEKTANET_PLACEMENT_ID` | Conditional | Placement identifier | Required for remote provider configuration. |
| `YEKTANET_SCRIPT_URL` | Optional | Provider script URL | Must be an HTTP(S) URL; prefer HTTPS. |
| `YEKTANET_LOCAL_MOCK_ENABLED` | No | Enables local native-ad placeholder | Set `false` or omit in production. |
| `YEKTANET_FORCE_FAILURE` | No | Failure-path test switch | Never enable in production. |

Database `AdSlot.providerConfigJson` can override provider values. Treat database ad configuration as privileged admin data. Disable the active slot or set `YEKTANET_ENABLED=false` until the real integration is accepted.

## Seed-Only Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SEED_ADMIN_EMAIL` | Yes for a new environment | Initial SUPER_ADMIN email. |
| `SEED_ADMIN_USERNAME` | Yes for a new environment | Initial SUPER_ADMIN username. |
| `SEED_ADMIN_DISPLAY_NAME` | Yes for a new environment | Initial SUPER_ADMIN display name. |
| `SEED_ADMIN_PASSWORD_HASH` | Preferred in production | Existing PinFa scrypt-format hash. Takes precedence over the raw password. |
| `SEED_ADMIN_PASSWORD` | Local/staging alternative | Raw password hashed by the seed using the application password helper. |

If neither password variable is present, seeding fails clearly. Do not keep a raw admin password in the long-lived runtime environment. The seed upsert can reset the seeded admin password, so run it deliberately and rotate credentials afterward.

## Storage Configuration

There is currently no storage environment variable. The application always uses:

```text
<process.cwd()>/storage/uploads
```

For the current single-instance deployment, mount a writable persistent volume at that path. This is a hard deployment requirement. A future object-storage implementation should introduce explicit variables such as bucket, region, endpoint, credentials, public CDN base URL, and private-original policy; those variables do not exist yet and must not be invented in the current deployment.

## Example Production Shape

Values below are placeholders only:

```dotenv
NODE_ENV="production"
DATABASE_URL="postgresql://pinfa_app:REDACTED@db.internal:5432/pinfa?schema=public&sslmode=require"
NEXT_PUBLIC_APP_URL="https://pinfa.example"

GOOGLE_APPLICATION_CREDENTIALS="/run/secrets/google-vision.json"
GOOGLE_CLOUD_PROJECT="pinfa-production"

YEKTANET_ENABLED="false"
YEKTANET_LOCAL_MOCK_ENABLED="false"
```

## Preflight Rules

1. Reject startup/release if `NEXT_PUBLIC_APP_URL` is localhost or non-HTTPS in production.
2. Verify database TLS and migration permissions separately from the lower-privilege runtime role where practical.
3. Verify the media path is writable and backed up.
4. Verify Google credentials without printing credential contents.
5. Verify mock/failure test switches are disabled.
6. Redact all URL passwords, private keys, cookies, and provider tokens from logs and support bundles.

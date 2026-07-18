# Shree Maruti Vendor Billing

Next.js vendor billing management app for **Shree Maruti Integrated Logistics Limited**, with PostgreSQL (Prisma) and S3-compatible invoice storage.

## Prerequisites

- Node.js 20+
- PostgreSQL database
- S3-compatible storage (AWS S3, RustFS, MinIO, Cloudflare R2, etc.)

## RustFS / self-hosted S3 setup

This app uses the AWS SDK with settings recommended for [RustFS](https://docs.rustfs.com/developer/sdk/javascript.html):

| Setting | Value |
|---------|--------|
| `S3_ENDPOINT` | Your RustFS API URL, e.g. `http://localhost:9000` or `https://s3.example.com` |
| `S3_REGION` | Any value (RustFS does not validate), e.g. `us-east-1` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | RustFS credentials |
| `S3_BUCKET` or `S3_BUCKET_NAME` | Bucket name for invoices |
| `S3_FORCE_PATH_STYLE` | Auto-enabled for non-AWS endpoints (required for RustFS) |
| `S3_TLS_REJECT_UNAUTHORIZED` | Set to `false` if using HTTPS with a self-signed certificate |

Example `.env` for local RustFS:

```env
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="rustfsadmin"
S3_SECRET_ACCESS_KEY="rustfssecret"
S3_BUCKET="coldverse-invoices"
```

Example for HTTPS with a private/self-signed cert (like a hosted RustFS gateway):

```env
S3_ENDPOINT="https://s3.intoship.cloud"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="your-key"
S3_SECRET_ACCESS_KEY="your-secret"
S3_BUCKET_NAME="coldverse-invoices"
S3_TLS_REJECT_UNAUTHORIZED="false"
```

Create the bucket in RustFS before uploading invoices (via console on port 9001 or `aws s3 mb`).

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Configure `DATABASE_URL`, S3 variables, auth variables, and (optionally) Resend in `.env`:

```env
BETTER_AUTH_SECRET=""          # openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"
SEED_ADMIN_EMAIL="admin@shreemaruti.com"
SEED_ADMIN_PASSWORD="ChangeMe123!"
SEED_ADMIN_NAME="Shree Maruti Admin"
RESEND_API_KEY=""              # optional locally — emails are skipped if empty
RESEND_FROM_EMAIL="Shree Maruti Billing <billing@yourdomain.com>"
```

3. Apply database schema:

```bash
npm run db:migrate
# or for quick local setup without migration history:
npm run db:push
```

4. Seed default data (requires S3 credentials):

```bash
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

## Admin authentication

The admin console requires email/password login via [better-auth](https://www.better-auth.com). The vendor portal (`/portal/<vendorToken>`) is public with OTP verification.

- **Login:** `/login`
- **Account & Settings:** `/settings` — Profile, Users, and Workspace (company + email prefs) in one console tab (User menu → Profile / Users / Workspace)
- Legacy `/profile` and `/users` redirect into the Settings hub

Transactional emails (invoice upload, vendor registration, KYC verified, invoice status change) are sent via [Resend](https://resend.com) when `RESEND_API_KEY` is set and the matching toggle is enabled on Settings → Workspace.

After running `npm run db:seed`, sign in with the credentials from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in your `.env` (default dev: `admin@shreemaruti.com` / `ChangeMe123!`). Change the password after first login.

From the repository root, you can also run:

```bash
npm run dev:next
```

## API

All endpoints match the legacy Express app under `/api/*`:

- Vendors, invoices, hubs, categories, stats, archive
- Vendor portal OTP flow (`/portal/<vendorToken>`)
- Invoice upload (base64 JSON) and S3-backed download/view

## UI components

Form dropdowns and date fields use [shadcn/ui](https://ui.shadcn.com) wrapped in branded components:

- `src/components/coldverse-select.tsx` — styled Select (violet/orange focus variants)
- `src/components/coldverse-date-field.tsx` — Popover + Calendar date picker

shadcn primitives live in `components/ui/`. Theme tokens in `app/globals.css` map to the Shree Maruti brand palette (`#1a4294`).

## Legacy App

The original Vite + Express app remains in the repository root for reference (`server.ts`, `src/`).

## Docker / Coolify deployment

Build and run from the `next-app/` directory (set this as the **build context** in Coolify).

### Build

```bash
cd next-app
docker build -t coldverse-vendors .
```

### Run (example)

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/cldv_vendors" \
  -e BETTER_AUTH_SECRET="your-secret" \
  -e BETTER_AUTH_URL="https://vendors.yourdomain.com" \
  -e S3_ENDPOINT="https://s3.example.com" \
  -e S3_ACCESS_KEY_ID="..." \
  -e S3_SECRET_ACCESS_KEY="..." \
  -e S3_BUCKET_NAME="coldverse-invoices" \
  -e RUN_DB_MIGRATIONS=true \
  -e SEED_ADMIN_ON_STARTUP=true \
  -e SEED_ADMIN_EMAIL="admin@shreemaruti.com" \
  -e SEED_ADMIN_PASSWORD="ChangeMe123!" \
  coldverse-vendors
```

### Startup environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RUN_DB_MIGRATIONS` | `true` | Run `prisma migrate deploy` before starting the app |
| `SEED_ADMIN_ON_STARTUP` | `false` | Create bootstrap admin if no users exist (requires `SEED_ADMIN_*`) |
| `PORT` | `3000` | HTTP port (Coolify usually sets this automatically) |
| `HOSTNAME` | `0.0.0.0` | Bind address for Next.js |

Set `RUN_DB_MIGRATIONS=false` after the first deploy if you prefer to run migrations manually.

Set `SEED_ADMIN_ON_STARTUP=true` on the **first deploy only**, then turn it off. The seed is idempotent (skips if any user already exists).

### Coolify checklist

1. **Build context / Dockerfile path:** `next-app` / `Dockerfile`
2. **Port:** expose `3000`
3. **Database:** attach PostgreSQL; set `DATABASE_URL`
4. **Required env:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your public app URL), S3 variables
5. **First deploy:** `RUN_DB_MIGRATIONS=true`, `SEED_ADMIN_ON_STARTUP=true`, plus `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
6. **Subsequent deploys:** keep `RUN_DB_MIGRATIONS=true` (or disable if you manage migrations separately); set `SEED_ADMIN_ON_STARTUP=false`

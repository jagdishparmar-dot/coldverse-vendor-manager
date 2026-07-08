#!/bin/sh
set -e

cd /app

RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-true}"
SEED_ADMIN_ON_STARTUP="${SEED_ADMIN_ON_STARTUP:-false}"

if [ "$RUN_DB_MIGRATIONS" = "true" ]; then
  echo "[startup] Running Prisma migrations (RUN_DB_MIGRATIONS=true)..."
  npx prisma migrate deploy
else
  echo "[startup] Skipping Prisma migrations (RUN_DB_MIGRATIONS=false)."
fi

if [ "$SEED_ADMIN_ON_STARTUP" = "true" ]; then
  echo "[startup] Seeding admin user if none exists (SEED_ADMIN_ON_STARTUP=true)..."
  npx tsx --tsconfig tsconfig.json scripts/seed-admin-only.ts
else
  echo "[startup] Skipping admin seed (SEED_ADMIN_ON_STARTUP=false)."
fi

echo "[startup] Starting Next.js on port ${PORT:-3000}..."
exec npm start

# Phased route migration

## Phase 1 (done) — URL-backed admin sections

Admin console tabs map to App Router paths while `src/App.tsx` remains the shared client shell (mounted once in `app/(admin)/layout.tsx` so soft navigations do not remount/refetch).

| Path | Section |
|------|---------|
| `/dashboard` | Analytics |
| `/vendors` | Manage Vendors |
| `/invoices` | Invoice logs |
| `/hubs` | Logistics Hubs |
| `/remarks` | Remarks Summary |
| `/kyc` | KYC Approvals |
| `/archive` | Archive |
| `/?token=…` | Vendor portal (unchanged) |

- Nav uses Next.js `Link`
- Auth (`proxy.ts`) guards the new admin paths
- Logged-in `/` without token → `/dashboard`
- Vendor share links always use `/?token=…`

Route map: `src/constants/adminRoutes.ts`

## Phase 2 (paused) — extract page modules

Paused after a failed extraction attempt. `src/App.tsx` was restored from git (`HEAD` / pre–Phase 1 working tree) and Phase 1 URL wiring was re-applied cleanly. Incomplete `src/features/admin` extraction was removed.

When restarting Phase 2, extract one tab at a time (start with dashboard/hubs/kyc wrappers) and keep a git commit after each successful extract. Avoid large automated rewrites of `App.tsx`.

## Phase 3 — portal route

Move portal to `/portal/[token]` (or `/p/[token]`) and stop mixing portal into `App` admin mode.

## Phase 4 — optional RSC / server loaders

Load stats/lists on the server where it helps; keep forms client-side.

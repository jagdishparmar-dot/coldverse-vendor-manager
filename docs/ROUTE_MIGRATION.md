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

- Nav uses Next.js `Link`
- Auth (`proxy.ts`) guards the new admin paths
- Logged-in `/` without token → `/dashboard`

Route map: `src/constants/adminRoutes.ts`

## Phase 2 (done) — extract page modules

Admin tab UI lives under `src/features/admin/views/`:

| View | Tab |
|------|-----|
| `DashboardView` | Analytics |
| `VendorsView` | Manage Vendors |
| `InvoicesView` | Invoice logs |
| `HubsView` | Logistics Hubs |
| `RemarksView` | Remarks Summary |
| `KycView` | KYC Approvals |
| `ArchiveView` | Archive |

Shared helpers: `src/features/admin/utils.ts`. `App.tsx` still owns data fetching, modals, and print/preview.

## Phase 3 (done) — portal route

Vendor portal extracted to dedicated route `/portal/[token]`:

| Path | Component |
|------|-----------|
| `/portal/[token]` | `src/features/portal/VendorPortal.tsx` |

- `app/portal/[token]/page.tsx` renders the `VendorPortal` component
- `VendorPortal` accepts a `token` prop and handles OTP, KYC, upload, and invoice editing
- Old `/?token=x` URLs redirect to `/portal/x` (handled at proxy level)
- Portal routes are public (no auth required)
- `App.tsx` is now admin-only (no `initialVendorToken` prop)
- Share links use `portalShareUrl()` from `src/constants/portalRoutes.ts`

Route helpers: `src/constants/portalRoutes.ts`

## Phase 4 — optional RSC / server loaders

Load stats/lists on the server where it helps; keep forms client-side.

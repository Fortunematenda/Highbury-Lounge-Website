# Highbury Lounge Website

Monorepo:

- `web/` — public website, booking APIs, and admin portal (`/admin`)
- `admin/` — reserved for a future split; the live admin UI currently ships inside `web` at `/admin` so it shares the Cloudflare D1 database

## Prerequisites

- Node.js `>=22.13.0`

## Setup

```bash
npm install
cd web
npx wrangler d1 migrations apply highbury-lounge-d1 --local
npm run dev
```

From the repo root you can also run:

```bash
npm run dev
```

Open:

- Site: http://localhost:5173/
- Admin: http://localhost:5173/admin/login

### Seed data

With the dev server running:

```bash
curl -X POST http://localhost:5173/api/seed
```

Default admin (created by seed):

- Email: `admin@highbury.com`
- Password: `HighburyAdmin123!`

Change this immediately in production. Protect seed in production with `SEED_KEY` and header `x-seed-key`.

## Managing menus and products

Use **Admin → Menus & Products** (`/admin/menus`) to manage categories, food/drinks/extras, pricing, availability and images.

### Categories

1. Open Menus & Products → **Menu Categories** (or use **Add Category**).
2. Set name, optional description, item type and active status.
3. Slugs are auto-generated from the name and can be edited; they must stay unique.
4. Reorder with up/down controls. Archive instead of deleting when items still belong to the category (or move items first).

### Menu items

1. Click **Add Menu Item** (or Edit from the items table).
2. Fill name, type, category, descriptions and pricing (standard / promotional).
3. Set availability, featured, pre-order and booking/conference eligibility as needed.
4. Food/catering types show dietary fields (vegetarian, vegan, allergens, etc.).
5. Archive prefers soft-delete; permanent delete is blocked when the item is linked to bookings.

### Uploading pictures

- Supported formats: **JPG, JPEG, PNG, WebP**
- Default max size: **5 MB** (`MAX_MENU_IMAGE_SIZE_MB`)
- Upload featured and gallery images from the item form; previews appear before save
- Files are stored in **Cloudflare R2** (binding `UPLOADS`), not as base64 in D1
- Public URLs use `PUBLIC_UPLOAD_BASE_URL` (default `/uploads/...`)
- Metadata (filename, MIME, size, featured flag, order) is stored in `menu_item_images`

Storage survives Worker redeploys because objects live in the R2 bucket `highbury-lounge-uploads` (see `web/wrangler.toml`). There is no local Docker volume on this stack — back up / restore via the Cloudflare R2 dashboard or Wrangler R2 commands.

### Menu-related migrations

```bash
cd web
npx wrangler d1 migrations apply highbury-lounge-d1 --local
# Production (remote D1):
# npx wrangler d1 migrations apply highbury-lounge-d1 --remote
```

Relevant migration: `web/drizzle/0001_menu_products_expand.sql`

### Roles

| Role | Menus access |
| --- | --- |
| Administrator | Full create/edit/archive/delete |
| Content Manager | Create, edit, images, activate/archive categories & items |
| Booking Manager | View items for bookings; no permanent delete |

## Environment

Copy `web/.env.example`. Important variables:

| Variable | Purpose |
| --- | --- |
| `SEED_KEY` | Required to run `/api/seed` in production |
| `MAX_MENU_IMAGE_SIZE_MB` | Max menu image upload size (default `5`) |
| `PUBLIC_UPLOAD_BASE_URL` | Public path prefix for R2-served uploads (default `/uploads`) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional email delivery |
| Future `PAYMENT_*` | Reserved for payment gateway |

Without SMTP, notifications are stored with status `unconfigured` and are **not** marked sent.

## Database

- ORM: Drizzle
- Engine: Cloudflare D1 (SQLite)
- Schema: `web/db/schema.ts`
- Migrations: `web/drizzle/`
- Uploads: Cloudflare R2 binding `UPLOADS`

Generate a new migration:

```bash
cd web
npx drizzle-kit generate --name describe_change
npx wrangler d1 migrations apply highbury-lounge-d1 --local
```

## How availability works

A booking overlaps requested dates when:

`existingCheckIn < requestedCheckOut` AND `existingCheckOut > requestedCheckIn`

Counted statuses: Pending, Awaiting Payment, Confirmed, Checked In.

Ignored: Declined, Cancelled, Checked Out, No Show, Expired.

Pending bookings expire after the configured hours (default 24) and stop blocking inventory.

Available count = room inventory − overlapping active bookings − overlapping room blocks.

Final booking submission rechecks availability before commit.

## Managing rooms and prices

Use **Admin → Rooms** to edit inventory, prices and promo rates.  
Use **Admin → Pricing** for rule overview.  
Historical bookings store a pricing snapshot and do not change when rates are updated later.

## Notifications

Templates cover booking received/confirmed/declined/awaiting payment/cancelled and conference enquiry events. Attempts are logged under **Admin → Notifications**.

## Payments (prepared, not live)

Payment rows and statuses (Unpaid, Partially Paid, Paid, Refunded, Failed) exist. Admins can record cash / bank transfer / mobile money / manual card. No gateway and no card storage yet.

## Guest booking flow

1. Home search → `/rooms/search`
2. Reserve → `/book`
3. Success → `/book/success` (Pending, awaiting confirmation)

Conference enquiries: `/conference`

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite (web workspace) |
| `npm run build -w web` | Production build (Linux Sites scripts) |
| `cd web && npx drizzle-kit generate` | Create migration |
| `cd web && npx wrangler d1 migrations apply highbury-lounge-d1 --local` | Apply local migrations |

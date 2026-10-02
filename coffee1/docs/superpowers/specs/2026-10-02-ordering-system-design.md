# Altura Coffee Ordering System — Design

Date: 2026-10-02

## Goal

Turn the static Altura Coffee site into a working ordering system. Customers order café pickup items and shipped bean bags in one cart. Staff process the orders. Payment is simulated; everything else is real.

Frontend and backend are deployed separately: static site on one host, Node API on another, Postgres on Supabase.

## Decisions (agreed)

- Scope: café pickup **and** bean bags (pickup or ship) in one cart.
- Real backend, simulated payment, behind an interface so Stripe can replace it later.
- Staff auth: single shared passcode (no accounts).
- Database: Postgres on Supabase, accessed as plain Postgres via `DATABASE_URL` (no Supabase client/auth).
- Two deployments: static frontend + Express backend.
- Existing GSAP design and visual language are preserved; new UI matches it.

## Architecture

Browser → `fetch` → Express API → Postgres.

- Frontend origin and API origin differ. API enforces a CORS allowlist from `FRONTEND_ORIGIN`.
- Staff auth uses a bearer token (JWT), not cookies, to avoid cross-site cookie issues.
- Frontend reads the API base URL from `config.js` (one file to edit per environment).
- Repo layout: existing site files stay at `coffee1/` root; backend lives in `coffee1/backend/`.

## Data model

`products`: id, kind (`drink` | `food` | `beans`), name, note, price_cents, available, sort order.

`orders`: id, public code (e.g. `ALT-4K9F`, unguessable enough to act as the customer's status-page key), customer name, email, fulfilment (`pickup` | `ship`), pickup_slot, shipping address fields, status, total_cents, idempotency_key (unique), created_at, updated_at.

`order_items`: order_id, product_id, name snapshot, unit price_cents snapshot, qty.

Seed data comes from the current menu (14 items, 4 groups) and `BEANS` (3 lots) in the HTML/JS. The site then loads products from the API.

## API

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/health` | none | liveness |
| `GET /api/products` | none | menu and beans |
| `GET /api/slots` | none | 15-minute pickup slots inside opening hours, with remaining capacity |
| `POST /api/orders` | none | create order; server recomputes total; honours idempotency key |
| `GET /api/orders/:code` | none (code is the key) | customer status |
| `POST /api/staff/login` | passcode | returns signed token |
| `GET /api/staff/orders` | staff | list orders, filterable by status |
| `PATCH /api/staff/orders/:id/status` | staff | advance or cancel |

## Status flow

- Pickup: `new → preparing → ready → completed`
- Ship: `new → preparing → shipped`
- Cancel allowed from any non-terminal state.
- Illegal transitions are rejected with 409.

An order containing beans may be pickup or ship. Orders with only drinks/food are pickup only. Shipping applies to the whole order when chosen, so ship orders must contain only bean items.

## Payment

`payments.js` exposes `charge({ amount_cents, card })`. The simulated implementation approves test card `4242 4242 4242 4242` and declines `4000 0000 0000 0002`; other numbers fail validation. Payment runs inside order creation; a decline creates no order. Swapping in Stripe replaces this module only.

## Frontend

- Cart drawer; cart persisted in `localStorage`.
- "Add" controls on menu rows and bean cards.
- The "Order ahead" tab opens the cart (replaces the `mailto:`).
- Checkout view: contact details, fulfilment choice, slot picker or address, simulated card form.
- `order.html?code=…`: customer status page, polls every 5 s.
- `staff.html`: passcode gate and a live board with one column per status, polling every 5 s.
- Motion respects `prefers-reduced-motion`, as the existing site does.

## Safety and errors

- Prices and totals never come from the client; items are priced from the database.
- Request validation on every write endpoint; unavailable or unknown products are rejected.
- Slot capacity checked transactionally at order creation.
- Idempotency key makes retried `POST /api/orders` return the original order rather than a duplicate.
- Rate limiting on order creation and staff login.
- `helmet`, CORS allowlist, secrets (`STAFF_PASSCODE`, `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_ORIGIN`) only via env vars.
- Consistent JSON error shape `{ error: { code, message } }`; the frontend shows human-readable messages.

## Testing

API tests with `node:test` and supertest against a test database. Coverage: server-side price recomputation, ship-only-beans rule, status transitions (legal and illegal), idempotent retry, slot capacity, payment approve/decline, staff auth required. Final check: browser run-through of the full flow (add to cart, checkout, staff advances, customer sees the update).

## Deployment

- Frontend: any static host, no build step; set `config.js` API URL.
- Backend: Node host (Render, Railway or Fly); `npm start`; env vars as above; `/api/health` for health checks.
- Database: Supabase project; schema applied via migration; seed script for products.
- Deploy notes documented in `backend/README.md`. Nothing is deployed without explicit approval.

## Out of scope

Real payments, emails or SMS notifications, staff accounts, inventory counts, order editing by customers, refunds.

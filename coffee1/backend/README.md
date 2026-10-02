# Altura API

Express + Postgres. Orders, pickup slots, simulated payments, staff board API.

## Run locally

    cd backend
    npm install
    npm run dev          # in-memory dev database, seeded; http://localhost:3000
    npm test

Serve the site (any static server) on http://localhost:5173, for example `npx serve -l 5173 ..` from `backend/`.
Staff board: `/staff.html`, passcode `altura-dev` in development.

## Environment

See `.env.example`. Required in production: `DATABASE_URL`, `STAFF_PASSCODE`, `JWT_SECRET`, `FRONTEND_ORIGIN`
(exact origin(s) of the deployed site, comma separated, no trailing slash). Optional: `CAFE_TZ`, `SLOT_CAPACITY`,
`LEAD_MINUTES`, `AUTO_MIGRATE`, `DATABASE_SSL`.

## Database (Supabase)

1. Use the **session pooler** connection string from the Supabase project (Project Settings → Database) as `DATABASE_URL`;
   the direct host is IPv6-only on most platforms.
2. Apply the schema: `DATABASE_URL=... npm run migrate`, then load the menu: `DATABASE_URL=... npm run seed`.
3. RLS is enabled on every table with no policies, so the public Supabase API cannot read orders;
   the backend's direct connection bypasses RLS.

## Deploy

- **Backend** (Render / Railway / Fly): root directory `coffee1/backend`, build `npm install`, start `npm start`,
  health check `/api/health`. Set the env vars above. Deploy it first so you have its URL.
- **Frontend** (Vercel / Netlify / Cloudflare Pages): publish the `coffee1/` directory as-is (no build step).
  Edit `config.js` so `window.ALTURA_API` is the backend's URL. On Vercel, `.vercelignore` keeps `backend/` and `docs/` out.
  Then set the backend's `FRONTEND_ORIGIN` to the frontend's URL and restart the backend.
- Smoke test after deploying: `/api/health`, load the site, place an order with `4242 4242 4242 4242`, sign in at `/staff.html`.

## Changing things later

- Menu and prices: edit `src/db/products-data.js`, then `npm run seed` (upserts by sku).
- Real payments: replace `src/payments.js` (`charge({ amountCents, card })`); the call runs inside the order transaction.

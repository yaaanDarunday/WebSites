# Altura Ordering System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static Altura Coffee site into a working ordering system: customers order café pickup items and bean bags, staff process orders, payment is simulated.

**Architecture:** Existing static site (frontend, no build step) calls a separate Node/Express JSON API (`coffee1/backend/`) backed by Postgres on Supabase. The API prices every order server-side, enforces a status state machine, and serves a staff board behind a shared passcode (JWT bearer). Local dev and tests use in-process PGlite (real Postgres in WASM) behind a two-method DB adapter, so the same SQL runs everywhere.

**Tech Stack:** Node >= 20 (CommonJS), Express 5, `pg`, `@electric-sql/pglite`, zod 3, jsonwebtoken, helmet, cors, express-rate-limit, `node:test` + supertest. Frontend: vanilla JS classic scripts (existing GSAP site), no bundler.

**Spec:** `docs/superpowers/specs/2026-10-02-ordering-system-design.md`

## Global Constraints

- Two deployments: static frontend (`coffee1/`) and API (`coffee1/backend/`); cross-origin, CORS allowlist from `FRONTEND_ORIGIN`; staff auth is a bearer token, not cookies.
- Postgres on Supabase accessed as plain Postgres through `DATABASE_URL` (no Supabase client/auth). RLS enabled on all three tables with no policies.
- Money is integer cents everywhere; prices and totals are never taken from the client.
- Order status flows: pickup `new → preparing → ready → completed`; ship `new → preparing → shipped`; cancel from any non-terminal state; illegal transitions return 409.
- Ship orders may contain only `beans` items; drink/food orders are pickup only.
- Payment is simulated behind `payments.js`: `4242 4242 4242 4242` approves, `4000 0000 0000 0002` declines; card data is never stored or logged.
- Error shape is always `{ "error": { "code", "message", "details"? } }`.
- Pickup slots are 15 minutes inside opening hours (Sun 8–16, Mon–Fri 7–17, Sat 8–16), today + tomorrow, in `CAFE_TZ`, capacity `SLOT_CAPACITY` per slot.
- Secrets (`STAFF_PASSCODE`, `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_ORIGIN`) come only from env vars. Nothing is deployed without explicit user approval.
- The existing GSAP design language is preserved; new UI uses the existing CSS variables and fonts and respects `prefers-reduced-motion`.
- Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Run all commands from `C:\Projects\WebSites\coffee1` unless told otherwise (Git Bash syntax shown).

## Review Focus

Failure modes the spec implies that no single feature test would otherwise pin; each has a test or browser check in the named task.

1. **Two people grab the last slot at the same moment** — exactly one order succeeds, the other gets 409 `slot_full` (Task 5).
2. **Customer status endpoint leaking PII** — response must not contain email, address, or internal numeric id (Task 5).
3. **HTML in a customer name** (`<img src=x onerror=…>`) — stored verbatim, rendered as text on the status page and staff board, never as markup (Tasks 11, 12 browser checks).
4. **Corrupted or stale cart in `localStorage`** (bad JSON, SKU no longer sold, qty out of range) — site still loads, cart self-heals (Task 7).
5. **API down or slow** — brochure site still renders with static prices, add-to-order is disabled with a clear message, no uncaught errors (Task 8).

---

## File Structure

```
coffee1/
  index.html, main.js, styles.css        (modify)
  config.js                              window.ALTURA_API
  util.js                                h(), money()
  api.js                                 fetch wrapper → window.AlturaAPI
  cart-store.js                          pure cart state (node-testable)
  shop.js                                load products, decorate menu/beans, window.Altura
  cart-ui.js                             drawer + cart panel + tab badge
  checkout.js                            checkout panel
  shop.css                               all new styles
  order.html, order.js                   customer status page
  staff.html, staff.js                   passcode gate + live board
  .vercelignore                          keep backend/ and docs/ out of the static deploy
  backend/
    package.json, .env.example, .gitignore, README.md
    src/server.js                        listen + startup (migrate/seed in dev)
    src/app.js                           createApp({ db, config, now })
    src/config.js                        loadConfig(env)
    src/errors.js                        ApiError, errorHandler
    src/validate.js                      zod schemas + parse()
    src/limits.js                        rate limiters
    src/auth.js                          passcode check, JWT sign, requireStaff
    src/hours.js                         HOURS, tz helpers, listSlotTimes
    src/status.js                        FLOWS, nextStatuses, canTransition
    src/payments.js                      simulated charge()
    src/orders.js                        createOrder, getOrderByCode, listOrders, updateStatus, views
    src/routes/public.js                 products, slots, orders
    src/routes/staff.js                  login, list, patch status
    src/db/index.js                      createDb(config): { query, exec, tx, close, driver }
    src/db/schema.sql
    src/db/migrate.js
    src/db/products-data.js
    src/db/seed.js
    test/support/app.js                  makeTestDb, makeTestApp
    test/*.test.js
```

---

### Task 1: Backend scaffold, database layer and seed

**Files:**
- Create: `backend/package.json`, `backend/.gitignore`, `backend/.env.example`
- Create: `backend/src/config.js`, `backend/src/db/index.js`, `backend/src/db/schema.sql`, `backend/src/db/migrate.js`, `backend/src/db/products-data.js`, `backend/src/db/seed.js`
- Test: `backend/test/support/app.js`, `backend/test/db.test.js`, `backend/test/config.test.js`

**Interfaces:**
- Produces: `loadConfig(env = process.env) → config` with fields `{ prod, port, databaseUrl, databaseSsl, frontendOrigins: string[], staffPasscode, jwtSecret, cafeTz, slotCapacity, leadMinutes, rateLimit: { orders, status, login: { windowMs, max } } }`
- Produces: `createDb(config) → Promise<{ driver, query(text, params?) → Promise<{rows}>, exec(sql), tx(fn(txq)) → Promise<T>, close() }>` where `txq = { query(text, params?) }`
- Produces: `migrate(db)`, `seedProducts(db)`, `PRODUCTS` array
- Produces (test): `makeTestDb() → db` (in-memory, migrated, seeded)

- [ ] **Step 1: Create the package and install dependencies**

```bash
mkdir -p backend/src/db backend/src/routes backend/test/support
cd backend
cat > package.json <<'EOF'
{
  "name": "altura-api",
  "private": true,
  "version": "1.0.0",
  "main": "src/server.js",
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node src/server.js",
    "migrate": "node src/db/migrate.js",
    "seed": "node src/db/seed.js",
    "test": "node --test --test-concurrency=1"
  }
}
EOF
npm install express@5 cors helmet express-rate-limit jsonwebtoken zod@3 pg dotenv @electric-sql/pglite
npm install --save-dev supertest
printf 'node_modules/\n.env\n' > .gitignore
cat > .env.example <<'EOF'
# Backend environment. Copy to .env for local use; set these in the host's dashboard in production.
NODE_ENV=development
PORT=3000
# Leave DATABASE_URL empty in development to use an in-memory PGlite database (seeded on start).
# Production (Supabase): use the *session pooler* connection string, not the direct IPv6 one.
DATABASE_URL=
DATABASE_SSL=true
# Comma-separated list of exact frontend origins allowed by CORS.
FRONTEND_ORIGIN=http://localhost:5173
STAFF_PASSCODE=altura-dev
JWT_SECRET=dev-secret-change-me
CAFE_TZ=America/Bogota
SLOT_CAPACITY=6
LEAD_MINUTES=15
# Set to true to run schema.sql on every boot (idempotent) against DATABASE_URL.
AUTO_MIGRATE=false
EOF
cd ..
```

- [ ] **Step 2: Write the failing tests**

`backend/test/support/app.js`:

```js
const { createDb } = require("../../src/db");
const { migrate } = require("../../src/db/migrate");
const { seedProducts } = require("../../src/db/seed");

async function makeTestDb() {
  const db = await createDb({ databaseUrl: null, prod: false });
  await migrate(db);
  await seedProducts(db);
  return db;
}

module.exports = { makeTestDb };
```

`backend/test/config.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadConfig } = require("../src/config");

test("development gets safe defaults and no database url", () => {
  const c = loadConfig({});
  assert.equal(c.prod, false);
  assert.equal(c.port, 3000);
  assert.equal(c.databaseUrl, null);
  assert.deepEqual(c.frontendOrigins, ["http://localhost:5173"]);
  assert.equal(c.slotCapacity, 6);
  assert.equal(c.leadMinutes, 15);
});

test("production refuses to start without its secrets", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production" }), /DATABASE_URL/);
  assert.throws(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://x" }), /STAFF_PASSCODE/);
  assert.throws(() => loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://x", STAFF_PASSCODE: "p" }), /JWT_SECRET/);
});

test("production reads origins, passcode and numbers from env", () => {
  const c = loadConfig({
    NODE_ENV: "production", DATABASE_URL: "postgres://x", STAFF_PASSCODE: "p", JWT_SECRET: "s",
    FRONTEND_ORIGIN: "https://a.example, https://b.example", SLOT_CAPACITY: "3", PORT: "8080",
  });
  assert.equal(c.prod, true);
  assert.deepEqual(c.frontendOrigins, ["https://a.example", "https://b.example"]);
  assert.equal(c.slotCapacity, 3);
  assert.equal(c.port, 8080);
});
```

`backend/test/db.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { makeTestDb } = require("./support/app");
const { migrate } = require("../src/db/migrate");
const { seedProducts } = require("../src/db/seed");

let db;
test.before(async () => { db = await makeTestDb(); });
test.after(() => db.close());

test("seed loads the 17 products from the site", async () => {
  const { rows } = await db.query("select kind, count(*)::int as n from products group by kind order by kind");
  assert.deepEqual(rows, [{ kind: "beans", n: 3 }, { kind: "drink", n: 11 }, { kind: "food", n: 3 }]);
});

test("migrate and seed are idempotent", async () => {
  await migrate(db);
  await seedProducts(db);
  const { rows } = await db.query("select count(*)::int as n from products");
  assert.equal(rows[0].n, 17);
});

test("a failed transaction leaves nothing behind", async () => {
  await assert.rejects(
    db.tx(async (tx) => {
      await tx.query("insert into products (sku, kind, name, price_cents) values ('tmp', 'drink', 'Tmp', 100)");
      throw new Error("boom");
    }),
    /boom/,
  );
  const { rows } = await db.query("select 1 from products where sku = 'tmp'");
  assert.equal(rows.length, 0);
});

test("row level security is on for every table (Supabase exposes tables via PostgREST)", async () => {
  const { rows } = await db.query(
    "select relname from pg_class where relname in ('products','orders','order_items') and relrowsecurity order by relname",
  );
  assert.deepEqual(rows.map((r) => r.relname), ["order_items", "orders", "products"]);
});

test("orders require a pickup slot or a shipping address", async () => {
  await assert.rejects(
    db.query(
      "insert into orders (code, idempotency_key, customer_name, customer_email, fulfilment, total_cents) values ('X','k','n','e','pickup',1)",
    ),
  );
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npm test`
Expected: FAIL — `Cannot find module '../src/config'` / `'../../src/db'`.

- [ ] **Step 4: Implement config, db adapter, schema, migrate, seed**

`backend/src/config.js`:

```js
function loadConfig(env = process.env) {
  const prod = env.NODE_ENV === "production";
  const need = (key) => {
    if (!env[key]) throw new Error(`Missing required env var ${key}`);
    return env[key];
  };
  return {
    prod,
    port: Number(env.PORT || 3000),
    databaseUrl: prod ? need("DATABASE_URL") : env.DATABASE_URL || null,
    databaseSsl: env.DATABASE_SSL !== "false",
    frontendOrigins: (env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean),
    staffPasscode: prod ? need("STAFF_PASSCODE") : env.STAFF_PASSCODE || "altura-dev",
    jwtSecret: prod ? need("JWT_SECRET") : env.JWT_SECRET || "dev-secret-change-me",
    cafeTz: env.CAFE_TZ || "America/Bogota",
    slotCapacity: Number(env.SLOT_CAPACITY || 6),
    leadMinutes: Number(env.LEAD_MINUTES || 15),
    rateLimit: {
      orders: { windowMs: 60_000, max: 20 },
      status: { windowMs: 60_000, max: 120 },
      login: { windowMs: 15 * 60_000, max: 10 },
    },
  };
}

module.exports = { loadConfig };
```

`backend/src/db/index.js`:

```js
async function createDb(config) {
  if (config.databaseUrl) {
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl === false ? false : { rejectUnauthorized: false },
      max: 5,
    });
    return {
      driver: "pg",
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
      async tx(fn) {
        const client = await pool.connect();
        try {
          await client.query("begin");
          const result = await fn({ query: (t, p) => client.query(t, p) });
          await client.query("commit");
          return result;
        } catch (err) {
          await client.query("rollback").catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (config.prod) throw new Error("DATABASE_URL is required in production");
  const { PGlite } = require("@electric-sql/pglite");
  const lite = new PGlite();
  await lite.waitReady;
  return {
    driver: "pglite",
    query: (text, params) => lite.query(text, params),
    exec: (sql) => lite.exec(sql),
    tx: (fn) => lite.transaction((tx) => fn({ query: (t, p) => tx.query(t, p) })),
    close: () => lite.close(),
  };
}

module.exports = { createDb };
```

`backend/src/db/schema.sql`:

```sql
create table if not exists products (
  sku text primary key,
  kind text not null check (kind in ('drink', 'food', 'beans')),
  name text not null,
  note text not null default '',
  price_cents integer not null check (price_cents >= 0),
  available boolean not null default true,
  sort integer not null default 0
);

create table if not exists orders (
  id integer generated always as identity primary key,
  code text not null unique,
  idempotency_key text not null unique,
  customer_name text not null,
  customer_email text not null,
  fulfilment text not null check (fulfilment in ('pickup', 'ship')),
  pickup_slot timestamptz,
  ship_line1 text,
  ship_city text,
  ship_postcode text,
  ship_country text,
  status text not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'completed', 'shipped', 'cancelled')),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (fulfilment = 'pickup' and pickup_slot is not null)
    or (fulfilment = 'ship' and ship_line1 is not null)
  )
);
create index if not exists orders_status_idx on orders (status, created_at desc);
create index if not exists orders_slot_idx on orders (pickup_slot) where pickup_slot is not null;

create table if not exists order_items (
  id integer generated always as identity primary key,
  order_id integer not null references orders (id) on delete cascade,
  sku text not null references products (sku),
  name text not null,
  unit_price_cents integer not null,
  qty integer not null check (qty between 1 and 20)
);
create index if not exists order_items_order_idx on order_items (order_id);

-- Supabase exposes public tables through its REST API. Orders hold personal data:
-- enable RLS with no policies so only the backend's direct connection can read them.
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
```

`backend/src/db/migrate.js`:

```js
const fs = require("node:fs");
const path = require("node:path");

async function migrate(db) {
  await db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
}

module.exports = { migrate };

if (require.main === module) {
  require("dotenv").config();
  const { loadConfig } = require("../config");
  const { createDb } = require("./index");
  (async () => {
    const config = loadConfig();
    if (!config.databaseUrl) throw new Error("Set DATABASE_URL to migrate a real database.");
    const db = await createDb(config);
    await migrate(db);
    console.log("Schema applied.");
    await db.close();
  })().catch((e) => { console.error(e); process.exit(1); });
}
```

`backend/src/db/products-data.js`:

```js
// Source of truth for the menu. Names match the labels on the site; prices are cents.
const PRODUCTS = [
  { sku: "espresso", kind: "drink", name: "Espresso", note: "Altura house, chocolate & plum", price_cents: 320 },
  { sku: "cortado", kind: "drink", name: "Cortado", note: "Equal parts, no foam art debate", price_cents: 380 },
  { sku: "flat-white", kind: "drink", name: "Flat white", note: "Double ristretto, whole or oat", price_cents: 420 },
  { sku: "ridge-latte", kind: "drink", name: "Ridge latte", note: "Brown-butter syrup, sea salt", price_cents: 490 },
  { sku: "batch-brew", kind: "drink", name: "Batch brew", note: "Rotating single origin", price_cents: 340 },
  { sku: "pour-over", kind: "drink", name: "Pour-over", note: "V60, four minutes, worth it", price_cents: 550 },
  { sku: "cold-brew", kind: "drink", name: "Cold brew", note: "Eighteen hours in the river-cold fridge", price_cents: 460 },
  { sku: "cascara-tonic", kind: "drink", name: "Cascara tonic", note: "Dried cherry tea, tonic, orange", price_cents: 500 },
  { sku: "hot-chocolate", kind: "drink", name: "Hot chocolate", note: "70% single-estate, whole milk", price_cents: 440 },
  { sku: "chai", kind: "drink", name: "Chai", note: "Brewed from whole spice, not syrup", price_cents: 450 },
  { sku: "fresh-mint", kind: "drink", name: "Fresh mint", note: "A handful of it, hot water", price_cents: 300 },
  { sku: "cardamom-bun", kind: "food", name: "Cardamom bun", note: "Until they're gone, usually 10am", price_cents: 390 },
  { sku: "olive-oil-cake", kind: "food", name: "Olive oil cake", note: "Orange, rosemary, a lot of oil", price_cents: 420 },
  { sku: "trail-toast", kind: "food", name: "Trail toast", note: "Sourdough, ricotta, honey, walnut", price_cents: 750 },
  { sku: "bean-lot-07", kind: "beans", name: "Finca Altura Pink Bourbon", note: "250 g · Lot 07 · Pink grapefruit, honey, black tea", price_cents: 1500 },
  { sku: "bean-lot-11", kind: "beans", name: "La Loma Caturra", note: "250 g · Lot 11 · Red apple, panela, cocoa nib", price_cents: 1400 },
  { sku: "bean-lot-02", kind: "beans", name: "Altura House blend", note: "250 g · Lot 02 · Dark chocolate, plum, toasted hazelnut", price_cents: 1200 },
];

module.exports = { PRODUCTS };
```

`backend/src/db/seed.js`:

```js
const { PRODUCTS } = require("./products-data");

async function seedProducts(db) {
  for (const [i, p] of PRODUCTS.entries()) {
    await db.query(
      `insert into products (sku, kind, name, note, price_cents, sort)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (sku) do update
         set kind = excluded.kind, name = excluded.name, note = excluded.note,
             price_cents = excluded.price_cents, sort = excluded.sort`,
      [p.sku, p.kind, p.name, p.note, p.price_cents, i],
    );
  }
}

module.exports = { seedProducts };

if (require.main === module) {
  require("dotenv").config();
  const { loadConfig } = require("../config");
  const { createDb } = require("./index");
  const { migrate } = require("./migrate");
  (async () => {
    const config = loadConfig();
    if (!config.databaseUrl) throw new Error("Set DATABASE_URL to seed a real database.");
    const db = await createDb(config);
    await migrate(db);
    await seedProducts(db);
    console.log(`Seeded ${PRODUCTS.length} products.`);
    await db.close();
  })().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — all config and db tests green. If `@electric-sql/pglite` fails to `require` as CommonJS, switch `createDb`'s pglite branch to `const { PGlite } = await import("@electric-sql/pglite");` (it is already inside an async function).

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(api): scaffold backend with config, db adapter, schema and seed" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: App shell — CORS, errors, health, products endpoint

**Files:**
- Create: `backend/src/errors.js`, `backend/src/validate.js`, `backend/src/limits.js`, `backend/src/app.js`, `backend/src/routes/public.js`, `backend/src/server.js`
- Modify: `backend/test/support/app.js` (add `makeTestApp`)
- Test: `backend/test/app.test.js`

**Interfaces:**
- Consumes: `loadConfig`, `createDb`, `migrate`, `seedProducts` (Task 1)
- Produces: `ApiError(status, code, message, details?)`; `errorHandler`; `parse(schema, data) → data` (throws `ApiError 400 invalid_request`); `makeLimiters(config) → { orders, status, login }` (Express middleware); `createApp({ db, config, now = () => new Date() }) → express app`; `publicRoutes({ db, config, now, limits }) → Router`
- Produces (test): `makeTestApp({ env?, config? }) → { app, db, config, NOW, reset(), close() }` with fixed clock `NOW = 2026-10-05T10:00:00Z` (a Monday) and `CAFE_TZ=UTC`
- Endpoint: `GET /api/products → { products: [{ sku, kind, name, note, priceCents, available }] }` ordered by menu order

- [ ] **Step 1: Extend the test helper and write failing tests**

Append to `backend/test/support/app.js` (replace its export line):

```js
const { loadConfig } = require("../../src/config");
const { createApp } = require("../../src/app");

const NOW = new Date("2026-10-05T10:00:00Z"); // Monday 10:00 UTC

async function makeTestApp({ env = {}, config = {} } = {}) {
  const cfg = { ...loadConfig({ NODE_ENV: "test", CAFE_TZ: "UTC", ...env }), ...config };
  const db = await makeTestDb();
  const app = createApp({ db, config: cfg, now: () => NOW });
  return {
    app, db, config: cfg, NOW,
    reset: () => db.query("truncate orders restart identity cascade"),
    close: () => db.close(),
  };
}

module.exports = { makeTestDb, makeTestApp, NOW };
```

`backend/test/app.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { makeTestApp } = require("./support/app");

let t;
test.before(async () => { t = await makeTestApp({ env: { FRONTEND_ORIGIN: "https://altura.example" } }); });
test.after(() => t.close());

test("health reports ok", async () => {
  const res = await request(t.app).get("/api/health");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test("unknown API paths return the JSON error shape", async () => {
  const res = await request(t.app).get("/api/nope");
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "not_found");
  assert.equal(typeof res.body.error.message, "string");
});

test("malformed JSON is a 400, not a 500", async () => {
  const res = await request(t.app).post("/api/orders").set("Content-Type", "application/json").send("{oops");
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "invalid_json");
});

test("CORS allows the configured frontend origin only", async () => {
  const ok = await request(t.app).get("/api/health").set("Origin", "https://altura.example");
  assert.equal(ok.headers["access-control-allow-origin"], "https://altura.example");
  const bad = await request(t.app).get("/api/health").set("Origin", "https://evil.example");
  assert.equal(bad.headers["access-control-allow-origin"], undefined);
});

test("CORS preflight permits PATCH with an Authorization header", async () => {
  const res = await request(t.app).options("/api/staff/orders/1/status")
    .set("Origin", "https://altura.example")
    .set("Access-Control-Request-Method", "PATCH")
    .set("Access-Control-Request-Headers", "authorization,content-type");
  assert.equal(res.status, 204);
  assert.match(res.headers["access-control-allow-methods"], /PATCH/);
  assert.match(res.headers["access-control-allow-headers"], /authorization/i);
});

test("GET /api/products lists the menu in order with integer cents", async () => {
  const res = await request(t.app).get("/api/products");
  assert.equal(res.status, 200);
  const { products } = res.body;
  assert.equal(products.length, 17);
  assert.deepEqual(products[0], {
    sku: "espresso", kind: "drink", name: "Espresso",
    note: "Altura house, chocolate & plum", priceCents: 320, available: true,
  });
  assert.ok(products.every((p) => Number.isInteger(p.priceCents)));
  assert.equal(products.at(-1).sku, "bean-lot-02");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/app.test.js`
Expected: FAIL — `Cannot find module '../../src/app'`.

- [ ] **Step 3: Implement the shell**

`backend/src/errors.js`:

```js
class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "invalid_json", message: "The request body isn't valid JSON." } });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "too_large", message: "The request body is too large." } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong on our side." } });
}

module.exports = { ApiError, errorHandler };
```

`backend/src/validate.js`:

```js
const { ApiError } = require("./errors");

function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  const summary = details.map((d) => (d.path ? `${d.path} (${d.message})` : d.message)).join("; ");
  throw new ApiError(400, "invalid_request", `Please check: ${summary}`, details);
}

module.exports = { parse };
```

`backend/src/limits.js`:

```js
const rateLimit = require("express-rate-limit");
const { ApiError } = require("./errors");

function makeLimiters(config) {
  const make = ({ windowMs, max }) => rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, "rate_limited", "Too many requests. Try again in a little while.")),
  });
  return {
    orders: make(config.rateLimit.orders),
    status: make(config.rateLimit.status),
    login: make(config.rateLimit.login),
  };
}

module.exports = { makeLimiters };
```

`backend/src/routes/public.js`:

```js
const { Router } = require("express");

function publicRoutes({ db }) {
  const r = Router();

  r.get("/products", async (req, res) => {
    const { rows } = await db.query(
      "select sku, kind, name, note, price_cents, available from products order by sort",
    );
    res.set("Cache-Control", "public, max-age=30");
    res.json({
      products: rows.map((p) => ({
        sku: p.sku, kind: p.kind, name: p.name, note: p.note, priceCents: p.price_cents, available: p.available,
      })),
    });
  });

  return r;
}

module.exports = { publicRoutes };
```

`backend/src/app.js`:

```js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { ApiError, errorHandler } = require("./errors");
const { makeLimiters } = require("./limits");
const { publicRoutes } = require("./routes/public");

function createApp({ db, config, now = () => new Date() }) {
  const app = express();
  const limits = makeLimiters(config);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || config.frontendOrigins.includes(origin)) }));
  app.use(express.json({ limit: "20kb" }));

  app.get("/api/health", async (req, res) => {
    try {
      await db.query("select 1");
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.use("/api", publicRoutes({ db, config, now, limits }));

  app.use("/api", (req, res, next) => next(new ApiError(404, "not_found", "No such endpoint.")));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
```

`backend/src/server.js`:

```js
require("dotenv").config();
const { loadConfig } = require("./config");
const { createDb } = require("./db");
const { migrate } = require("./db/migrate");
const { seedProducts } = require("./db/seed");
const { createApp } = require("./app");

async function main() {
  const config = loadConfig();
  const db = await createDb(config);
  if (db.driver === "pglite") {
    await migrate(db);
    await seedProducts(db);
    console.log("Using an in-memory dev database (seeded). Orders vanish when the server stops.");
  } else if (process.env.AUTO_MIGRATE === "true") {
    await migrate(db);
  }
  const app = createApp({ db, config });
  const server = app.listen(config.port, () => console.log(`Altura API listening on :${config.port}`));
  const stop = () => server.close(() => db.close().then(() => process.exit(0)));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS (config, db, app tests).

- [ ] **Step 5: Smoke-test the real server**

Run (background): `cd backend && npm run dev` then `curl -s localhost:3000/api/products | head -c 200`
Expected: JSON starting `{"products":[{"sku":"espresso"`. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(api): app shell with CORS, error shape, health and products" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Opening hours and pickup slots

**Files:**
- Create: `backend/src/hours.js`
- Modify: `backend/src/routes/public.js` (add `GET /slots`)
- Test: `backend/test/hours.test.js`, `backend/test/slots.test.js`

**Interfaces:**
- Consumes: `publicRoutes({ db, config, now })` (Task 2)
- Produces: `HOURS` (index = weekday, Sunday 0, `[openHour, closeHour]`), `zonedToUtc(y, m, d, h, min, tz) → Date`, `listSlotTimes(now: Date, { tz, leadMinutes }) → Date[]` (sorted, today + tomorrow, each ≥ now + lead, last slot starts 15 min before close)
- Endpoint: `GET /api/slots → { tz, slots: [{ at: ISO string, remaining: number }] }`, only slots with `remaining > 0`

- [ ] **Step 1: Write the failing tests**

`backend/test/hours.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { listSlotTimes, zonedToUtc } = require("../src/hours");

const iso = (d) => d.toISOString();
const opts = (tz = "UTC", leadMinutes = 15) => ({ tz, leadMinutes });

test("Monday morning: slots run from opening to 15 minutes before close, for two days", () => {
  const slots = listSlotTimes(new Date("2026-10-05T06:00:00Z"), opts());
  assert.equal(iso(slots[0]), "2026-10-05T07:00:00.000Z");
  const monday = slots.filter((s) => iso(s).startsWith("2026-10-05"));
  assert.equal(iso(monday.at(-1)), "2026-10-05T16:45:00.000Z");
  assert.equal(monday.length, 40);
  assert.equal(slots.length, 80); // Monday + Tuesday, both 7-17
});

test("lead time is respected", () => {
  assert.equal(iso(listSlotTimes(new Date("2026-10-05T10:00:00Z"), opts())[0]), "2026-10-05T10:15:00.000Z");
  assert.equal(iso(listSlotTimes(new Date("2026-10-05T10:01:00Z"), opts())[0]), "2026-10-05T10:30:00.000Z");
});

test("after closing, only tomorrow's slots remain", () => {
  const slots = listSlotTimes(new Date("2026-10-05T17:30:00Z"), opts());
  assert.equal(iso(slots[0]), "2026-10-06T07:00:00.000Z");
});

test("weekend hours are shorter (Sunday 8-16)", () => {
  const slots = listSlotTimes(new Date("2026-10-10T20:00:00Z"), opts()); // Saturday evening
  assert.equal(iso(slots[0]), "2026-10-11T08:00:00.000Z");
  assert.equal(iso(slots.at(-1)), "2026-10-11T15:45:00.000Z");
});

test("slots are computed in the café's timezone", () => {
  // 11:00Z = 06:00 in Bogota (UTC-5); the café opens at 07:00 local = 12:00Z
  const slots = listSlotTimes(new Date("2026-10-05T11:00:00Z"), opts("America/Bogota"));
  assert.equal(iso(slots[0]), "2026-10-05T12:00:00.000Z");
});

test("daylight saving changes are handled (London clocks go back 2026-10-25)", () => {
  const slots = listSlotTimes(new Date("2026-10-24T00:00:00Z"), opts("Europe/London"));
  assert.equal(iso(slots[0]), "2026-10-24T07:00:00.000Z"); // Sat 08:00 BST
  const times = slots.map(iso);
  assert.ok(times.includes("2026-10-25T08:00:00.000Z")); // Sun 08:00 GMT
  assert.ok(!times.includes("2026-10-25T07:00:00.000Z"));
  assert.equal(iso(zonedToUtc(2026, 10, 25, 8, 0, "Europe/London")), "2026-10-25T08:00:00.000Z");
});
```

`backend/test/slots.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { makeTestApp } = require("./support/app");

let t;
test.before(async () => { t = await makeTestApp({ config: { slotCapacity: 2 } }); });
test.beforeEach(() => t.reset());
test.after(() => t.close());

async function insertOrder(slot, status = "new", n = Math.random()) {
  await t.db.query(
    `insert into orders (code, idempotency_key, customer_name, customer_email, fulfilment, pickup_slot, status, total_cents)
     values ($1, $2, 'A', 'a@example.com', 'pickup', $3, $4, 100)`,
    [`ALT-T${n}`, `key-${n}`, slot, status],
  );
}

test("GET /api/slots returns future slots with remaining capacity and the café timezone", async () => {
  const res = await request(t.app).get("/api/slots");
  assert.equal(res.status, 200);
  assert.equal(res.body.tz, "UTC");
  assert.equal(res.body.slots[0].at, "2026-10-05T10:15:00.000Z");
  assert.equal(res.body.slots[0].remaining, 2);
});

test("a full slot disappears; a cancelled order frees it", async () => {
  const slot = "2026-10-05T10:15:00.000Z";
  await insertOrder(slot, "new", 1);
  await insertOrder(slot, "preparing", 2);
  let res = await request(t.app).get("/api/slots");
  assert.ok(!res.body.slots.some((s) => s.at === slot));

  await t.db.query("update orders set status = 'cancelled' where code = 'ALT-T1'");
  res = await request(t.app).get("/api/slots");
  assert.equal(res.body.slots.find((s) => s.at === slot).remaining, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/hours.test.js test/slots.test.js`
Expected: FAIL — `Cannot find module '../src/hours'`.

- [ ] **Step 3: Implement hours and the slots endpoint**

`backend/src/hours.js`:

```js
const HOURS = [ // index = weekday, Sunday = 0; [open hour, close hour]
  [8, 16], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [8, 16],
];
const SLOT_MINUTES = 15;
const DAYS_AHEAD = 2; // today and tomorrow

function tzParts(date, tz) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

function tzOffsetMs(date, tz) {
  const p = tzParts(date, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

// Wall-clock time in `tz` → the real instant. Two passes settle DST boundaries.
function zonedToUtc(y, m, d, h, min, tz) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let t = guess - tzOffsetMs(new Date(guess), tz);
  t = guess - tzOffsetMs(new Date(t), tz);
  return new Date(t);
}

function listSlotTimes(now, { tz, leadMinutes }) {
  const out = [];
  const today = tzParts(now, tz);
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
    const [open, close] = HOURS[day.getUTCDay()];
    for (let mins = open * 60; mins + SLOT_MINUTES <= close * 60; mins += SLOT_MINUTES) {
      const at = zonedToUtc(y, m, d, Math.floor(mins / 60), mins % 60, tz);
      if (at.getTime() >= now.getTime() + leadMinutes * 60_000) out.push(at);
    }
  }
  return out;
}

module.exports = { HOURS, SLOT_MINUTES, zonedToUtc, listSlotTimes };
```

In `backend/src/routes/public.js`, add the import at the top and the route inside `publicRoutes` (change the signature to `publicRoutes({ db, config, now })`):

```js
const { listSlotTimes } = require("../hours");
```

```js
  r.get("/slots", async (req, res) => {
    const times = listSlotTimes(now(), { tz: config.cafeTz, leadMinutes: config.leadMinutes }).map((d) => d.toISOString());
    if (!times.length) return res.json({ tz: config.cafeTz, slots: [] });
    const { rows } = await db.query(
      `select pickup_slot, count(*)::int as n from orders
       where pickup_slot = any($1::timestamptz[]) and status <> 'cancelled'
       group by pickup_slot`,
      [times],
    );
    const used = new Map(rows.map((r2) => [new Date(r2.pickup_slot).toISOString(), r2.n]));
    const slots = times
      .map((at) => ({ at, remaining: config.slotCapacity - (used.get(at) || 0) }))
      .filter((s) => s.remaining > 0);
    res.json({ tz: config.cafeTz, slots });
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(api): opening hours and pickup slot availability" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Status state machine and simulated payments

**Files:**
- Create: `backend/src/status.js`, `backend/src/payments.js`
- Test: `backend/test/status.test.js`, `backend/test/payments.test.js`

**Interfaces:**
- Consumes: `ApiError` (Task 2)
- Produces: `FLOWS = { pickup: string[], ship: string[] }`, `TERMINAL: Set`, `nextStatuses(fulfilment, status) → string[]` (next step then `"cancelled"`; `[]` when terminal), `canTransition(fulfilment, from, to) → boolean`
- Produces: `charge({ amountCents, card }) → Promise<{ ok: true, reference }>`; throws `ApiError(402, "card_declined")` or `ApiError(422, "invalid_card")`

- [ ] **Step 1: Write the failing tests**

`backend/test/status.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { FLOWS, nextStatuses, canTransition } = require("../src/status");

test("pickup flow", () => {
  assert.deepEqual(FLOWS.pickup, ["new", "preparing", "ready", "completed"]);
  assert.deepEqual(nextStatuses("pickup", "new"), ["preparing", "cancelled"]);
  assert.deepEqual(nextStatuses("pickup", "preparing"), ["ready", "cancelled"]);
  assert.deepEqual(nextStatuses("pickup", "ready"), ["completed", "cancelled"]);
});

test("ship flow skips 'ready' and ends at shipped", () => {
  assert.deepEqual(FLOWS.ship, ["new", "preparing", "shipped"]);
  assert.deepEqual(nextStatuses("ship", "preparing"), ["shipped", "cancelled"]);
});

test("terminal states have no moves", () => {
  for (const s of ["completed", "cancelled"]) assert.deepEqual(nextStatuses("pickup", s), []);
  for (const s of ["shipped", "cancelled"]) assert.deepEqual(nextStatuses("ship", s), []);
});

test("illegal jumps are rejected", () => {
  assert.equal(canTransition("pickup", "new", "ready"), false);
  assert.equal(canTransition("pickup", "ready", "preparing"), false);
  assert.equal(canTransition("pickup", "new", "shipped"), false);
  assert.equal(canTransition("ship", "preparing", "ready"), false);
  assert.equal(canTransition("pickup", "completed", "cancelled"), false);
  assert.equal(canTransition("pickup", "ready", "cancelled"), true);
});
```

`backend/test/payments.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { charge } = require("../src/payments");

const card = (number) => ({ number, exp: "12/30", cvc: "123" });

test("the approve test card succeeds, with or without separators", async () => {
  for (const n of ["4242424242424242", "4242 4242 4242 4242", "4242-4242-4242-4242"]) {
    const r = await charge({ amountCents: 500, card: card(n) });
    assert.equal(r.ok, true);
    assert.match(r.reference, /^sim_[0-9a-f]{12}$/);
  }
});

test("the decline test card is declined with 402", async () => {
  await assert.rejects(charge({ amountCents: 500, card: card("4000 0000 0000 0002") }),
    (e) => e.status === 402 && e.code === "card_declined");
});

test("any other number is rejected as an invalid test card with 422", async () => {
  await assert.rejects(charge({ amountCents: 500, card: card("4111111111111111") }),
    (e) => e.status === 422 && e.code === "invalid_card");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/status.test.js test/payments.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`backend/src/status.js`:

```js
const FLOWS = {
  pickup: ["new", "preparing", "ready", "completed"],
  ship: ["new", "preparing", "shipped"],
};
const TERMINAL = new Set(["completed", "shipped", "cancelled"]);

function nextStatuses(fulfilment, status) {
  if (TERMINAL.has(status)) return [];
  const flow = FLOWS[fulfilment];
  const i = flow.indexOf(status);
  const next = [];
  if (i >= 0 && i < flow.length - 1) next.push(flow[i + 1]);
  next.push("cancelled");
  return next;
}

const canTransition = (fulfilment, from, to) => nextStatuses(fulfilment, from).includes(to);

module.exports = { FLOWS, TERMINAL, nextStatuses, canTransition };
```

`backend/src/payments.js`:

```js
const crypto = require("node:crypto");
const { ApiError } = require("./errors");

// Simulated gateway. Swap this module for Stripe later; callers only see charge().
async function charge({ amountCents, card }) { // eslint-disable-line no-unused-vars
  const number = String(card.number).replace(/[\s-]/g, "");
  if (number === "4242424242424242") {
    return { ok: true, reference: `sim_${crypto.randomBytes(6).toString("hex")}` };
  }
  if (number === "4000000000000002") {
    throw new ApiError(402, "card_declined", "Your card was declined. Try the test card 4242 4242 4242 4242.");
  }
  throw new ApiError(
    422, "invalid_card",
    "This is a demo shop. Use test card 4242 4242 4242 4242 (approves) or 4000 0000 0000 0002 (declines).",
  );
}

module.exports = { charge };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(api): order status state machine and simulated payments" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Order creation and customer status

**Files:**
- Modify: `backend/src/validate.js` (add `orderSchema`)
- Create: `backend/src/orders.js`
- Modify: `backend/src/routes/public.js` (add `POST /orders`, `GET /orders/:code`)
- Test: `backend/test/orders.test.js`

**Interfaces:**
- Consumes: `parse`, `ApiError`, `listSlotTimes`, `charge`, `FLOWS`, `nextStatuses`, `canTransition`, `db.tx` (Tasks 1–4)
- Produces in `orders.js`: `createOrder({ db, config, input, now }) → Promise<{ order, created: boolean }>`, `getOrderByCode(db, code) → order | null`, `listOrders(db, { limit }) → order[]`, `updateStatus({ db, id, to }) → order`, `customerView(order)`, `staffView(order)`. `order` is the raw DB row plus `items: [{ sku, name, unit_price_cents, qty }]`.
- Produces in `validate.js`: `orderSchema`, `loginSchema`, `statusSchema`
- Customer view shape: `{ code, status, fulfilment, pickupSlot, firstName, items: [{ sku, name, qty, unitPriceCents }], totalCents, steps, createdAt, updatedAt }`
- Staff view shape: `{ id, code, status, fulfilment, pickupSlot, customer: { name, email }, shipping: { line1, city, postcode, country } | null, items, totalCents, createdAt, updatedAt, nextStatuses }`
- Endpoints: `POST /api/orders → 201 { order: customerView, tz }` (or `200` for an idempotent replay); `GET /api/orders/:code → { order: customerView, tz }`

- [ ] **Step 1: Write the failing tests**

`backend/test/orders.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { makeTestApp } = require("./support/app");

let t;
test.before(async () => { t = await makeTestApp(); });
test.beforeEach(() => t.reset());
test.after(() => t.close());

const SLOT = "2026-10-05T12:00:00.000Z";
function body(over = {}) {
  return {
    idempotencyKey: "test-key-0001",
    customer: { name: "Ana Ruiz", email: "ana@example.com" },
    fulfilment: "pickup",
    pickupSlot: SLOT,
    items: [{ sku: "flat-white", qty: 2 }, { sku: "cardamom-bun", qty: 1 }],
    card: { number: "4242 4242 4242 4242", exp: "12/30", cvc: "123" },
    ...over,
  };
}
const post = (b) => request(t.app).post("/api/orders").send(b);
const count = async () => (await t.db.query("select count(*)::int as n from orders")).rows[0].n;

test("creates a pickup order priced by the server", async () => {
  const res = await post(body());
  assert.equal(res.status, 201);
  const { order } = res.body;
  assert.match(order.code, /^ALT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(order.status, "new");
  assert.equal(order.fulfilment, "pickup");
  assert.equal(order.pickupSlot, SLOT);
  assert.equal(order.totalCents, 2 * 420 + 390);
  assert.equal(order.firstName, "Ana");
  assert.deepEqual(order.steps, ["new", "preparing", "ready", "completed"]);
  assert.deepEqual(order.items.map((i) => [i.sku, i.qty, i.unitPriceCents]), [["flat-white", 2, 420], ["cardamom-bun", 1, 390]]);
  assert.equal(res.body.tz, "UTC");
});

test("client-supplied prices are ignored", async () => {
  const res = await post(body({ items: [{ sku: "flat-white", qty: 1, priceCents: 1, unit_price_cents: 1 }] }));
  assert.equal(res.status, 201);
  assert.equal(res.body.order.totalCents, 420);
});

test("duplicate lines for one sku are merged", async () => {
  const res = await post(body({ items: [{ sku: "espresso", qty: 2 }, { sku: "espresso", qty: 3 }] }));
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.order.items.map((i) => [i.sku, i.qty]), [["espresso", 5]]);
  const over = await post(body({ idempotencyKey: "test-key-0002", items: [{ sku: "espresso", qty: 15 }, { sku: "espresso", qty: 10 }] }));
  assert.equal(over.status, 400);
});

test("replaying the same idempotency key returns the original order and charges once", async () => {
  const first = await post(body());
  const again = await post(body({ items: [{ sku: "espresso", qty: 9 }] })); // different cart, same key
  assert.equal(again.status, 200);
  assert.equal(again.body.order.code, first.body.order.code);
  assert.equal(again.body.order.totalCents, first.body.order.totalCents);
  assert.equal(await count(), 1);
});

test("unknown and unavailable items are rejected", async () => {
  let res = await post(body({ items: [{ sku: "unicorn-latte", qty: 1 }] }));
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, "unknown_item");
  await t.db.query("update products set available = false where sku = 'chai'");
  res = await post(body({ items: [{ sku: "chai", qty: 1 }] }));
  await t.db.query("update products set available = true where sku = 'chai'");
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, "item_unavailable");
  assert.equal(await count(), 0);
});

test("shipping rules: beans only, address required", async () => {
  const addr = { line1: "1 High St", city: "Leeds", postcode: "LS1 1AA", country: "UK" };
  let res = await post(body({ fulfilment: "ship", pickupSlot: undefined, shipping: addr }));
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, "ship_beans_only");

  res = await post(body({ fulfilment: "ship", pickupSlot: undefined, items: [{ sku: "bean-lot-07", qty: 1 }] }));
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, "shipping_required");

  res = await post(body({ fulfilment: "ship", pickupSlot: undefined, shipping: addr, items: [{ sku: "bean-lot-07", qty: 2 }] }));
  assert.equal(res.status, 201);
  assert.equal(res.body.order.pickupSlot, null);
  assert.equal(res.body.order.totalCents, 3000);
  assert.deepEqual(res.body.order.steps, ["new", "preparing", "shipped"]);
});

test("pickup needs a valid slot from the offered list", async () => {
  let res = await post(body({ pickupSlot: undefined }));
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, "slot_required");
  res = await post(body({ pickupSlot: "2026-10-05T12:07:00.000Z" })); // not on the 15-minute grid
  assert.equal(res.body.error.code, "slot_invalid");
  res = await post(body({ pickupSlot: "2026-10-05T09:00:00.000Z" })); // in the past
  assert.equal(res.body.error.code, "slot_invalid");
  res = await post(body({ pickupSlot: "2026-10-05T20:00:00.000Z" })); // after closing
  assert.equal(res.body.error.code, "slot_invalid");
});

test("payment: declined, invalid and expired cards create no order", async () => {
  let res = await post(body({ card: { number: "4000 0000 0000 0002", exp: "12/30", cvc: "123" } }));
  assert.equal(res.status, 402);
  assert.equal(res.body.error.code, "card_declined");
  res = await post(body({ card: { number: "4111 1111 1111 1111", exp: "12/30", cvc: "123" } }));
  assert.equal(res.status, 422);
  res = await post(body({ card: { number: "4242 4242 4242 4242", exp: "01/20", cvc: "123" } }));
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, "invalid_card");
  assert.equal(await count(), 0);
});

test("the card number is never stored or echoed", async () => {
  const res = await post(body());
  const dump = JSON.stringify((await t.db.query("select * from orders")).rows) +
    JSON.stringify((await t.db.query("select * from order_items")).rows);
  assert.ok(!dump.includes("4242"));
  assert.ok(!JSON.stringify(res.body).includes("4242"));
});

test("validation errors list the offending fields", async () => {
  let res = await post(body({ customer: { name: "Ana", email: "not-an-email" } }));
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "invalid_request");
  assert.ok(res.body.error.details.some((d) => d.path === "customer.email"));
  res = await post(body({ items: [] }));
  assert.equal(res.status, 400);
  res = await post(body({ items: [{ sku: "espresso", qty: 0 }] }));
  assert.equal(res.status, 400);
  res = await post(body({ idempotencyKey: "short" }));
  assert.equal(res.status, 400);
  res = await post({});
  assert.equal(res.status, 400);
  assert.equal(await count(), 0);
});

test("two people racing for the last slot: exactly one wins", async () => {
  const tight = await makeTestApp({ config: { slotCapacity: 1 } });
  try {
    const send = (key, name) => request(tight.app).post("/api/orders")
      .send(body({ idempotencyKey: key, customer: { name, email: "x@example.com" } }));
    const [a, b] = await Promise.all([send("race-key-0001", "Ana"), send("race-key-0002", "Ben")]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
    const loser = a.status === 409 ? a : b;
    assert.equal(loser.body.error.code, "slot_full");
    assert.equal((await tight.db.query("select count(*)::int as n from orders")).rows[0].n, 1);
  } finally { await tight.close(); }
});

test("customer status lookup: no PII, case-insensitive code, 404 for junk", async () => {
  const created = await post(body({ customer: { name: "  Ana María Ruiz ", email: "ana@example.com" } }));
  const { code } = created.body.order;
  const res = await request(t.app).get(`/api/orders/${code.toLowerCase()}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.order.code, code);
  assert.equal(res.body.order.firstName, "Ana");
  const text = JSON.stringify(res.body);
  assert.ok(!text.includes("ana@example.com"));
  assert.ok(!text.includes("Ruiz"));
  assert.ok(!("id" in res.body.order));
  assert.ok(!("customer" in res.body.order));
  assert.equal((await request(t.app).get("/api/orders/ALT-ZZZZ-ZZZZ")).status, 404);
  assert.equal((await request(t.app).get("/api/orders/not-a-code")).status, 404);
  assert.equal((await request(t.app).get("/api/orders/1' or '1'='1")).status, 404);
});

test("HTML in a name is stored and returned verbatim as data", async () => {
  const name = '<img src=x onerror="alert(1)">';
  const res = await post(body({ customer: { name, email: "x@example.com" } }));
  assert.equal(res.status, 201);
  assert.equal(res.body.order.firstName, '<img');
  const row = (await t.db.query("select customer_name from orders")).rows[0];
  assert.equal(row.customer_name, name);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/orders.test.js`
Expected: FAIL — 404s on `/api/orders` (route missing).

- [ ] **Step 3: Add schemas to `backend/src/validate.js`**

Add at the top `const { z } = require("zod");` and append before `module.exports`:

```js
const trimmed = (max) => z.string().trim().min(1).max(max);

const orderSchema = z.object({
  idempotencyKey: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  customer: z.object({ name: trimmed(80), email: z.string().trim().max(120).email() }),
  fulfilment: z.enum(["pickup", "ship"]),
  pickupSlot: z.string().datetime().optional(),
  shipping: z.object({ line1: trimmed(120), city: trimmed(80), postcode: trimmed(20), country: trimmed(60) }).optional(),
  items: z.array(z.object({ sku: z.string().min(1).max(40), qty: z.number().int().min(1).max(20) })).min(1).max(30),
  card: z.object({
    number: z.string().regex(/^[\d\s-]{12,23}$/),
    exp: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
    cvc: z.string().regex(/^\d{3,4}$/),
  }),
});

const loginSchema = z.object({ passcode: z.string().min(1).max(200) });
const statusSchema = z.object({ status: z.enum(["preparing", "ready", "completed", "shipped", "cancelled"]) });
```

and change the export to `module.exports = { parse, orderSchema, loginSchema, statusSchema };`

- [ ] **Step 4: Implement `backend/src/orders.js`**

```js
const crypto = require("node:crypto");
const { ApiError } = require("./errors");
const { listSlotTimes } = require("./hours");
const { charge } = require("./payments");
const { FLOWS, nextStatuses, canTransition } = require("./status");

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const CODE_RE = /^ALT-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function newCode() {
  const chars = [...crypto.randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `ALT-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

async function loadOrder(q, where, params) {
  const { rows } = await q.query(`select * from orders where ${where}`, params);
  if (!rows[0]) return null;
  const { rows: items } = await q.query(
    "select sku, name, unit_price_cents, qty from order_items where order_id = $1 order by id",
    [rows[0].id],
  );
  return { ...rows[0], items };
}

const findByKey = (q, key) => loadOrder(q, "idempotency_key = $1", [key]);

function cardExpired(exp, now) {
  const [mm, yy] = exp.split("/").map(Number);
  return now.getTime() >= Date.UTC(2000 + yy, mm, 1); // first instant after the expiry month
}

async function createOrder({ db, config, input, now = new Date() }) {
  const replay = await findByKey(db, input.idempotencyKey);
  if (replay) return { order: replay, created: false };

  const qtyBySku = new Map();
  for (const { sku, qty } of input.items) qtyBySku.set(sku, (qtyBySku.get(sku) || 0) + qty);
  if ([...qtyBySku.values()].some((q) => q > 20)) {
    throw new ApiError(400, "invalid_request", "You can order at most 20 of any one item.");
  }

  const skus = [...qtyBySku.keys()];
  const { rows: products } = await db.query(
    "select sku, kind, name, price_cents, available from products where sku = any($1::text[])",
    [skus],
  );
  const bySku = new Map(products.map((p) => [p.sku, p]));
  for (const sku of skus) {
    const p = bySku.get(sku);
    if (!p) throw new ApiError(422, "unknown_item", `We don't sell "${sku}".`);
    if (!p.available) throw new ApiError(422, "item_unavailable", `${p.name} isn't available right now.`);
  }

  let slotIso = null;
  if (input.fulfilment === "ship") {
    if (products.some((p) => p.kind !== "beans")) {
      throw new ApiError(422, "ship_beans_only", "Only bean bags can be shipped. Choose pickup for drinks and food.");
    }
    if (!input.shipping) throw new ApiError(422, "shipping_required", "Add a shipping address.");
  } else {
    if (!input.pickupSlot) throw new ApiError(422, "slot_required", "Choose a pickup time.");
    const wanted = new Date(input.pickupSlot).getTime();
    const offered = listSlotTimes(now, { tz: config.cafeTz, leadMinutes: config.leadMinutes });
    if (!offered.some((d) => d.getTime() === wanted)) {
      throw new ApiError(422, "slot_invalid", "That pickup time isn't available. Pick another.");
    }
    slotIso = new Date(wanted).toISOString();
  }

  if (cardExpired(input.card.exp, now)) throw new ApiError(422, "invalid_card", "That card has expired.");

  const lines = skus.map((sku) => ({ ...bySku.get(sku), qty: qtyBySku.get(sku) }));
  const totalCents = lines.reduce((sum, l) => sum + l.price_cents * l.qty, 0);

  try {
    const order = await db.tx(async (tx) => {
      if (slotIso) {
        await tx.query("select pg_advisory_xact_lock(hashtext($1))", [`slot:${slotIso}`]);
        const { rows } = await tx.query(
          "select count(*)::int as n from orders where pickup_slot = $1 and status <> 'cancelled'",
          [slotIso],
        );
        if (rows[0].n >= config.slotCapacity) {
          throw new ApiError(409, "slot_full", "That pickup time just filled up. Pick another.");
        }
      }
      await charge({ amountCents: totalCents, card: input.card }); // throws → whole transaction rolls back
      const ship = input.shipping || {};
      const { rows: [row] } = await tx.query(
        `insert into orders (code, idempotency_key, customer_name, customer_email, fulfilment, pickup_slot,
                             ship_line1, ship_city, ship_postcode, ship_country, total_cents)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
        [newCode(), input.idempotencyKey, input.customer.name, input.customer.email, input.fulfilment, slotIso,
          ship.line1 ?? null, ship.city ?? null, ship.postcode ?? null, ship.country ?? null, totalCents],
      );
      for (const l of lines) {
        await tx.query(
          "insert into order_items (order_id, sku, name, unit_price_cents, qty) values ($1, $2, $3, $4, $5)",
          [row.id, l.sku, l.name, l.price_cents, l.qty],
        );
      }
      return loadOrder(tx, "id = $1", [row.id]);
    });
    return { order, created: true };
  } catch (err) {
    if (err.code === "23505") { // lost a race on the idempotency key: return the winner
      const winner = await findByKey(db, input.idempotencyKey);
      if (winner) return { order: winner, created: false };
    }
    throw err;
  }
}

async function getOrderByCode(db, code) {
  const normal = String(code).trim().toUpperCase();
  if (!CODE_RE.test(normal)) return null;
  return loadOrder(db, "code = $1", [normal]);
}

async function listOrders(db, { limit = 200 } = {}) {
  const { rows } = await db.query("select * from orders order by created_at desc, id desc limit $1", [limit]);
  if (!rows.length) return [];
  const { rows: items } = await db.query(
    "select order_id, sku, name, unit_price_cents, qty from order_items where order_id = any($1::int[]) order by id",
    [rows.map((r) => r.id)],
  );
  return rows.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) }));
}

async function updateStatus({ db, id, to }) {
  return db.tx(async (tx) => {
    const { rows } = await tx.query("select id, fulfilment, status from orders where id = $1 for update", [id]);
    if (!rows[0]) throw new ApiError(404, "not_found", "No such order.");
    const { fulfilment, status } = rows[0];
    if (!canTransition(fulfilment, status, to)) {
      throw new ApiError(409, "illegal_transition", `A ${fulfilment} order that is ${status} can't move to ${to}.`);
    }
    await tx.query("update orders set status = $1, updated_at = now() where id = $2", [to, id]);
    return loadOrder(tx, "id = $1", [id]);
  });
}

const iso = (d) => (d ? new Date(d).toISOString() : null);
const itemsView = (items) => items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, unitPriceCents: i.unit_price_cents }));

function customerView(o) {
  return {
    code: o.code,
    status: o.status,
    fulfilment: o.fulfilment,
    pickupSlot: iso(o.pickup_slot),
    firstName: o.customer_name.trim().split(/\s+/)[0],
    items: itemsView(o.items),
    totalCents: o.total_cents,
    steps: FLOWS[o.fulfilment],
    createdAt: iso(o.created_at),
    updatedAt: iso(o.updated_at),
  };
}

function staffView(o) {
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    fulfilment: o.fulfilment,
    pickupSlot: iso(o.pickup_slot),
    customer: { name: o.customer_name, email: o.customer_email },
    shipping: o.fulfilment === "ship"
      ? { line1: o.ship_line1, city: o.ship_city, postcode: o.ship_postcode, country: o.ship_country }
      : null,
    items: itemsView(o.items),
    totalCents: o.total_cents,
    createdAt: iso(o.created_at),
    updatedAt: iso(o.updated_at),
    nextStatuses: nextStatuses(o.fulfilment, o.status),
  };
}

module.exports = { createOrder, getOrderByCode, listOrders, updateStatus, customerView, staffView };
```

- [ ] **Step 5: Add the routes to `backend/src/routes/public.js`**

Change the signature to `publicRoutes({ db, config, now, limits })` and add the imports:

```js
const { ApiError } = require("../errors");
const { parse, orderSchema } = require("../validate");
const { createOrder, getOrderByCode, customerView } = require("../orders");
```

Add inside `publicRoutes`:

```js
  r.post("/orders", limits.orders, async (req, res) => {
    const input = parse(orderSchema, req.body);
    const { order, created } = await createOrder({ db, config, input, now: now() });
    res.status(created ? 201 : 200).json({ order: customerView(order), tz: config.cafeTz });
  });

  r.get("/orders/:code", limits.status, async (req, res) => {
    const order = await getOrderByCode(db, req.params.code);
    if (!order) throw new ApiError(404, "not_found", "We can't find that order. Check the code and try again.");
    res.json({ order: customerView(order), tz: config.cafeTz });
  });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS. If the race test fails to serialize (both succeed), the advisory lock isn't taking effect — confirm `db.tx` is used (not `db.query`) for the count + insert.

- [ ] **Step 7: Commit**

```bash
git add backend
git commit -m "feat(api): create orders with server pricing, slot capacity, idempotency; customer status lookup" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Staff authentication and order processing

**Files:**
- Create: `backend/src/auth.js`, `backend/src/routes/staff.js`
- Modify: `backend/src/app.js` (mount `/api/staff`)
- Test: `backend/test/staff.test.js`

**Interfaces:**
- Consumes: `parse`, `loginSchema`, `statusSchema`, `listOrders`, `updateStatus`, `staffView`, `limits.login`, `config.staffPasscode`, `config.jwtSecret`
- Produces in `auth.js`: `passcodeMatches(input, expected) → boolean` (constant-time), `signStaffToken(config) → string` (HS256, 12 h), `requireStaff(config) → middleware`
- Endpoints: `POST /api/staff/login { passcode } → { token, expiresIn }`; `GET /api/staff/orders → { orders: staffView[] }`; `PATCH /api/staff/orders/:id/status { status } → { order: staffView }`

- [ ] **Step 1: Write the failing tests**

`backend/test/staff.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { makeTestApp } = require("./support/app");

let t;
test.before(async () => { t = await makeTestApp({ env: { STAFF_PASSCODE: "open-sesame", JWT_SECRET: "test-secret" } }); });
test.beforeEach(() => t.reset());
test.after(() => t.close());

const SLOT = "2026-10-05T12:00:00.000Z";
async function place(over = {}) {
  const res = await request(t.app).post("/api/orders").send({
    idempotencyKey: `k-${Math.random().toString(36).slice(2, 12)}`,
    customer: { name: "Ana Ruiz", email: "ana@example.com" },
    fulfilment: "pickup", pickupSlot: SLOT,
    items: [{ sku: "espresso", qty: 1 }],
    card: { number: "4242424242424242", exp: "12/30", cvc: "123" },
    ...over,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.order.code;
}
async function login() {
  const res = await request(t.app).post("/api/staff/login").send({ passcode: "open-sesame" });
  return res.body.token;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const idOf = async (code) => (await t.db.query("select id from orders where code = $1", [code])).rows[0].id;

test("login: wrong passcode is 401, right passcode returns a token", async () => {
  let res = await request(t.app).post("/api/staff/login").send({ passcode: "nope" });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "bad_passcode");
  res = await request(t.app).post("/api/staff/login").send({});
  assert.equal(res.status, 400);
  res = await request(t.app).post("/api/staff/login").send({ passcode: "open-sesame" });
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.token, "string");
  assert.equal(res.body.expiresIn, 43200);
});

test("staff endpoints reject missing, forged, expired and alg:none tokens", async () => {
  const bad = [
    {},
    auth("garbage"),
    auth(jwt.sign({ role: "staff" }, "wrong-secret")),
    auth(jwt.sign({ role: "staff" }, "test-secret", { expiresIn: -10 })),
    auth(jwt.sign({ role: "customer" }, "test-secret")),
    { Authorization: `Bearer ${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from('{"role":"staff"}').toString("base64url")}.` },
  ];
  for (const headers of bad) {
    const res = await request(t.app).get("/api/staff/orders").set(headers);
    assert.equal(res.status, 401, JSON.stringify(headers));
    assert.equal(res.body.error.code, "unauthorized");
  }
});

test("staff list shows full order details and the legal next moves", async () => {
  const code = await place();
  const res = await request(t.app).get("/api/staff/orders").set(auth(await login()));
  assert.equal(res.status, 200);
  const o = res.body.orders.find((x) => x.code === code);
  assert.equal(o.customer.email, "ana@example.com");
  assert.equal(o.status, "new");
  assert.deepEqual(o.nextStatuses, ["preparing", "cancelled"]);
  assert.equal(o.shipping, null);
});

test("a pickup order walks new → preparing → ready → completed, and the customer sees it", async () => {
  const code = await place();
  const id = await idOf(code);
  const token = await login();
  for (const status of ["preparing", "ready", "completed"]) {
    const res = await request(t.app).patch(`/api/staff/orders/${id}/status`).set(auth(token)).send({ status });
    assert.equal(res.status, 200);
    assert.equal(res.body.order.status, status);
  }
  const seen = await request(t.app).get(`/api/orders/${code}`);
  assert.equal(seen.body.order.status, "completed");
  const again = await request(t.app).patch(`/api/staff/orders/${id}/status`).set(auth(token)).send({ status: "cancelled" });
  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, "illegal_transition");
});

test("a ship order goes new → preparing → shipped and cannot become 'ready'", async () => {
  const code = await place({
    fulfilment: "ship", pickupSlot: undefined,
    shipping: { line1: "1 High St", city: "Leeds", postcode: "LS1 1AA", country: "UK" },
    items: [{ sku: "bean-lot-11", qty: 1 }],
  });
  const id = await idOf(code);
  const token = await login();
  const list = await request(t.app).get("/api/staff/orders").set(auth(token));
  assert.equal(list.body.orders.find((o) => o.code === code).shipping.city, "Leeds");
  let res = await request(t.app).patch(`/api/staff/orders/${id}/status`).set(auth(token)).send({ status: "ready" });
  assert.equal(res.status, 409);
  for (const status of ["preparing", "shipped"]) {
    res = await request(t.app).patch(`/api/staff/orders/${id}/status`).set(auth(token)).send({ status });
    assert.equal(res.status, 200);
  }
});

test("skipping steps is rejected; cancelling frees the slot", async () => {
  const code = await place();
  const id = await idOf(code);
  const token = await login();
  let res = await request(t.app).patch(`/api/staff/orders/${id}/status`).set(auth(token)).send({ status: "ready" });
  assert.equal(res.status, 409);
  res = await request(t.app).patch(`/api/staff/orders/${id}/status`).set(auth(token)).send({ status: "cancelled" });
  assert.equal(res.status, 200);
  const slots = await request(t.app).get("/api/slots");
  assert.equal(slots.body.slots.find((s) => s.at === SLOT).remaining, t.config.slotCapacity);
});

test("bad status values, unknown ids and non-numeric ids", async () => {
  const token = await login();
  let res = await request(t.app).patch("/api/staff/orders/1/status").set(auth(token)).send({ status: "teleported" });
  assert.equal(res.status, 400);
  res = await request(t.app).patch("/api/staff/orders/999999/status").set(auth(token)).send({ status: "preparing" });
  assert.equal(res.status, 404);
  res = await request(t.app).patch("/api/staff/orders/abc/status").set(auth(token)).send({ status: "preparing" });
  assert.equal(res.status, 404);
  res = await request(t.app).patch("/api/staff/orders/99999999999/status").set(auth(token)).send({ status: "preparing" });
  assert.equal(res.status, 404);
});

test("login is rate limited", async () => {
  const limited = await makeTestApp({ config: { rateLimit: { orders: { windowMs: 60000, max: 100 }, status: { windowMs: 60000, max: 100 }, login: { windowMs: 60000, max: 3 } } } });
  try {
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await request(limited.app).post("/api/staff/login").send({ passcode: "x" })).status);
    assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
  } finally { await limited.close(); }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/staff.test.js`
Expected: FAIL — 404 `not_found` on `/api/staff/login`.

- [ ] **Step 3: Implement `backend/src/auth.js`**

```js
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { ApiError } = require("./errors");

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const passcodeMatches = (input, expected) => crypto.timingSafeEqual(sha(input), sha(expected));

const signStaffToken = (config) => jwt.sign({ role: "staff" }, config.jwtSecret, { algorithm: "HS256", expiresIn: "12h" });

function requireStaff(config) {
  return (req, res, next) => {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    try {
      const claims = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
      if (claims.role !== "staff") throw new Error("wrong role");
      next();
    } catch {
      next(new ApiError(401, "unauthorized", "Staff sign-in required."));
    }
  };
}

module.exports = { passcodeMatches, signStaffToken, requireStaff };
```

- [ ] **Step 4: Implement `backend/src/routes/staff.js` and mount it**

```js
const { Router } = require("express");
const { ApiError } = require("../errors");
const { parse, loginSchema, statusSchema } = require("../validate");
const { passcodeMatches, signStaffToken, requireStaff } = require("../auth");
const { listOrders, updateStatus, staffView } = require("../orders");

function staffRoutes({ db, config, limits }) {
  const r = Router();

  r.post("/login", limits.login, (req, res) => {
    const { passcode } = parse(loginSchema, req.body);
    if (!passcodeMatches(passcode, config.staffPasscode)) {
      throw new ApiError(401, "bad_passcode", "That passcode isn't right.");
    }
    res.json({ token: signStaffToken(config), expiresIn: 43200 });
  });

  r.use(requireStaff(config));

  r.get("/orders", async (req, res) => {
    res.json({ orders: (await listOrders(db)).map(staffView) });
  });

  r.patch("/orders/:id/status", async (req, res) => {
    if (!/^\d{1,9}$/.test(req.params.id)) throw new ApiError(404, "not_found", "No such order.");
    const { status } = parse(statusSchema, req.body);
    const order = await updateStatus({ db, id: Number(req.params.id), to: status });
    res.json({ order: staffView(order) });
  });

  return r;
}

module.exports = { staffRoutes };
```

In `backend/src/app.js` add `const { staffRoutes } = require("./routes/staff");` and, directly after the `publicRoutes` line:

```js
  app.use("/api/staff", staffRoutes({ db, config, limits }));
```

- [ ] **Step 5: Run the whole suite**

Run: `cd backend && npm test`
Expected: PASS (all files).

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(api): staff passcode login and order status processing" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Frontend foundations — config, util, API client, cart store

**Files:**
- Create: `config.js`, `util.js`, `api.js`, `cart-store.js`
- Test: `backend/test/cart-store.test.js` (the cart store is a pure module required from the site root)

**Interfaces:**
- Produces: `window.ALTURA_API` (string); `window.AlturaUtil = { h(tag, attrs, ...kids) → Element, money(cents) → "$4.20", $, $$ }`; `window.AlturaAPI = { products(), slots(), createOrder(order), order(code), staffLogin(passcode), staffOrders(token), staffSetStatus(token, id, status) }` — each returns a Promise of the parsed JSON; rejects with `Error` carrying `.code`, `.status`, `.details` (network failures have `.code === "network"`)
- Produces: `AlturaCartStore.createCart(storage) → { lines() → [{sku, qty}], count(), add(sku, qty = 1), setQty(sku, qty), clear(), prune(validSkuSet), subscribe(fn) → unsubscribe }` — qty is clamped 1–20; also `module.exports` under Node

- [ ] **Step 1: Write the failing test**

`backend/test/cart-store.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { createCart, KEY } = require("../../cart-store");

function memoryStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[KEY, initial]]);
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v), data };
}

test("add, setQty, remove and count", () => {
  const cart = createCart(memoryStorage());
  cart.add("espresso");
  cart.add("espresso", 2);
  cart.add("chai");
  assert.deepEqual(cart.lines(), [{ sku: "espresso", qty: 3 }, { sku: "chai", qty: 1 }]);
  assert.equal(cart.count(), 4);
  cart.setQty("espresso", 1);
  cart.setQty("chai", 0);
  assert.deepEqual(cart.lines(), [{ sku: "espresso", qty: 1 }]);
});

test("quantity is capped at 20", () => {
  const cart = createCart(memoryStorage());
  cart.add("espresso", 15);
  cart.add("espresso", 15);
  assert.equal(cart.lines()[0].qty, 20);
  cart.setQty("espresso", 99);
  assert.equal(cart.lines()[0].qty, 20);
});

test("persists to storage and reloads", () => {
  const storage = memoryStorage();
  createCart(storage).add("cortado", 2);
  assert.deepEqual(createCart(storage).lines(), [{ sku: "cortado", qty: 2 }]);
});

test("corrupted storage yields an empty cart instead of throwing", () => {
  for (const bad of ["{not json", "null", '"str"', "42", '{"a":1}']) {
    assert.deepEqual(createCart(memoryStorage(bad)).lines(), [], bad);
  }
});

test("invalid lines in storage are dropped, valid ones kept", () => {
  const raw = JSON.stringify([{ sku: "espresso", qty: 2 }, { sku: "x", qty: 0 }, { sku: "y", qty: 99 }, { sku: 5, qty: 1 }, null, { sku: "chai", qty: 1.5 }]);
  assert.deepEqual(createCart(memoryStorage(raw)).lines(), [{ sku: "espresso", qty: 2 }]);
});

test("works with no storage at all, and when storage throws", () => {
  const cart = createCart(null);
  cart.add("espresso");
  assert.equal(cart.count(), 1);
  const exploding = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  const c2 = createCart(exploding);
  c2.add("chai");
  assert.equal(c2.count(), 1);
});

test("prune drops skus that are no longer sold", () => {
  const cart = createCart(memoryStorage());
  cart.add("espresso");
  cart.add("retired-item");
  cart.prune(new Set(["espresso"]));
  assert.deepEqual(cart.lines(), [{ sku: "espresso", qty: 1 }]);
});

test("subscribers are notified on change and can unsubscribe", () => {
  const cart = createCart(memoryStorage());
  let calls = 0;
  const off = cart.subscribe(() => calls++);
  cart.add("espresso");
  cart.clear();
  off();
  cart.add("chai");
  assert.equal(calls, 2);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npm test -- test/cart-store.test.js`
Expected: FAIL — `Cannot find module '../../cart-store'`.

- [ ] **Step 3: Implement `cart-store.js`**

```js
(function (root) {
  const KEY = "altura.cart.v1";
  const MAX_QTY = 20;
  const valid = (l) => l && typeof l.sku === "string" && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= MAX_QTY;

  function createCart(storage) {
    const subs = new Set();
    let lines = [];
    try {
      const parsed = JSON.parse(storage && storage.getItem(KEY));
      if (Array.isArray(parsed)) lines = parsed.filter(valid).map((l) => ({ sku: l.sku, qty: l.qty }));
    } catch { /* unreadable storage: start empty */ }

    function save() {
      try { storage && storage.setItem(KEY, JSON.stringify(lines)); } catch { /* private mode etc. */ }
      subs.forEach((fn) => fn(lines));
    }

    return {
      lines: () => lines.map((l) => ({ ...l })),
      count: () => lines.reduce((n, l) => n + l.qty, 0),
      add(sku, qty = 1) {
        const line = lines.find((l) => l.sku === sku);
        if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
        else lines.push({ sku, qty: Math.min(MAX_QTY, qty) });
        save();
      },
      setQty(sku, qty) {
        if (qty <= 0) lines = lines.filter((l) => l.sku !== sku);
        else {
          const line = lines.find((l) => l.sku === sku);
          if (line) line.qty = Math.min(MAX_QTY, qty);
        }
        save();
      },
      clear() { lines = []; save(); },
      prune(validSkus) { lines = lines.filter((l) => validSkus.has(l.sku)); save(); },
      subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    };
  }

  const api = { createCart, KEY };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AlturaCartStore = api;
})(typeof window !== "undefined" ? window : globalThis);
```

- [ ] **Step 4: Create `config.js`, `util.js`, `api.js`**

`config.js`:

```js
// Base URL of the Altura API. Change this per environment (no trailing slash needed).
window.ALTURA_API = "http://localhost:3000";
```

`util.js`:

```js
(function () {
  // Builds DOM with text nodes only, so customer-supplied strings can never become markup.
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const money = (cents) => "$" + (cents / 100).toFixed(2);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  window.AlturaUtil = { h, money, $, $$ };
})();
```

`api.js`:

```js
(function () {
  const base = () => String(window.ALTURA_API || "").replace(/\/$/, "");

  async function request(path, { method = "GET", body, token } = {}) {
    let res;
    try {
      res = await fetch(base() + path, {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error("Can't reach the café's order system. Check your connection and try again."), { code: "network" });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = data && data.error;
      throw Object.assign(new Error((e && e.message) || "Something went wrong. Please try again."), {
        code: (e && e.code) || "error", status: res.status, details: e && e.details,
      });
    }
    return data;
  }

  window.AlturaAPI = {
    products: () => request("/api/products"),
    slots: () => request("/api/slots"),
    createOrder: (order) => request("/api/orders", { method: "POST", body: order }),
    order: (code) => request("/api/orders/" + encodeURIComponent(code)),
    staffLogin: (passcode) => request("/api/staff/login", { method: "POST", body: { passcode } }),
    staffOrders: (token) => request("/api/staff/orders", { token }),
    staffSetStatus: (token, id, status) => request(`/api/staff/orders/${id}/status`, { method: "PATCH", body: { status }, token }),
  };
})();
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add config.js util.js api.js cart-store.js backend/test/cart-store.test.js
git commit -m "feat(web): API client, DOM helper and persistent cart store" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Menu and beans become orderable

**Files:**
- Modify: `index.html` (data-sku on 14 menu rows; script tags; stylesheet link; tab badge)
- Modify: `main.js` (bean cards: `data-sku`, replace the "Pick up in store" link with an add button)
- Create: `shop.js`, `shop.css`

**Interfaces:**
- Consumes: `AlturaAPI.products()`, `AlturaCartStore.createCart`, `AlturaUtil` (Task 7)
- Produces: `window.Altura = { cart, money, products: Map<sku, {sku, kind, name, note, priceCents, available}>, ready: boolean, error: string|null, onChange(fn), emit() }`. `shop.js` calls `emit()` after products load or fail. Elements with `[data-sku]` get prices from the API and an add button; clicking adds to the cart.

- [ ] **Step 1: Check the pre-existing uncommitted edits**

`index.html`, `main.js` and `styles.css` already contain uncommitted changes from before this work (`git diff --stat` showed 3 files, +26/−48). Run `git diff --stat -- index.html main.js styles.css`. If those edits are still uncommitted, **ask the user** whether to commit them first as their own commit (recommended, so ordering changes stay reviewable) or leave them uncommitted and use `git add -p` for this task's hunks. Do not discard them.

- [ ] **Step 2: Tag the 14 menu rows with SKUs**

Create `C:\Users\ydaru\AppData\Local\Temp\claude\C--Projects-WebSites-coffee1\9be9c951-3791-45e7-955b-54b9df6adab1\scratchpad\tag-menu.js` (scratchpad, not in the repo):

```js
const fs = require("fs");
const file = "C:/Projects/WebSites/coffee1/index.html";
let s = fs.readFileSync(file, "utf8");
const map = {
  "Espresso": "espresso", "Cortado": "cortado", "Flat white": "flat-white", "Ridge latte": "ridge-latte",
  "Batch brew": "batch-brew", "Pour-over": "pour-over", "Cold brew": "cold-brew", "Cascara tonic": "cascara-tonic",
  "Hot chocolate": "hot-chocolate", "Chai": "chai", "Fresh mint": "fresh-mint",
  "Cardamom bun": "cardamom-bun", "Olive oil cake": "olive-oil-cake", "Trail toast": "trail-toast",
};
let n = 0;
s = s.replace(/<li><span class="m-name">([^<]+)<\/span>/g, (m, name) => {
  if (!map[name]) throw new Error("No sku for " + name);
  n++;
  return `<li data-sku="${map[name]}"><span class="m-name">${name}</span>`;
});
if (n !== 14) throw new Error("Expected 14 menu rows, tagged " + n);
fs.writeFileSync(file, s);
console.log("tagged", n);
```

Run: `node "C:/Users/ydaru/AppData/Local/Temp/claude/C--Projects-WebSites-coffee1/9be9c951-3791-45e7-955b-54b9df6adab1/scratchpad/tag-menu.js"`
Expected: `tagged 14`.

- [ ] **Step 3: Wire scripts, stylesheet and the tab badge in `index.html`**

Add after the existing `<link rel="stylesheet" href="styles.css">`:

```html
  <link rel="stylesheet" href="shop.css">
```

Replace the `.tab-order` anchor (keep the `mailto:` as the no-JS fallback) with:

```html
    <a class="tab tab-order" href="mailto:hello@altura.coffee?subject=Order%20ahead"><span class="tab-label">Order ahead</span><span class="tab-count" aria-hidden="true"></span><span class="tab-arrow" aria-hidden="true">↗</span></a>
```

Replace the single `<script src="main.js"></script>` line with (order matters: `main.js` builds the bean cards that `shop.js` decorates):

```html
  <script src="config.js"></script>
  <script src="util.js"></script>
  <script src="api.js"></script>
  <script src="cart-store.js"></script>
  <script src="main.js"></script>
  <script src="shop.js"></script>
```

(`cart-ui.js` and `checkout.js` are added in Tasks 9–10.)

- [ ] **Step 4: Update the bean cards in `main.js`**

Add `sku` to each `BEANS` entry: `sku: "bean-lot-07"` on Lot 07, `sku: "bean-lot-11"` on Lot 11, `sku: "bean-lot-02"` on Lot 02 (put it next to `lot:`).

In the `BEANS.forEach` card template, change the card element line and the foot. Replace

```js
  card.className = "bean";
```

with

```js
  card.className = "bean";
  card.dataset.sku = b.sku;
```

Replace

```js
      <a href="#visit">Pick up in store</a>
    </div>`;
```

with

```js
      <button class="add add-bean" type="button">Add to order</button>
    </div>`;
```

and delete the whole `card.querySelector(".bean-foot a").addEventListener("click", ...)` block (the 4 lines that scroll to `#visit`).

- [ ] **Step 5: Create `shop.js`**

```js
(function () {
  const { h, money, $, $$ } = window.AlturaUtil;

  let storage = null;
  try { storage = window.localStorage; } catch { /* blocked */ }
  const cart = window.AlturaCartStore.createCart(storage);

  const Altura = {
    cart, money,
    products: new Map(),
    ready: false,
    error: null,
    listeners: new Set(),
    onChange(fn) { this.listeners.add(fn); },
    emit() { this.listeners.forEach((fn) => fn()); },
  };
  window.Altura = Altura;

  const nodes = $$("[data-sku]");

  function setAddState(btn, enabled, label) {
    btn.disabled = !enabled;
    btn.title = enabled ? "" : label;
  }

  function decorate() {
    nodes.forEach((node) => {
      const p = Altura.products.get(node.dataset.sku);
      const btn = $(".add", node);
      if (!btn) return;
      if (!p) { setAddState(btn, false, Altura.error || "Not available for ordering"); return; }
      const price = $(".m-price, .bean-price", node);
      if (price) {
        if ($("small", price)) price.firstChild.nodeValue = money(p.priceCents);
        else price.textContent = money(p.priceCents);
      }
      setAddState(btn, p.available, "Sold out right now");
    });
  }

  nodes.forEach((node) => {
    const name = node.dataset.sku;
    let btn = $(".add", node);
    if (!btn) { // menu rows: append a "+" button; bean cards already have one from main.js
      const label = $(".m-name", node).textContent;
      btn = h("button", { class: "add", type: "button", "aria-label": `Add ${label} to order` }, "+");
      node.append(btn);
    }
    btn.disabled = true; // until the API answers
    btn.addEventListener("click", () => {
      if (!Altura.products.get(name)) return;
      Altura.cart.add(name);
      btn.classList.add("is-added");
      setTimeout(() => btn.classList.remove("is-added"), 600);
    });
  });

  window.AlturaAPI.products()
    .then(({ products }) => {
      products.forEach((p) => Altura.products.set(p.sku, p));
      Altura.cart.prune(new Set(products.filter((p) => p.available).map((p) => p.sku)));
      Altura.ready = true;
    })
    .catch((err) => {
      Altura.error = "Online ordering is offline right now. You can still visit us on Wharf Street.";
      console.warn("[altura] products failed:", err.message);
    })
    .finally(() => { decorate(); Altura.emit(); });
})();
```

- [ ] **Step 6: Create `shop.css` (add buttons and tab badge)**

```css
/* Altura ordering UI. Uses the tokens from styles.css. */

/* --- add buttons ------------------------------------------------ */
.add {
  font: 800 18px/1 var(--f-display); width: 30px; height: 30px; align-self: center;
  border: 1.5px solid var(--ink); background: transparent; color: var(--ink); cursor: pointer;
  transition: background-color 0.3s var(--ui), color 0.3s var(--ui), border-color 0.3s var(--ui);
}
.add:hover:not(:disabled) { background: var(--cherry); border-color: var(--cherry); color: var(--paper); }
.add:disabled { opacity: 0.35; cursor: not-allowed; }
.add:focus-visible { outline: 2px solid var(--cherry); outline-offset: 2px; }
.add.is-added { background: var(--bean); border-color: var(--bean); color: var(--ink); }
.menu-group li[data-sku] { grid-template-columns: auto 1fr auto auto; }
.add-bean {
  width: auto; height: auto; padding: 10px 12px; border: 0; background: var(--trail); color: var(--deep);
  font: 700 13px/1 var(--f-display); letter-spacing: 0.14em; text-transform: uppercase;
}
.add-bean:hover:not(:disabled) { background: #fff; color: var(--deep); }
.add-bean.is-added { background: var(--bean); color: var(--deep); }
@media (max-width: 899px) {
  .menu-group li[data-sku] { grid-template-columns: 1fr auto auto; }
}

/* --- tab bar badge ---------------------------------------------- */
.tab-order { position: relative; }
.tab-count {
  position: absolute; top: 6px; right: 6px; z-index: 2; pointer-events: none;
  min-width: 20px; padding: 3px 6px; border-radius: 999px; text-align: center;
  background: var(--paper); color: var(--cherry); font: 800 12px/1 var(--f-display);
}
.tab-count:empty { display: none; }
```

- [ ] **Step 7: Verify in the browser**

Start both servers (background): `cd backend && npm run dev` and, from the repo dir, `npx --yes serve -l 5173 .`. With the Playwright MCP tools, open `http://localhost:5173`, wait for the loader, scroll to Menu and Beans.
Expected: every menu row shows a `+` button and prices like `$3.20`; bean cards show `$15.00 / 250 g` and an "Add to order" button; clicking `+` adds the `is-added` flash and `localStorage["altura.cart.v1"]` gains a line; the console has no errors.

**Review Focus check (API down):** stop the backend, reload. Expected: the site still renders with its original static prices, all add buttons are disabled with the "offline" tooltip, and the console shows one `[altura] products failed` warning and no uncaught errors. Restart the backend afterwards.

- [ ] **Step 8: Commit**

```bash
git add index.html main.js shop.js shop.css
git commit -m "feat(web): make menu rows and bean lots orderable from the API" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Cart drawer and the "Order ahead" tab

**Files:**
- Create: `cart-ui.js`
- Modify: `shop.css` (drawer styles), `index.html` (script tag)

**Interfaces:**
- Consumes: `window.Altura` (Task 8), `AlturaUtil`
- Produces: `Altura.openCart()`, `Altura.closeCart()`, `Altura.showPanel("cart" | "checkout")`; the drawer contains `[data-panel="cart"]` and `[data-panel="checkout"]` (the latter is filled by `Altura.renderCheckout()`, defined in Task 10 and called by `showPanel("checkout")` when present)

- [ ] **Step 1: Create `cart-ui.js`**

```js
(function () {
  const { h, money, $ } = window.AlturaUtil;
  const A = window.Altura;
  const root = document.documentElement;

  const backdrop = h("div", { class: "cart-backdrop", onclick: () => A.closeCart() });
  const panelCart = h("div", { class: "cart-panel", "data-panel": "cart" });
  const panelCheckout = h("div", { class: "cart-panel", "data-panel": "checkout", hidden: true });
  const drawer = h("aside", { class: "cart", role: "dialog", "aria-modal": "true", "aria-label": "Your order", tabindex: "-1" }, panelCart, panelCheckout);
  document.body.append(backdrop, drawer);

  // The trail stage listens for wheel/touch/keys on window; keep those away from the drawer.
  ["wheel", "touchstart", "touchmove", "touchend", "keydown"].forEach((type) =>
    drawer.addEventListener(type, (e) => { if (!(type === "keydown" && e.key === "Escape")) e.stopPropagation(); }, { passive: true }));

  let lastFocus = null;

  A.openCart = function openCart() {
    lastFocus = document.activeElement;
    A.showPanel("cart");
    root.classList.add("cart-open");
    drawer.focus({ preventScroll: true });
  };
  A.closeCart = function closeCart() {
    root.classList.remove("cart-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  A.showPanel = function showPanel(name) {
    panelCart.hidden = name !== "cart";
    panelCheckout.hidden = name !== "checkout";
    if (name === "checkout" && A.renderCheckout) A.renderCheckout();
    if (name === "cart") renderCart();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("cart-open")) A.closeCart();
  });

  function resolvedLines() {
    return A.cart.lines().map((l) => ({ ...l, p: A.products.get(l.sku) })).filter((l) => l.p);
  }

  function lineEl({ sku, qty, p }) {
    return h("li", { class: "cart-line" },
      h("div", {}, h("p", { class: "cart-name" }, p.name), h("p", { class: "cart-unit" }, money(p.priceCents))),
      h("div", { class: "qty" },
        h("button", { type: "button", "data-key": sku + ":-", "aria-label": `Remove one ${p.name}`, onclick: () => A.cart.setQty(sku, qty - 1) }, "−"),
        h("span", { "aria-live": "polite" }, qty),
        h("button", { type: "button", "data-key": sku + ":+", "aria-label": `Add one ${p.name}`, disabled: qty >= 20, onclick: () => A.cart.setQty(sku, qty + 1) }, "+")),
      h("p", { class: "cart-line-total" }, money(p.priceCents * qty)));
  }

  function renderCart() {
    const focusKey = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
    const lines = resolvedLines();
    const total = lines.reduce((sum, l) => sum + l.p.priceCents * l.qty, 0);
    panelCart.replaceChildren(
      h("header", { class: "cart-head" },
        h("h2", {}, "Your order"),
        h("button", { class: "cart-x", type: "button", "aria-label": "Close order", onclick: () => A.closeCart() }, "×")),
      h("div", { class: "cart-body" },
        A.error ? h("p", { class: "cart-error", role: "alert" }, A.error) : null,
        lines.length
          ? h("ul", { class: "cart-lines" }, lines.map(lineEl))
          : h("p", { class: "cart-empty" }, "Nothing here yet. Add a flat white and we'll start the kettle.")),
      h("footer", { class: "cart-foot" },
        h("p", { class: "cart-total" }, h("span", {}, "Total"), h("strong", {}, money(total))),
        h("button", { class: "btn", type: "button", disabled: !lines.length, onclick: () => A.showPanel("checkout") }, "Checkout")));
    if (focusKey) { const again = drawer.querySelector(`[data-key="${focusKey}"]`); if (again && !again.disabled) again.focus({ preventScroll: true }); }
  }

  const tab = $(".tab-order");
  const badge = $(".tab-count", tab);
  function renderBadge() {
    const n = A.cart.count();
    badge.textContent = n ? String(n) : "";
    tab.setAttribute("aria-label", n ? `Order ahead, ${n} item${n === 1 ? "" : "s"} in your order` : "Order ahead");
  }
  // capture phase: beat any other click handler on the tab bar and the mailto fallback
  tab.addEventListener("click", (e) => { e.preventDefault(); e.stopImmediatePropagation(); A.openCart(); }, true);

  function refresh() {
    renderBadge();
    if (!panelCart.hidden) renderCart();
  }
  A.cart.subscribe(refresh);
  A.onChange(refresh);
  renderBadge();
  renderCart();
})();
```

- [ ] **Step 2: Add the script and drawer styles**

In `index.html`, add `<script src="cart-ui.js"></script>` after `shop.js`.

Append to `shop.css`:

```css
/* --- cart drawer ------------------------------------------------- */
html.cart-open { overflow: hidden; }
.cart-backdrop {
  position: fixed; inset: 0; z-index: 30; background: rgb(26 31 21 / 0.55);
  opacity: 0; pointer-events: none; transition: opacity 0.525s var(--ui);
}
.cart {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 31; width: min(440px, 100vw);
  display: flex; flex-direction: column; background: var(--paper); color: var(--ink);
  border-left: 1.5px solid var(--ink); outline: none;
  transform: translateX(100%); visibility: hidden;
  transition: transform 0.525s var(--ui), visibility 0s 0.525s;
}
html.cart-open .cart-backdrop { opacity: 1; pointer-events: auto; }
html.cart-open .cart { transform: none; visibility: visible; transition: transform 0.525s var(--ui); }
.cart-panel { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.cart-panel[hidden] { display: none; }
.cart-head { display: flex; justify-content: space-between; align-items: center; padding: 22px 24px 16px; border-bottom: 1.5px solid var(--ink); }
.cart-head h2 { font: 900 44px/0.9 var(--f-display); text-transform: uppercase; }
.cart-x { font: 400 32px/1 var(--f-display); width: 40px; height: 40px; border: 0; background: transparent; cursor: pointer; color: var(--ink); }
.cart-x:hover { color: var(--cherry); }
.cart-body { flex: 1; overflow-y: auto; padding: 8px 24px 24px; overscroll-behavior: contain; }
.cart-empty, .cart-error { margin-top: 24px; font-style: italic; color: var(--ink-64); }
.cart-error { color: var(--cherry); font-style: normal; }
.cart-lines { list-style: none; margin: 0; padding: 0; }
.cart-line { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--ink-16); }
.cart-name { font: 800 22px/1 var(--f-display); text-transform: uppercase; }
.cart-unit { font-size: 14px; color: var(--terrain); margin-top: 4px; }
.cart-line-total { font: 800 22px/1 var(--f-display); font-variant-numeric: tabular-nums; min-width: 4.5ch; text-align: right; }
.qty { display: inline-flex; align-items: center; gap: 10px; }
.qty button { width: 30px; height: 30px; border: 1.5px solid var(--ink); background: transparent; font: 800 18px/1 var(--f-display); cursor: pointer; color: var(--ink); }
.qty button:hover:not(:disabled) { background: var(--ink); color: var(--paper); }
.qty button:disabled { opacity: 0.35; cursor: not-allowed; }
.qty span { min-width: 2ch; text-align: center; font: 800 18px/1 var(--f-display); }
.cart-foot { padding: 18px 24px 24px; border-top: 1.5px solid var(--ink); display: grid; gap: 14px; }
.cart-total { display: flex; justify-content: space-between; align-items: baseline; font: 700 14px/1 var(--f-display); letter-spacing: 0.14em; text-transform: uppercase; }
.cart-total strong { font: 900 40px/1 var(--f-display); letter-spacing: 0; }
.btn {
  font: 800 18px/1 var(--f-display); letter-spacing: 0.1em; text-transform: uppercase;
  padding: 18px 20px; border: 0; background: var(--ink); color: var(--paper); cursor: pointer;
  transition: background-color 0.3s var(--ui);
}
.btn:hover:not(:disabled) { background: var(--cherry); }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn:focus-visible, .qty button:focus-visible, .cart-x:focus-visible { outline: 2px solid var(--cherry); outline-offset: 2px; }
@media (max-width: 899px) { .cart-line { grid-template-columns: 1fr auto; } .cart-line-total { grid-column: 2; grid-row: 1; } .qty { grid-column: 1 / -1; } }
```

- [ ] **Step 3: Verify in the browser**

Reload `http://localhost:5173`. Add two items; click the "Order ahead" tab.
Expected: the tab shows a count badge; the drawer slides in from the right with the lines, quantity steppers (focus stays on the pressed `+`/`−`), line totals and a running total matching server prices; `Escape` and the backdrop close it; page behind does not scroll or step the trail while the drawer is open (try wheel over the drawer while on the trail stage); `×` removes the last item and the empty message appears. No mailto navigation fires. Console clean.

- [ ] **Step 4: Commit**

```bash
git add cart-ui.js shop.css index.html
git commit -m "feat(web): cart drawer and order-ahead tab" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Checkout

**Files:**
- Create: `checkout.js`
- Modify: `shop.css` (form styles), `index.html` (script tag)

**Interfaces:**
- Consumes: `Altura.showPanel`, `Altura.cart`, `Altura.products`, `AlturaAPI.slots()`, `AlturaAPI.createOrder()`
- Produces: `Altura.renderCheckout()` — fills `[data-panel="checkout"]`. On success it clears the cart and navigates to `order.html?code=<code>`.

- [ ] **Step 1: Create `checkout.js`**

```js
(function () {
  const { h, money, $ } = window.AlturaUtil;
  const A = window.Altura;

  let idempotencyKey = null; // one key per checkout attempt, kept until the order succeeds

  const field = (label, name, extra = {}) =>
    h("label", { class: "field" }, h("span", {}, label), h("input", { name, required: true, ...extra }));

  A.renderCheckout = function renderCheckout() {
    const panel = $('[data-panel="checkout"]');
    const lines = A.cart.lines().map((l) => ({ ...l, p: A.products.get(l.sku) })).filter((l) => l.p);
    if (!lines.length) { A.showPanel("cart"); return; }
    const total = lines.reduce((sum, l) => sum + l.p.priceCents * l.qty, 0);
    const beansOnly = lines.every((l) => l.p.kind === "beans");
    idempotencyKey = idempotencyKey || crypto.randomUUID();
    let tz = "UTC";
    let busy = false;

    const errorBox = h("p", { class: "form-error", role: "alert" });
    const slotSelect = h("select", { name: "pickupSlot", required: true }, h("option", { value: "" }, "Loading times…"));
    const slotNote = h("p", { class: "field-note" });
    const pickupSet = h("fieldset", { class: "fs" }, h("label", { class: "field" }, h("span", {}, "Pickup time"), slotSelect), slotNote);
    const shipSet = h("fieldset", { class: "fs", hidden: true, disabled: true },
      field("Address", "line1", { autocomplete: "address-line1", maxlength: 120 }),
      field("City", "city", { autocomplete: "address-level2", maxlength: 80 }),
      field("Postcode", "postcode", { autocomplete: "postal-code", maxlength: 20 }),
      field("Country", "country", { autocomplete: "country-name", maxlength: 60 }));
    const payButton = h("button", { class: "btn", type: "submit" }, `Pay ${money(total)}`);

    const radio = (value, label, disabled, hint) =>
      h("label", { class: "choice" + (disabled ? " is-disabled" : "") },
        h("input", { type: "radio", name: "fulfilment", value, checked: value === "pickup", disabled }),
        h("span", {}, label), hint ? h("em", {}, hint) : null);

    const form = h("form", { class: "checkout", novalidate: false },
      h("fieldset", { class: "fs" },
        h("legend", {}, "Your details"),
        field("Name", "name", { autocomplete: "name", maxlength: 80 }),
        field("Email", "email", { type: "email", autocomplete: "email", maxlength: 120 })),
      h("fieldset", { class: "fs choices" },
        h("legend", {}, "How do you want it?"),
        radio("pickup", "Pick up at Wharf Street", false),
        radio("ship", "Ship to me", !beansOnly, beansOnly ? "Bean bags ship free" : "Only bean bags can be shipped")),
      pickupSet, shipSet,
      h("fieldset", { class: "fs" },
        h("legend", {}, "Payment (demo)"),
        field("Card number", "cardNumber", { inputmode: "numeric", autocomplete: "off", placeholder: "4242 4242 4242 4242", maxlength: 23 }),
        h("div", { class: "row2" },
          field("Expiry", "exp", { placeholder: "MM/YY", autocomplete: "off", maxlength: 5, pattern: "(0[1-9]|1[0-2])/\\d{2}" }),
          field("CVC", "cvc", { inputmode: "numeric", autocomplete: "off", maxlength: 4, pattern: "\\d{3,4}" })),
        h("p", { class: "field-note" }, "This is a demo: 4242 4242 4242 4242 pays, 4000 0000 0000 0002 declines. Use any future expiry and any CVC.")),
      errorBox,
      h("div", { class: "cart-foot-inline" },
        h("button", { class: "link", type: "button", onclick: () => A.showPanel("cart") }, "← Back to order"),
        payButton));

    panel.replaceChildren(
      h("header", { class: "cart-head" },
        h("h2", {}, "Checkout"),
        h("button", { class: "cart-x", type: "button", "aria-label": "Close checkout", onclick: () => A.closeCart() }, "×")),
      h("div", { class: "cart-body" }, form));

    const fmtSlot = (iso) => new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

    async function loadSlots() {
      try {
        const data = await window.AlturaAPI.slots();
        tz = data.tz;
        slotSelect.replaceChildren(
          data.slots.length
            ? [h("option", { value: "" }, "Choose a time"), ...data.slots.map((s) => h("option", { value: s.at }, fmtSlot(s.at)))]
            : [h("option", { value: "" }, "No pickup times left")]);
        slotNote.textContent = data.slots.length ? `Times shown in café time (${tz}).` : "We're closed for now. Try again when we're open.";
      } catch (err) {
        slotNote.textContent = err.message;
      }
    }
    loadSlots();

    form.addEventListener("change", (e) => {
      if (e.target.name !== "fulfilment") return;
      const ship = e.target.value === "ship";
      pickupSet.hidden = ship; pickupSet.disabled = ship;
      shipSet.hidden = !ship; shipSet.disabled = !ship;
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      const f = new FormData(form);
      const ship = f.get("fulfilment") === "ship";
      const payload = {
        idempotencyKey,
        customer: { name: f.get("name"), email: f.get("email") },
        fulfilment: f.get("fulfilment"),
        ...(ship
          ? { shipping: { line1: f.get("line1"), city: f.get("city"), postcode: f.get("postcode"), country: f.get("country") } }
          : { pickupSlot: f.get("pickupSlot") }),
        items: lines.map((l) => ({ sku: l.sku, qty: l.qty })),
        card: { number: f.get("cardNumber"), exp: f.get("exp"), cvc: f.get("cvc") },
      };
      busy = true; payButton.disabled = true; payButton.textContent = "Placing order…"; errorBox.textContent = "";
      try {
        const { order } = await window.AlturaAPI.createOrder(payload);
        idempotencyKey = null;
        A.cart.clear();
        location.href = "order.html?code=" + encodeURIComponent(order.code);
      } catch (err) {
        errorBox.textContent = err.message;
        if (err.code === "slot_full" || err.code === "slot_invalid") loadSlots();
        busy = false; payButton.disabled = false; payButton.textContent = `Pay ${money(total)}`;
      }
    });
  };
})();
```

- [ ] **Step 2: Add the script tag and form styles**

In `index.html`, add `<script src="checkout.js"></script>` after `cart-ui.js`.

Append to `shop.css`:

```css
/* --- checkout form ----------------------------------------------- */
.checkout { display: grid; gap: 18px; padding-top: 16px; }
.fs { border: 0; margin: 0; padding: 0; display: grid; gap: 12px; min-width: 0; }
.fs[hidden] { display: none; }
.fs legend { font: 700 13px/1 var(--f-display); letter-spacing: 0.14em; text-transform: uppercase; color: var(--terrain); padding: 0 0 10px; }
.field { display: grid; gap: 6px; }
.field > span { font: 700 12px/1 var(--f-display); letter-spacing: 0.14em; text-transform: uppercase; }
.field input, .field select {
  font: 400 17px/1.2 var(--f-serif); padding: 12px 12px; border: 1.5px solid var(--ink); background: #fff8; color: var(--ink); border-radius: 0; width: 100%;
}
.field input:focus-visible, .field select:focus-visible { outline: 2px solid var(--cherry); outline-offset: 1px; }
.field input:invalid:not(:placeholder-shown) { border-color: var(--cherry); }
.field-note { font-size: 13px; font-style: italic; color: var(--ink-64); }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.choices .choice { display: flex; gap: 10px; align-items: baseline; padding: 12px; border: 1.5px solid var(--ink-32); cursor: pointer; }
.choices .choice:has(input:checked) { border-color: var(--ink); background: var(--paper-2); }
.choices .choice.is-disabled { opacity: 0.5; cursor: not-allowed; }
.choice em { margin-left: auto; font-size: 13px; color: var(--terrain); }
.form-error { min-height: 1.2em; color: var(--cherry); font-weight: 600; }
.cart-foot-inline { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 8px; }
.link { background: none; border: 0; padding: 0; font: 700 13px/1 var(--f-display); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.link:hover { color: var(--cherry); }
```

- [ ] **Step 3: Verify in the browser (backend running)**

Reload, add a flat white and a cardamom bun, open the drawer → Checkout.
Expected checks, each with a screenshot or snapshot:
1. "Ship to me" is disabled with "Only bean bags can be shipped"; the pickup list shows times in café time and the first is ≥ 15 min away.
2. Submit empty → native validation blocks; submit with card `4111…` → inline "This is a demo shop…" message and the button re-enables.
3. Card `4000 0000 0000 0002` → "Your card was declined…" and **no order exists** (`curl -s localhost:3000/api/health` is fine; confirm via the staff list in Task 12).
4. Card `4242 4242 4242 4242`, any future expiry → redirects to `order.html?code=ALT-…` (404 until Task 11) and the cart badge is empty after returning to the site.
5. Beans-only cart: "Ship to me" enabled; picking it swaps the time select for the address fields; submitting without an address is blocked by validation.
6. Double-click "Pay" quickly → only one order (the button disables immediately).

- [ ] **Step 4: Commit**

```bash
git add checkout.js shop.css index.html
git commit -m "feat(web): checkout with pickup slots, shipping and simulated payment" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Customer order status page

**Files:**
- Create: `order.html`, `order.js`
- Modify: `shop.css` (status page styles)

**Interfaces:**
- Consumes: `AlturaAPI.order(code)` → `{ order: customerView, tz }` (shape in Task 5); `AlturaUtil`
- Produces: `order.html?code=ALT-XXXX-XXXX` — polls every 5 s while visible, stops at a terminal status (`completed`, `shipped`, `cancelled`) or on 404.

- [ ] **Step 1: Create `order.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your order — Altura Coffee</title>
  <meta name="robots" content="noindex">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="shop.css">
</head>
<body class="page-plain">
  <header class="plain-head">
    <a class="brand" href="index.html" aria-label="Altura Coffee, back to the site">
      <svg class="brand-mark" viewBox="0 0 36 24" aria-hidden="true"><path d="M1 22 L12 5 L18 13 L23 7 L35 22" /></svg>
      <span class="brand-word">Altura</span>
    </a>
  </header>
  <main class="plain-main" id="status" aria-live="polite"><p class="plain-note">Looking up your order…</p></main>
  <script src="config.js"></script>
  <script src="util.js"></script>
  <script src="api.js"></script>
  <script src="order.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `order.js`**

```js
(function () {
  const { h, money } = window.AlturaUtil;
  const main = document.getElementById("status");
  const code = new URLSearchParams(location.search).get("code") || "";
  const TERMINAL = ["completed", "shipped", "cancelled"];
  const LABEL = { new: "Received", preparing: "Being prepared", ready: "Ready for pickup", completed: "Collected", shipped: "Shipped", cancelled: "Cancelled" };
  const HEADLINE = {
    new: "We've got your order.",
    preparing: "We're making it now.",
    ready: "Ready. Come and get it.",
    completed: "Enjoy. See you again soon.",
    shipped: "On its way to you.",
    cancelled: "This order was cancelled.",
  };
  let timer = null;

  const stop = () => { clearTimeout(timer); timer = null; };
  const schedule = () => { stop(); timer = setTimeout(load, 5000); };

  function render(order, tz) {
    const cancelled = order.status === "cancelled";
    const at = order.pickupSlot
      ? new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(order.pickupSlot))
      : null;
    const current = order.steps.indexOf(order.status);
    main.replaceChildren(
      h("p", { class: "plain-kicker" }, `Order ${order.code}`),
      h("h1", { class: "plain-title" }, cancelled ? HEADLINE.cancelled : `Thanks, ${order.firstName}. ${HEADLINE[order.status]}`),
      cancelled ? null : h("ol", { class: "steps", "aria-label": "Order progress" },
        order.steps.map((s, i) => h("li", { class: i < current ? "is-done" : i === current ? "is-current" : "", "aria-current": i === current ? "step" : null }, LABEL[s]))),
      h("p", { class: "plain-where" },
        order.fulfilment === "pickup"
          ? `Pickup ${at} at 14 Wharf Street, the green door under the chestnut tree.`
          : "Shipping: we'll post your beans once they're roasted and packed."),
      h("ul", { class: "receipt" },
        order.items.map((i) => h("li", {}, h("span", {}, `${i.qty} × ${i.name}`), h("span", {}, money(i.unitPriceCents * i.qty)))),
        h("li", { class: "receipt-total" }, h("span", {}, "Total"), h("span", {}, money(order.totalCents)))),
      h("p", { class: "plain-note" }, "Keep this page's link; it's your receipt and it updates by itself."),
      h("a", { class: "link", href: "index.html" }, "← Back to Altura"));
    document.title = `${LABEL[order.status]} · ${order.code} — Altura Coffee`;
  }

  function renderMissing() {
    main.replaceChildren(
      h("p", { class: "plain-kicker" }, "Order not found"),
      h("h1", { class: "plain-title" }, "We can't find that order."),
      h("p", { class: "plain-note" }, "Check the code in your link. It looks like ALT-4K9F-X2QM."),
      h("a", { class: "link", href: "index.html" }, "← Back to Altura"));
  }

  async function load() {
    try {
      const { order, tz } = await window.AlturaAPI.order(code);
      render(order, tz);
      if (TERMINAL.includes(order.status)) return stop();
    } catch (err) {
      if (err.status === 404) { renderMissing(); return stop(); }
      let note = document.querySelector(".plain-retry");
      if (!note) { note = h("p", { class: "plain-note plain-retry" }); main.append(note); }
      note.textContent = "Can't refresh right now. Trying again…";
    }
    schedule();
  }

  document.addEventListener("visibilitychange", () => { if (!document.hidden && timer) load(); });
  load();
})();
```

- [ ] **Step 3: Append status page styles to `shop.css`**

```css
/* --- plain pages (order status, staff) --------------------------- */
.page-plain { background: var(--paper); color: var(--ink); min-height: 100vh; }
.plain-head { padding: 24px 40px; border-bottom: 1.5px solid var(--ink); }
.plain-head .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; }
.plain-head .brand-mark { width: 36px; height: 24px; fill: none; stroke: var(--ink); stroke-width: 3; stroke-linejoin: round; }
.plain-head .brand-word { font: 900 28px/1 var(--f-display); text-transform: uppercase; }
.plain-main { max-width: 720px; margin: 0 auto; padding: 56px 24px 96px; display: grid; gap: 22px; }
.plain-kicker { font: 700 13px/1 var(--f-display); letter-spacing: 0.14em; text-transform: uppercase; color: var(--terrain); }
.plain-title { font: 900 clamp(48px, 9vw, 92px)/0.9 var(--f-display); text-transform: uppercase; }
.plain-where, .plain-note { font-style: italic; color: var(--ink-64); }
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; list-style: none; margin: 0; padding: 0; counter-reset: s; }
.steps li { counter-increment: s; padding: 12px 10px; border-top: 4px solid var(--ink-16); font: 700 14px/1.1 var(--f-display); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-64); }
.steps li::before { content: counter(s) " · "; }
.steps li.is-done { border-color: var(--bean); color: var(--ink); }
.steps li.is-current { border-color: var(--cherry); color: var(--cherry); }
.receipt { list-style: none; margin: 0; padding: 0; border-top: 1.5px solid var(--ink); }
.receipt li { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--ink-16); font-variant-numeric: tabular-nums; }
.receipt .receipt-total { font: 900 28px/1 var(--f-display); text-transform: uppercase; border-bottom: 0; }
@media (max-width: 899px) { .plain-head { padding: 18px 16px; } .plain-main { padding: 36px 16px 72px; } }
```

- [ ] **Step 2b: Check that `styles.css` doesn't hide a plain page**

Open `order.html?code=ALT-AAAA-BBBB` in the browser. If the body is blank or scroll-locked, find the offending global rule in `styles.css` (look at `html`, `body`, `.loader`, `.is-loading`), and scope it to the home page rather than editing the plain page; report what you changed.

- [ ] **Step 3: Verify in the browser**

Place a pickup order through checkout (Task 10). Expected:
1. `order.html?code=…` shows the greeting with the first name, the 4-step progress with "Received" current, the pickup time in café time, the receipt with server prices and total, no email/address anywhere.
2. Page source of the status page has no customer email.
3. `order.html?code=ALT-AAAA-BBBB` → "We can't find that order." with no console errors beyond the 404 network line.
4. **HTML-in-name check:** place an order with name `<img src=x onerror="document.title='XSS'">` Alice; the status page shows `Thanks, <img.` as literal text, the title is not `XSS`, and no `img` element exists inside `#status`.
5. Updates live once staff change status (verified end-to-end in Task 12).

- [ ] **Step 4: Commit**

```bash
git add order.html order.js shop.css
git commit -m "feat(web): customer order status page with live updates" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Staff board

**Files:**
- Create: `staff.html`, `staff.js`
- Modify: `shop.css` (board styles)

**Interfaces:**
- Consumes: `AlturaAPI.staffLogin/staffOrders/staffSetStatus`; staff view shape (Task 5); `AlturaUtil`
- Produces: `staff.html` — passcode gate (token kept in `sessionStorage["altura.staff"]`), then a live board with columns New / Preparing / Ready / Done (completed + shipped), a cancelled counter, 5 s polling, new-order highlight, two-step cancel.

- [ ] **Step 1: Create `staff.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Staff board — Altura Coffee</title>
  <meta name="robots" content="noindex">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="shop.css">
</head>
<body class="page-plain page-staff">
  <header class="plain-head staff-head">
    <a class="brand" href="index.html" aria-label="Altura Coffee">
      <svg class="brand-mark" viewBox="0 0 36 24" aria-hidden="true"><path d="M1 22 L12 5 L18 13 L23 7 L35 22" /></svg>
      <span class="brand-word">Altura · Staff</span>
    </a>
    <p class="staff-meta" id="meta"></p>
    <button class="link" type="button" id="signout" hidden>Sign out</button>
  </header>
  <main id="app" class="staff-main"></main>
  <script src="config.js"></script>
  <script src="util.js"></script>
  <script src="api.js"></script>
  <script src="staff.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `staff.js`**

```js
(function () {
  const { h, money, $ } = window.AlturaUtil;
  const app = $("#app"), meta = $("#meta"), signout = $("#signout");
  const API = window.AlturaAPI;
  const COLUMNS = [
    { title: "New", match: ["new"] },
    { title: "Preparing", match: ["preparing"] },
    { title: "Ready", match: ["ready"] },
    { title: "Done", match: ["completed", "shipped"] },
  ];
  const ACTION = { preparing: "Start preparing", ready: "Mark ready", completed: "Mark collected", shipped: "Mark shipped", cancelled: "Cancel" };

  let token = null;
  try { token = sessionStorage.getItem("altura.staff"); } catch { /* blocked */ }
  let timer = null, seen = null, tz = "UTC";

  const slotLabel = (iso) => new Intl.DateTimeFormat("en", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const stopPolling = () => { clearTimeout(timer); timer = null; };

  function showLogin(message) {
    stopPolling(); token = null; seen = null;
    try { sessionStorage.removeItem("altura.staff"); } catch { /* blocked */ }
    signout.hidden = true; meta.textContent = "";
    const error = h("p", { class: "form-error", role: "alert" }, message || "");
    const input = h("input", { name: "passcode", type: "password", required: true, autocomplete: "current-password", "aria-label": "Staff passcode" });
    const form = h("form", { class: "login", onsubmit: async (e) => {
      e.preventDefault(); error.textContent = "";
      try {
        const res = await API.staffLogin(input.value);
        token = res.token;
        try { sessionStorage.setItem("altura.staff", token); } catch { /* blocked */ }
        showBoard();
      } catch (err) { error.textContent = err.message; input.select(); }
    } },
      h("label", { class: "field" }, h("span", {}, "Staff passcode"), input),
      h("button", { class: "btn", type: "submit" }, "Open the board"), error);
    app.replaceChildren(h("h1", { class: "plain-title" }, "Staff only"), form);
    input.focus();
  }

  function orderCard(o) {
    let armed = false, armTimer = null;
    const buttons = o.nextStatuses.map((status) => {
      const btn = h("button", { type: "button", class: status === "cancelled" ? "btn btn-quiet" : "btn btn-sm" }, ACTION[status]);
      btn.addEventListener("click", async () => {
        if (status === "cancelled" && !armed) {
          armed = true; btn.textContent = "Sure? Cancel order";
          armTimer = setTimeout(() => { armed = false; btn.textContent = ACTION.cancelled; }, 3000);
          return;
        }
        clearTimeout(armTimer);
        buttons.forEach((b) => (b.disabled = true));
        try { await API.staffSetStatus(token, o.id, status); await refresh(); }
        catch (err) {
          if (err.status === 401) return showLogin("Session expired. Sign in again.");
          buttons.forEach((b) => (b.disabled = false));
          meta.textContent = err.message;
        }
      });
      return btn;
    });
    return h("article", { class: "o-card" + (o.isNew ? " is-new" : "") },
      h("header", {}, h("strong", {}, o.code), h("span", {}, o.fulfilment === "pickup" ? slotLabel(o.pickupSlot) : "Ship")),
      h("p", { class: "o-who" }, o.customer.name, " · ", h("a", { href: "mailto:" + o.customer.email }, o.customer.email)),
      o.shipping ? h("p", { class: "o-addr" }, [o.shipping.line1, o.shipping.city, o.shipping.postcode, o.shipping.country].join(", ")) : null,
      h("ul", { class: "o-items" }, o.items.map((i) => h("li", {}, `${i.qty} × ${i.name}`))),
      h("p", { class: "o-total" }, money(o.totalCents)),
      h("div", { class: "o-actions" }, buttons));
  }

  function renderBoard(orders) {
    if (seen) orders.forEach((o) => { o.isNew = !seen.has(o.id); });
    seen = new Set(orders.map((o) => o.id));
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    meta.textContent = `${orders.length - cancelled} orders · ${cancelled} cancelled · updates every 5 s`;
    app.replaceChildren(h("div", { class: "board" }, COLUMNS.map((c) => {
      const list = orders.filter((o) => c.match.includes(o.status)).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      return h("section", { class: "col", "aria-label": c.title },
        h("h2", {}, c.title, h("span", {}, list.length)),
        list.length ? list.map(orderCard) : h("p", { class: "col-empty" }, "Nothing here"));
    })));
  }

  async function refresh() {
    try {
      const { orders } = await API.staffOrders(token);
      renderBoard(orders);
    } catch (err) {
      if (err.status === 401) return showLogin("Session expired. Sign in again.");
      meta.textContent = "Can't reach the server. Retrying…";
    }
  }

  function showBoard() {
    signout.hidden = false;
    app.replaceChildren(h("p", { class: "plain-note" }, "Loading orders…"));
    (async function loop() { await refresh(); if (token) timer = setTimeout(loop, 5000); })();
  }

  signout.addEventListener("click", () => showLogin());
  token ? showBoard() : showLogin();
})();
```

- [ ] **Step 3: Append board styles to `shop.css`**

```css
/* --- staff board -------------------------------------------------- */
.staff-head { display: flex; align-items: center; gap: 24px; }
.staff-meta { margin-left: auto; font-size: 13px; color: var(--terrain); }
.staff-main { padding: 32px 24px 80px; }
.login { display: grid; gap: 14px; max-width: 360px; margin-top: 24px; }
.board { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; align-items: start; }
.col { display: grid; gap: 12px; }
.col h2 { display: flex; justify-content: space-between; font: 900 28px/1 var(--f-display); text-transform: uppercase; padding-bottom: 10px; border-bottom: 1.5px solid var(--ink); }
.col h2 span { color: var(--terrain); }
.col-empty { font-style: italic; color: var(--ink-64); }
.o-card { display: grid; gap: 8px; padding: 14px; background: #fff8; border: 1.5px solid var(--ink-32); }
.o-card.is-new { border-color: var(--cherry); box-shadow: 0 0 0 3px rgb(185 72 47 / 0.18); }
.o-card header { display: flex; justify-content: space-between; font: 800 18px/1 var(--f-display); letter-spacing: 0.04em; }
.o-who, .o-addr { font-size: 14px; overflow-wrap: anywhere; }
.o-items { list-style: none; margin: 0; padding: 0; font-size: 15px; }
.o-total { font: 800 18px/1 var(--f-display); font-variant-numeric: tabular-nums; }
.o-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btn-sm { padding: 10px 12px; font-size: 14px; }
.btn-quiet { padding: 10px 12px; font-size: 14px; background: transparent; color: var(--ink); border: 1.5px solid var(--ink-32); }
.btn-quiet:hover:not(:disabled) { background: var(--cherry); border-color: var(--cherry); color: var(--paper); }
@media (max-width: 1099px) { .board { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 599px) { .board { grid-template-columns: 1fr; } .staff-head { flex-wrap: wrap; } .staff-meta { margin-left: 0; width: 100%; } }
```

- [ ] **Step 4: Verify the full flow in the browser (backend + static server running)**

1. Open `http://localhost:5173/staff.html`; wrong passcode → "That passcode isn't right."; passcode `altura-dev` → board with four columns.
2. In a second tab place a pickup order and a bean ship order. Within ~5 s both appear in **New** with the cherry "new" highlight; the ship card shows the address.
3. Open the pickup order's `order.html` page in a third tab. Press "Start preparing", then "Mark ready", then "Mark collected" on the board; the customer tab advances through Received → Being prepared → Ready for pickup → Collected within 5 s each, and polling stops after "Collected".
4. Ship order: only "Start preparing" then "Mark shipped" are offered (no "Mark ready").
5. Cancel flow: first click on Cancel changes the label to "Sure? Cancel order" and reverts after 3 s; second click cancels; the customer page shows "This order was cancelled." and the slot reappears in the checkout time list.
6. **HTML-in-name check:** place an order named `<script>document.title='XSS'</script>` Bob; the board shows it as literal text, the page title stays "Staff board — Altura Coffee".
7. Delete `sessionStorage["altura.staff"]`'s token value to garbage (DevTools) and wait one poll: the board returns to the login gate with "Session expired".
8. Failure check: stop the backend; the board shows "Can't reach the server. Retrying…" without clearing the cards; restart and it recovers.

- [ ] **Step 5: Commit**

```bash
git add staff.html staff.js shop.css
git commit -m "feat(web): staff board with live orders and status actions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Deployment readiness and database rollout

**Files:**
- Create: `backend/README.md`, `.vercelignore`
- Modify: `docs/superpowers/specs/2026-10-02-ordering-system-design.md` (record the final order-code format and `tz` field)

**Interfaces:**
- Consumes: everything above. Produces a repo that can be deployed as two services without code changes beyond env vars and the `config.js` URL.

- [ ] **Step 1: Write `backend/README.md`**

```markdown
# Altura API

Express + Postgres. Orders, pickup slots, simulated payments, staff board API.

## Run locally
    cd backend
    npm install
    npm run dev          # in-memory dev database, seeded; http://localhost:3000
    npm test

Serve the site (any static server) on http://localhost:5173 — `npx serve -l 5173 ..` from `backend/`.
Staff board: `/staff.html`, passcode `altura-dev` in development.

## Environment
See `.env.example`. Required in production: `DATABASE_URL`, `STAFF_PASSCODE`, `JWT_SECRET`, `FRONTEND_ORIGIN`
(exact origin(s) of the deployed site, comma separated, no trailing slash). Optional: `CAFE_TZ`, `SLOT_CAPACITY`,
`LEAD_MINUTES`, `AUTO_MIGRATE`, `DATABASE_SSL`.

## Database (Supabase)
1. Create a Supabase project. Use the **session pooler** connection string as `DATABASE_URL` (the direct host is IPv6-only on most platforms).
2. Apply the schema: `DATABASE_URL=... npm run migrate`, then load the menu: `DATABASE_URL=... npm run seed`.
3. RLS is enabled on every table with no policies, so the public Supabase API cannot read orders; the backend's direct connection bypasses RLS.

## Deploy
- **Backend** (Render / Railway / Fly): root directory `coffee1/backend`, build `npm install`, start `npm start`,
  health check `/api/health`. Set the env vars above. Deploy first so you have its URL.
- **Frontend** (Vercel / Netlify / Cloudflare Pages): publish the `coffee1/` directory as-is (no build step).
  Edit `config.js` so `window.ALTURA_API` is the backend's URL. On Vercel, `.vercelignore` keeps `backend/` and `docs/` out.
  Then set the backend's `FRONTEND_ORIGIN` to the frontend's URL and redeploy/restart the backend.
- Smoke test after deploying: `/api/health`, load the site, place an order with `4242 4242 4242 4242`, sign in at `/staff.html`.

## Changing things later
- Menu/prices: edit `src/db/products-data.js`, then `npm run seed` (upserts by sku).
- Real payments: replace `src/payments.js` (`charge({ amountCents, card })`); the call site runs inside the order transaction.
```

- [ ] **Step 2: Create `.vercelignore`**

```
backend
docs
```

- [ ] **Step 3: Update the spec's two details**

In `docs/superpowers/specs/2026-10-02-ordering-system-design.md`: change the order-code description to `ALT-XXXX-XXXX` (8 characters from a 30-letter/digit alphabet, so unguessable enough to act as the customer's status-page key), and add under `GET /api/orders/:code` and `POST /api/orders` that responses include `tz` (the café's IANA timezone) so the frontend can show times in café time.

- [ ] **Step 4: Ask the user before touching a real Supabase project**

Ask which Supabase project to use (or whether to create one; project creation can cost money and must be confirmed). Do not create, migrate or seed any project without an explicit yes naming it.

- [ ] **Step 5: Apply the schema and seed to the approved project**

With approval: apply `backend/src/db/schema.sql` via `mcp__plugin_supabase_supabase__apply_migration` (name `ordering_schema`), then seed with the 17 rows from `products-data.js` (via `execute_sql` inserts or `DATABASE_URL=… npm run seed` if the user supplies the pooler URL). Then run `mcp__plugin_supabase_supabase__get_advisors` (security) and confirm no "RLS disabled" warnings for `products`, `orders`, `order_items`.

- [ ] **Step 6: Run the backend against the real database and re-run the browser flow**

With the user's `DATABASE_URL` in a local, uncommitted `backend/.env` (`NODE_ENV=development`): start `npm run dev`, confirm `/api/products` returns 17 rows from Postgres and that placing an order succeeds with RLS on. Re-run Task 12 Step 4 items 1–5.

- [ ] **Step 7: Final verification and commit**

Run: `cd backend && npm test` → all green; `git status --short` shows no stray files (no `.env`, no `node_modules`).

```bash
git add backend/README.md .vercelignore docs/superpowers/specs/2026-10-02-ordering-system-design.md
git commit -m "docs: deployment guide, vercelignore, spec updates for ordering system" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Report**

Tell the user what was built, which verification ran (tests count, browser flows, Supabase advisors), anything not done (no deployment performed), and the two env changes needed to go live (`config.js` URL and `FRONTEND_ORIGIN`).

---

## Self-Review

**Spec coverage:** goal/scope (Tasks 5, 8–12) · architecture, CORS allowlist, bearer auth (2, 6) · data model incl. snapshots and RLS (1) · every API endpoint (2, 3, 5, 6) · status flow and ship rules (4, 5, 6) · simulated payments behind a module (4, 5) · frontend cart drawer, tab, checkout, status page, staff board (8–12) · safety: server pricing, validation, slot transaction, idempotency, rate limits, helmet, env secrets, error shape (2, 5, 6) · testing (all backend tasks + cart store + browser flows) · deploy notes, health endpoint, no deploy without approval (13). Gap closed: the spec's "unguessable" order code became 8 characters; the spec update is in Task 13 Step 3.

**Placeholder scan:** no TBD/TODO; every code step has complete code; the only deferred item is the user's Supabase project choice, which is an explicit approval gate, not a gap.

**Type consistency:** `createOrder/getOrderByCode/listOrders/updateStatus/customerView/staffView` names match across Tasks 5–6; `customerView` fields (`firstName`, `pickupSlot`, `steps`, `items[].unitPriceCents`) match `order.js`; `staffView` fields (`customer.email`, `shipping`, `nextStatuses`, `id`) match `staff.js`; `AlturaAPI` method names match their callers; `Altura.showPanel/openCart/closeCart/renderCheckout` match between `cart-ui.js` and `checkout.js`; `makeTestApp` signature matches every test.

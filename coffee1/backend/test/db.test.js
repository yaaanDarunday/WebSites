const test = require("node:test");
const assert = require("node:assert/strict");
const { makeTestDb } = require("./support/app");
const { createDb, warmUp } = require("../src/db");
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

test("the pg driver survives idle-connection errors and bounds connect time", async () => {
  const pgdb = await createDb({ databaseUrl: "postgres://u:p@127.0.0.1:1/x", databaseSsl: false });
  try {
    assert.ok(pgdb.pool.listenerCount("error") > 0, "pool needs an error listener or a dropped idle connection crashes the process");
    assert.equal(pgdb.pool.options.connectionTimeoutMillis, 30000, "a cold handshake to the pooler can take several seconds");
    assert.ok(pgdb.pool.options.idleTimeoutMillis >= 300000, "keep warm connections around instead of re-handshaking");
  } finally { await pgdb.close(); }
});

test("warm-up opens a connection, and reports a failure without throwing", async () => {
  assert.equal(await warmUp(db), true);
  const quiet = console.error; console.error = () => {};
  try { assert.equal(await warmUp({ query: async () => { throw new Error("nope"); } }), false); }
  finally { console.error = quiet; }
});

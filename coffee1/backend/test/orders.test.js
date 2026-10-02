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

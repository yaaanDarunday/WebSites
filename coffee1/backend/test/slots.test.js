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

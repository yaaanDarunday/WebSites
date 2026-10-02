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

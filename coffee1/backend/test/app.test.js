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

test("the deep health check passes when the database answers", async () => {
  const res = await request(t.app).get("/api/health/db");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test("liveness never touches the database; the deep check fails with a logged reason", async () => {
  const { createApp } = require("../src/app");
  const { loadConfig } = require("../src/config");
  const logged = [];
  const quiet = console.error; console.error = (...a) => logged.push(a.join(" "));
  const app = createApp({ db: { query: async () => { throw new Error("db unreachable"); } }, config: loadConfig({ NODE_ENV: "test" }) });
  try {
    const live = await request(app).get("/api/health");
    assert.equal(live.status, 200);
    assert.deepEqual(live.body, { ok: true });
    const deep = await request(app).get("/api/health/db");
    assert.equal(deep.status, 503);
    assert.deepEqual(deep.body, { ok: false });
    assert.ok(logged.some((l) => l.includes("db unreachable")), "the real error must reach the logs");
  } finally { console.error = quiet; }
});

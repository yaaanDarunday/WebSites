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

test("status lookups tolerate a café full of customers behind one IP", () => {
  assert.ok(loadConfig({}).rateLimit.status.max >= 600);
});

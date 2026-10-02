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
    NODE_ENV: "production", DATABASE_URL: "postgres://x", STAFF_PASSCODE: "p", JWT_SECRET: "j".repeat(32),
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

test("an unknown CAFE_TZ is refused at startup, not on the first customer's request", () => {
  assert.throws(() => loadConfig({ CAFE_TZ: "Zamboanga City, Zamboanga del Sur" }), /CAFE_TZ/);
  assert.equal(loadConfig({ CAFE_TZ: "Asia/Manila" }).cafeTz, "Asia/Manila");
});

test("FRONTEND_ORIGIN is normalised (trailing slash, spaces) and validated", () => {
  assert.deepEqual(loadConfig({ FRONTEND_ORIGIN: " https://a.example/ , https://b.example" }).frontendOrigins, ["https://a.example", "https://b.example"]);
  assert.throws(() => loadConfig({ FRONTEND_ORIGIN: "a.example" }), /FRONTEND_ORIGIN/);
  assert.throws(() => loadConfig({ FRONTEND_ORIGIN: "https://a.example/some/path" }), /FRONTEND_ORIGIN/);
});

test("production rejects a weak JWT_SECRET", () => {
  const base = { NODE_ENV: "production", DATABASE_URL: "postgres://x", STAFF_PASSCODE: "p" };
  assert.throws(() => loadConfig({ ...base, JWT_SECRET: "short" }), /JWT_SECRET/);
  assert.doesNotThrow(() => loadConfig({ ...base, JWT_SECRET: "j".repeat(32) }));
});

test("the backend pins the Node major it was tested on", () => {
  assert.match(require("../package.json").engines.node, /^24./);
});

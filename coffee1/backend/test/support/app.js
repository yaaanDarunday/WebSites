const { createDb } = require("../../src/db");
const { migrate } = require("../../src/db/migrate");
const { seedProducts } = require("../../src/db/seed");
const { loadConfig } = require("../../src/config");

const NOW = new Date("2026-10-05T10:00:00Z"); // Monday 10:00 UTC

async function makeTestDb() {
  const db = await createDb({ databaseUrl: null, prod: false });
  await migrate(db);
  await seedProducts(db);
  return db;
}

async function makeTestApp({ env = {}, config = {} } = {}) {
  const { createApp } = require("../../src/app");
  const roomy = { windowMs: 60_000, max: 10_000 }; // production limits would trip a busy test file
  const cfg = {
    ...loadConfig({ NODE_ENV: "test", CAFE_TZ: "UTC", ...env }),
    rateLimit: { orders: roomy, status: roomy, login: roomy },
    ...config,
  };
  const db = await makeTestDb();
  const app = createApp({ db, config: cfg, now: () => NOW });
  return {
    app, db, config: cfg, NOW,
    reset: () => db.query("truncate orders restart identity cascade"),
    close: () => db.close(),
  };
}

module.exports = { makeTestDb, makeTestApp, NOW };

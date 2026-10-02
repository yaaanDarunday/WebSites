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

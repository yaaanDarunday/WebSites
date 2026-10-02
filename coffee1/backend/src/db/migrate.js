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

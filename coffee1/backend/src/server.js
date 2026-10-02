require("dotenv").config();
const { loadConfig } = require("./config");
const { createDb, warmUp } = require("./db");
const { migrate } = require("./db/migrate");
const { seedProducts } = require("./db/seed");
const { createApp } = require("./app");

async function main() {
  const config = loadConfig();
  const db = await createDb(config);
  if (db.driver === "pglite") {
    await migrate(db);
    await seedProducts(db);
    console.log("Using an in-memory dev database (seeded). Orders vanish when the server stops.");
  } else if (process.env.AUTO_MIGRATE === "true") {
    await migrate(db);
  }
  const app = createApp({ db, config });
  if (db.driver === "pg") warmUp(db); // fire and forget: health stays up even if the database is slow
  const server = app.listen(config.port, () => console.log(`Altura API listening on :${config.port}`));
  const stop = () => server.close(() => db.close().then(() => process.exit(0)));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((e) => { console.error(e); process.exit(1); });

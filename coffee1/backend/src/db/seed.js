const { PRODUCTS } = require("./products-data");

async function seedProducts(db) {
  for (const [i, p] of PRODUCTS.entries()) {
    await db.query(
      `insert into products (sku, kind, name, note, price_cents, sort)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (sku) do update
         set kind = excluded.kind, name = excluded.name, note = excluded.note,
             price_cents = excluded.price_cents, sort = excluded.sort`,
      [p.sku, p.kind, p.name, p.note, p.price_cents, i],
    );
  }
}

module.exports = { seedProducts };

if (require.main === module) {
  require("dotenv").config();
  const { loadConfig } = require("../config");
  const { createDb } = require("./index");
  const { migrate } = require("./migrate");
  (async () => {
    const config = loadConfig();
    if (!config.databaseUrl) throw new Error("Set DATABASE_URL to seed a real database.");
    const db = await createDb(config);
    await migrate(db);
    await seedProducts(db);
    console.log(`Seeded ${PRODUCTS.length} products.`);
    await db.close();
  })().catch((e) => { console.error(e); process.exit(1); });
}

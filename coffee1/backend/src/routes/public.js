const { Router } = require("express");

function publicRoutes({ db }) {
  const r = Router();

  r.get("/products", async (req, res) => {
    const { rows } = await db.query(
      "select sku, kind, name, note, price_cents, available from products order by sort",
    );
    res.set("Cache-Control", "public, max-age=30");
    res.json({
      products: rows.map((p) => ({
        sku: p.sku, kind: p.kind, name: p.name, note: p.note, priceCents: p.price_cents, available: p.available,
      })),
    });
  });

  return r;
}

module.exports = { publicRoutes };

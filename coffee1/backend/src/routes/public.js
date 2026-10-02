const { Router } = require("express");
const { listSlotTimes } = require("../hours");

function publicRoutes({ db, config, now }) {
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

  r.get("/slots", async (req, res) => {
    const times = listSlotTimes(now(), { tz: config.cafeTz, leadMinutes: config.leadMinutes }).map((d) => d.toISOString());
    if (!times.length) return res.json({ tz: config.cafeTz, slots: [] });
    const { rows } = await db.query(
      `select pickup_slot, count(*)::int as n from orders
       where pickup_slot = any($1::timestamptz[]) and status <> 'cancelled'
       group by pickup_slot`,
      [times],
    );
    const used = new Map(rows.map((r2) => [new Date(r2.pickup_slot).toISOString(), r2.n]));
    const slots = times
      .map((at) => ({ at, remaining: config.slotCapacity - (used.get(at) || 0) }))
      .filter((s) => s.remaining > 0);
    res.json({ tz: config.cafeTz, slots });
  });

  return r;
}

module.exports = { publicRoutes };

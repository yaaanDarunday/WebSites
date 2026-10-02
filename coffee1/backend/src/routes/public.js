const { Router } = require("express");
const { listSlotTimes } = require("../hours");
const { ApiError } = require("../errors");
const { parse, orderSchema } = require("../validate");
const { createOrder, getOrderByCode, customerView } = require("../orders");

function publicRoutes({ db, config, now, limits }) {
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

  r.post("/orders", limits.orders, async (req, res) => {
    const input = parse(orderSchema, req.body);
    const { order, created } = await createOrder({ db, config, input, now: now() });
    res.status(created ? 201 : 200).json({ order: customerView(order), tz: config.cafeTz });
  });

  r.get("/orders/:code", limits.status, async (req, res) => {
    const order = await getOrderByCode(db, req.params.code);
    if (!order) throw new ApiError(404, "not_found", "We can't find that order. Check the code and try again.");
    res.json({ order: customerView(order), tz: config.cafeTz });
  });

  return r;
}

module.exports = { publicRoutes };

const crypto = require("node:crypto");
const { ApiError } = require("./errors");
const { listSlotTimes } = require("./hours");
const { charge } = require("./payments");
const { FLOWS, nextStatuses, canTransition } = require("./status");

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const CODE_RE = /^ALT-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function newCode() {
  const chars = [...crypto.randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `ALT-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

async function loadOrder(q, where, params) {
  const { rows } = await q.query(`select * from orders where ${where}`, params);
  if (!rows[0]) return null;
  const { rows: items } = await q.query(
    "select sku, name, unit_price_cents, qty from order_items where order_id = $1 order by id",
    [rows[0].id],
  );
  return { ...rows[0], items };
}

// Fingerprint of what the order *is* (not how it was paid), so a retry of the same checkout matches
// but a reused key with a different cart, slot or customer is refused.
function requestHash(input) {
  const qty = new Map();
  for (const { sku, qty: n } of input.items) qty.set(sku, (qty.get(sku) || 0) + n);
  const ship = input.fulfilment === "ship" && input.shipping
    ? [input.shipping.line1, input.shipping.city, input.shipping.postcode, input.shipping.country] : null;
  return crypto.createHash("sha256").update(JSON.stringify({
    f: input.fulfilment,
    s: input.pickupSlot ? new Date(input.pickupSlot).toISOString() : null,
    c: [input.customer.name, input.customer.email.toLowerCase()],
    a: ship,
    i: [...qty].sort(([a], [b]) => (a < b ? -1 : 1)),
  })).digest("hex");
}

function replayOrMismatch(existing, hash) {
  if (existing.request_hash && existing.request_hash !== hash) {
    throw new ApiError(422, "idempotency_mismatch", "This checkout was already submitted with different contents. Refresh and try again.");
  }
  return { order: existing, created: false };
}

const findByKey = (q, key) => loadOrder(q, "idempotency_key = $1", [key]);

function cardExpired(exp, now) {
  const [mm, yy] = exp.split("/").map(Number);
  return now.getTime() >= Date.UTC(2000 + yy, mm, 1); // first instant after the expiry month
}

async function createOrder({ db, config, input, now = new Date() }) {
  const hash = requestHash(input);
  const replay = await findByKey(db, input.idempotencyKey);
  if (replay) return replayOrMismatch(replay, hash);

  const qtyBySku = new Map();
  for (const { sku, qty } of input.items) qtyBySku.set(sku, (qtyBySku.get(sku) || 0) + qty);
  if ([...qtyBySku.values()].some((q) => q > 20)) {
    throw new ApiError(400, "invalid_request", "You can order at most 20 of any one item.");
  }

  const skus = [...qtyBySku.keys()];
  const { rows: products } = await db.query(
    "select sku, kind, name, price_cents, available from products where sku = any($1::text[])",
    [skus],
  );
  const bySku = new Map(products.map((p) => [p.sku, p]));
  for (const sku of skus) {
    const p = bySku.get(sku);
    if (!p) throw new ApiError(422, "unknown_item", `We don't sell "${sku}".`);
    if (!p.available) throw new ApiError(422, "item_unavailable", `${p.name} isn't available right now.`);
  }

  let slotIso = null;
  if (input.fulfilment === "ship") {
    if (products.some((p) => p.kind !== "beans")) {
      throw new ApiError(422, "ship_beans_only", "Only bean bags can be shipped. Choose pickup for drinks and food.");
    }
    if (!input.shipping) throw new ApiError(422, "shipping_required", "Add a shipping address.");
  } else {
    if (!input.pickupSlot) throw new ApiError(422, "slot_required", "Choose a pickup time.");
    const wanted = new Date(input.pickupSlot).getTime();
    const offered = listSlotTimes(now, { tz: config.cafeTz, leadMinutes: config.leadMinutes });
    if (!offered.some((d) => d.getTime() === wanted)) {
      throw new ApiError(422, "slot_invalid", "That pickup time isn't available. Pick another.");
    }
    slotIso = new Date(wanted).toISOString();
  }

  if (cardExpired(input.card.exp, now)) throw new ApiError(422, "invalid_card", "That card has expired.");

  const lines = skus.map((sku) => ({ ...bySku.get(sku), qty: qtyBySku.get(sku) }));
  const totalCents = lines.reduce((sum, l) => sum + l.price_cents * l.qty, 0);

  try {
    const order = await db.tx(async (tx) => {
      if (slotIso) {
        await tx.query("select pg_advisory_xact_lock(hashtext($1))", [`slot:${slotIso}`]);
        const { rows } = await tx.query(
          "select count(*)::int as n from orders where pickup_slot = $1 and status <> 'cancelled'",
          [slotIso],
        );
        if (rows[0].n >= config.slotCapacity) {
          throw new ApiError(409, "slot_full", "That pickup time just filled up. Pick another.");
        }
      }
      await charge({ amountCents: totalCents, card: input.card }); // throws → whole transaction rolls back
      const ship = input.shipping || {};
      const { rows: [row] } = await tx.query(
        `insert into orders (code, idempotency_key, request_hash, customer_name, customer_email, fulfilment, pickup_slot,
                             ship_line1, ship_city, ship_postcode, ship_country, total_cents)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
        [newCode(), input.idempotencyKey, hash, input.customer.name, input.customer.email, input.fulfilment, slotIso,
          ship.line1 ?? null, ship.city ?? null, ship.postcode ?? null, ship.country ?? null, totalCents],
      );
      for (const l of lines) {
        await tx.query(
          "insert into order_items (order_id, sku, name, unit_price_cents, qty) values ($1, $2, $3, $4, $5)",
          [row.id, l.sku, l.name, l.price_cents, l.qty],
        );
      }
      return loadOrder(tx, "id = $1", [row.id]);
    });
    return { order, created: true };
  } catch (err) {
    if (err.code === "23505") { // lost a race on the idempotency key: return the winner
      const winner = await findByKey(db, input.idempotencyKey);
      if (winner) return replayOrMismatch(winner, hash);
    }
    throw err;
  }
}

async function getOrderByCode(db, code) {
  const normal = String(code).trim().toUpperCase();
  if (!CODE_RE.test(normal)) return null;
  return loadOrder(db, "code = $1", [normal]);
}

// Every active order is always returned; finished ones only for the last day, so the board stays small
// and an old active order can never be pushed off it by newer traffic.
async function listOrders(db, { statuses = null, limit = 1000 } = {}) {
  const { rows } = await db.query(
    `select * from orders
     where (status not in ('completed', 'shipped', 'cancelled') or updated_at > now() - interval '24 hours')
       and ($1::text[] is null or status = any($1::text[]))
     order by created_at desc, id desc limit $2`,
    [statuses, limit],
  );
  if (!rows.length) return [];
  const { rows: items } = await db.query(
    "select order_id, sku, name, unit_price_cents, qty from order_items where order_id = any($1::int[]) order by id",
    [rows.map((r) => r.id)],
  );
  return rows.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) }));
}

async function updateStatus({ db, id, to }) {
  return db.tx(async (tx) => {
    const { rows } = await tx.query("select id, fulfilment, status from orders where id = $1 for update", [id]);
    if (!rows[0]) throw new ApiError(404, "not_found", "No such order.");
    const { fulfilment, status } = rows[0];
    if (!canTransition(fulfilment, status, to)) {
      throw new ApiError(409, "illegal_transition", `A ${fulfilment} order that is ${status} can't move to ${to}.`);
    }
    await tx.query("update orders set status = $1, updated_at = now() where id = $2", [to, id]);
    return loadOrder(tx, "id = $1", [id]);
  });
}

const iso = (d) => (d ? new Date(d).toISOString() : null);
const itemsView = (items) => items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, unitPriceCents: i.unit_price_cents }));

function customerView(o) {
  return {
    code: o.code,
    status: o.status,
    fulfilment: o.fulfilment,
    pickupSlot: iso(o.pickup_slot),
    firstName: o.customer_name.trim().split(/\s+/)[0],
    items: itemsView(o.items),
    totalCents: o.total_cents,
    steps: FLOWS[o.fulfilment],
    createdAt: iso(o.created_at),
    updatedAt: iso(o.updated_at),
  };
}

function staffView(o) {
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    fulfilment: o.fulfilment,
    pickupSlot: iso(o.pickup_slot),
    customer: { name: o.customer_name, email: o.customer_email },
    shipping: o.fulfilment === "ship"
      ? { line1: o.ship_line1, city: o.ship_city, postcode: o.ship_postcode, country: o.ship_country }
      : null,
    items: itemsView(o.items),
    totalCents: o.total_cents,
    createdAt: iso(o.created_at),
    updatedAt: iso(o.updated_at),
    nextStatuses: nextStatuses(o.fulfilment, o.status),
  };
}

module.exports = { createOrder, getOrderByCode, listOrders, updateStatus, customerView, staffView };

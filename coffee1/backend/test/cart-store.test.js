const test = require("node:test");
const assert = require("node:assert/strict");
const { createCart, KEY } = require("../../cart-store");

function memoryStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[KEY, initial]]);
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v), data };
}

test("add, setQty, remove and count", () => {
  const cart = createCart(memoryStorage());
  cart.add("espresso");
  cart.add("espresso", 2);
  cart.add("chai");
  assert.deepEqual(cart.lines(), [{ sku: "espresso", qty: 3 }, { sku: "chai", qty: 1 }]);
  assert.equal(cart.count(), 4);
  cart.setQty("espresso", 1);
  cart.setQty("chai", 0);
  assert.deepEqual(cart.lines(), [{ sku: "espresso", qty: 1 }]);
});

test("quantity is capped at 20", () => {
  const cart = createCart(memoryStorage());
  cart.add("espresso", 15);
  cart.add("espresso", 15);
  assert.equal(cart.lines()[0].qty, 20);
  cart.setQty("espresso", 99);
  assert.equal(cart.lines()[0].qty, 20);
});

test("persists to storage and reloads", () => {
  const storage = memoryStorage();
  createCart(storage).add("cortado", 2);
  assert.deepEqual(createCart(storage).lines(), [{ sku: "cortado", qty: 2 }]);
});

test("corrupted storage yields an empty cart instead of throwing", () => {
  for (const bad of ["{not json", "null", '"str"', "42", '{"a":1}']) {
    assert.deepEqual(createCart(memoryStorage(bad)).lines(), [], bad);
  }
});

test("invalid lines in storage are dropped, valid ones kept", () => {
  const raw = JSON.stringify([{ sku: "espresso", qty: 2 }, { sku: "x", qty: 0 }, { sku: "y", qty: 99 }, { sku: 5, qty: 1 }, null, { sku: "chai", qty: 1.5 }]);
  assert.deepEqual(createCart(memoryStorage(raw)).lines(), [{ sku: "espresso", qty: 2 }]);
});

test("works with no storage at all, and when storage throws", () => {
  const cart = createCart(null);
  cart.add("espresso");
  assert.equal(cart.count(), 1);
  const exploding = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  const c2 = createCart(exploding);
  c2.add("chai");
  assert.equal(c2.count(), 1);
});

test("prune drops skus that are no longer sold", () => {
  const cart = createCart(memoryStorage());
  cart.add("espresso");
  cart.add("retired-item");
  cart.prune(new Set(["espresso"]));
  assert.deepEqual(cart.lines(), [{ sku: "espresso", qty: 1 }]);
});

test("subscribers are notified on change and can unsubscribe", () => {
  const cart = createCart(memoryStorage());
  let calls = 0;
  const off = cart.subscribe(() => calls++);
  cart.add("espresso");
  cart.clear();
  off();
  cart.add("chai");
  assert.equal(calls, 2);
});

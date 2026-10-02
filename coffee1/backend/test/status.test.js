const test = require("node:test");
const assert = require("node:assert/strict");
const { FLOWS, nextStatuses, canTransition } = require("../src/status");

test("pickup flow", () => {
  assert.deepEqual(FLOWS.pickup, ["new", "preparing", "ready", "completed"]);
  assert.deepEqual(nextStatuses("pickup", "new"), ["preparing", "cancelled"]);
  assert.deepEqual(nextStatuses("pickup", "preparing"), ["ready", "cancelled"]);
  assert.deepEqual(nextStatuses("pickup", "ready"), ["completed", "cancelled"]);
});

test("ship flow skips 'ready' and ends at shipped", () => {
  assert.deepEqual(FLOWS.ship, ["new", "preparing", "shipped"]);
  assert.deepEqual(nextStatuses("ship", "preparing"), ["shipped", "cancelled"]);
});

test("terminal states have no moves", () => {
  for (const s of ["completed", "cancelled"]) assert.deepEqual(nextStatuses("pickup", s), []);
  for (const s of ["shipped", "cancelled"]) assert.deepEqual(nextStatuses("ship", s), []);
});

test("illegal jumps are rejected", () => {
  assert.equal(canTransition("pickup", "new", "ready"), false);
  assert.equal(canTransition("pickup", "ready", "preparing"), false);
  assert.equal(canTransition("pickup", "new", "shipped"), false);
  assert.equal(canTransition("ship", "preparing", "ready"), false);
  assert.equal(canTransition("pickup", "completed", "cancelled"), false);
  assert.equal(canTransition("pickup", "ready", "cancelled"), true);
});

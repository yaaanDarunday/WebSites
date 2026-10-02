const test = require("node:test");
const assert = require("node:assert/strict");
const { listSlotTimes, zonedToUtc } = require("../src/hours");

const iso = (d) => d.toISOString();
const opts = (tz = "UTC", leadMinutes = 15) => ({ tz, leadMinutes });

test("Monday morning: slots run from opening to 15 minutes before close, for two days", () => {
  const slots = listSlotTimes(new Date("2026-10-05T06:00:00Z"), opts());
  assert.equal(iso(slots[0]), "2026-10-05T07:00:00.000Z");
  const monday = slots.filter((s) => iso(s).startsWith("2026-10-05"));
  assert.equal(iso(monday.at(-1)), "2026-10-05T16:45:00.000Z");
  assert.equal(monday.length, 40);
  assert.equal(slots.length, 80); // Monday + Tuesday, both 7-17
});

test("lead time is respected", () => {
  assert.equal(iso(listSlotTimes(new Date("2026-10-05T10:00:00Z"), opts())[0]), "2026-10-05T10:15:00.000Z");
  assert.equal(iso(listSlotTimes(new Date("2026-10-05T10:01:00Z"), opts())[0]), "2026-10-05T10:30:00.000Z");
});

test("after closing, only tomorrow's slots remain", () => {
  const slots = listSlotTimes(new Date("2026-10-05T17:30:00Z"), opts());
  assert.equal(iso(slots[0]), "2026-10-06T07:00:00.000Z");
});

test("weekend hours are shorter (Sunday 8-16)", () => {
  const slots = listSlotTimes(new Date("2026-10-10T20:00:00Z"), opts()); // Saturday evening
  assert.equal(iso(slots[0]), "2026-10-11T08:00:00.000Z");
  assert.equal(iso(slots.at(-1)), "2026-10-11T15:45:00.000Z");
});

test("slots are computed in the café's timezone", () => {
  // 11:00Z = 06:00 in Bogota (UTC-5); the café opens at 07:00 local = 12:00Z
  const slots = listSlotTimes(new Date("2026-10-05T11:00:00Z"), opts("America/Bogota"));
  assert.equal(iso(slots[0]), "2026-10-05T12:00:00.000Z");
});

test("daylight saving changes are handled (London clocks go back 2026-10-25)", () => {
  const slots = listSlotTimes(new Date("2026-10-24T00:00:00Z"), opts("Europe/London"));
  assert.equal(iso(slots[0]), "2026-10-24T07:00:00.000Z"); // Sat 08:00 BST
  const times = slots.map(iso);
  assert.ok(times.includes("2026-10-25T08:00:00.000Z")); // Sun 08:00 GMT
  assert.ok(!times.includes("2026-10-25T07:00:00.000Z"));
  assert.equal(iso(zonedToUtc(2026, 10, 25, 8, 0, "Europe/London")), "2026-10-25T08:00:00.000Z");
});

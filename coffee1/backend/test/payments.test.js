const test = require("node:test");
const assert = require("node:assert/strict");
const { charge } = require("../src/payments");

const card = (number) => ({ number, exp: "12/30", cvc: "123" });

test("the approve test card succeeds, with or without separators", async () => {
  for (const n of ["4242424242424242", "4242 4242 4242 4242", "4242-4242-4242-4242"]) {
    const r = await charge({ amountCents: 500, card: card(n) });
    assert.equal(r.ok, true);
    assert.match(r.reference, /^sim_[0-9a-f]{12}$/);
  }
});

test("the decline test card is declined with 402", async () => {
  await assert.rejects(charge({ amountCents: 500, card: card("4000 0000 0000 0002") }),
    (e) => e.status === 402 && e.code === "card_declined");
});

test("any other number is rejected as an invalid test card with 422", async () => {
  await assert.rejects(charge({ amountCents: 500, card: card("4111111111111111") }),
    (e) => e.status === 422 && e.code === "invalid_card");
});

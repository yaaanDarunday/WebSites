const crypto = require("node:crypto");
const { ApiError } = require("./errors");

// Simulated gateway. Swap this module for Stripe later; callers only see charge().
async function charge({ amountCents, card }) { // eslint-disable-line no-unused-vars
  const number = String(card.number).replace(/[\s-]/g, "");
  if (number === "4242424242424242") {
    return { ok: true, reference: `sim_${crypto.randomBytes(6).toString("hex")}` };
  }
  if (number === "4000000000000002") {
    throw new ApiError(402, "card_declined", "Your card was declined. Try the test card 4242 4242 4242 4242.");
  }
  throw new ApiError(
    422, "invalid_card",
    "This is a demo shop. Use test card 4242 4242 4242 4242 (approves) or 4000 0000 0000 0002 (declines).",
  );
}

module.exports = { charge };

const rateLimit = require("express-rate-limit");
const { ApiError } = require("./errors");

function makeLimiters(config) {
  const make = ({ windowMs, max }) => rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, "rate_limited", "Too many requests. Try again in a little while.")),
  });
  return {
    orders: make(config.rateLimit.orders),
    status: make(config.rateLimit.status),
    login: make(config.rateLimit.login),
  };
}

module.exports = { makeLimiters };

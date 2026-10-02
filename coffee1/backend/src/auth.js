const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { ApiError } = require("./errors");

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const passcodeMatches = (input, expected) => crypto.timingSafeEqual(sha(input), sha(expected));

const signStaffToken = (config) => jwt.sign({ role: "staff" }, config.jwtSecret, { algorithm: "HS256", expiresIn: "12h" });

function requireStaff(config) {
  return (req, res, next) => {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    try {
      const claims = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
      if (claims.role !== "staff") throw new Error("wrong role");
      next();
    } catch {
      next(new ApiError(401, "unauthorized", "Staff sign-in required."));
    }
  };
}

module.exports = { passcodeMatches, signStaffToken, requireStaff };

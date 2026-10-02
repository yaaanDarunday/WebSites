const validTimeZone = (tz) => {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
};

// "https://a.example/, https://b.example" -> ["https://a.example", "https://b.example"].
// Browsers send the Origin header without a trailing slash, so a stray one would block every request.
function parseOrigins(value) {
  const origins = value.split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  for (const origin of origins) {
    if (!/^https?:\/\/[^/\s]+$/.test(origin)) {
      throw new Error(`Invalid FRONTEND_ORIGIN entry "${origin}": use exact origins like https://example.com (no path)`);
    }
  }
  return origins;
}

function loadConfig(env = process.env) {
  const prod = env.NODE_ENV === "production";
  const need = (key) => {
    if (!env[key]) throw new Error(`Missing required env var ${key}`);
    return env[key];
  };
  const cafeTz = env.CAFE_TZ || "America/Bogota";
  if (!validTimeZone(cafeTz)) {
    throw new Error(`Invalid CAFE_TZ "${cafeTz}": use an IANA timezone name such as Asia/Manila`);
  }
  // checked in this order so the first missing variable is the one reported
  const databaseUrl = prod ? need("DATABASE_URL") : env.DATABASE_URL || null;
  const staffPasscode = prod ? need("STAFF_PASSCODE") : env.STAFF_PASSCODE || "altura-dev";
  const jwtSecret = prod ? need("JWT_SECRET") : env.JWT_SECRET || "dev-secret-change-me";
  if (prod && jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  return {
    prod,
    port: Number(env.PORT || 3000),
    databaseUrl,
    databaseSsl: env.DATABASE_SSL !== "false",
    frontendOrigins: parseOrigins(env.FRONTEND_ORIGIN || "http://localhost:5173"),
    staffPasscode,
    jwtSecret,
    cafeTz,
    slotCapacity: Number(env.SLOT_CAPACITY || 6),
    leadMinutes: Number(env.LEAD_MINUTES || 15),
    rateLimit: {
      orders: { windowMs: 60_000, max: 20 },
      status: { windowMs: 60_000, max: 600 }, // a café's customers share one public IP and each open page polls every 5 s
      login: { windowMs: 15 * 60_000, max: 10 },
    },
  };
}

module.exports = { loadConfig };

function loadConfig(env = process.env) {
  const prod = env.NODE_ENV === "production";
  const need = (key) => {
    if (!env[key]) throw new Error(`Missing required env var ${key}`);
    return env[key];
  };
  return {
    prod,
    port: Number(env.PORT || 3000),
    databaseUrl: prod ? need("DATABASE_URL") : env.DATABASE_URL || null,
    databaseSsl: env.DATABASE_SSL !== "false",
    frontendOrigins: (env.FRONTEND_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean),
    staffPasscode: prod ? need("STAFF_PASSCODE") : env.STAFF_PASSCODE || "altura-dev",
    jwtSecret: prod ? need("JWT_SECRET") : env.JWT_SECRET || "dev-secret-change-me",
    cafeTz: env.CAFE_TZ || "America/Bogota",
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

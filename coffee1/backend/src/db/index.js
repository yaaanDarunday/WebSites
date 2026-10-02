async function createDb(config) {
  if (config.databaseUrl) {
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl === false ? false : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 30_000, // a cold TLS+auth handshake to the pooler can take several seconds
      idleTimeoutMillis: 600_000, // keep warm connections instead of re-handshaking
    });
    // Without this listener a dropped idle connection (pooler restart, network blip) crashes the process.
    pool.on("error", (err) => console.error("pg idle client error:", err.message));
    return {
      driver: "pg",
      pool,
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
      async tx(fn) {
        const client = await pool.connect();
        let broken = false;
        try {
          await client.query("begin");
          const result = await fn({ query: (t, p) => client.query(t, p) });
          await client.query("commit");
          return result;
        } catch (err) {
          await client.query("rollback").catch(() => { broken = true; });
          throw err;
        } finally {
          client.release(broken); // a connection that cannot even roll back is destroyed, not returned to the pool
        }
      },
      close: () => pool.end(),
    };
  }
  if (config.prod) throw new Error("DATABASE_URL is required in production");
  const { PGlite } = require("@electric-sql/pglite");
  const lite = new PGlite();
  await lite.waitReady;
  return {
    driver: "pglite",
    query: (text, params) => lite.query(text, params),
    exec: (sql) => lite.exec(sql),
    tx: (fn) => lite.transaction((tx) => fn({ query: (t, p) => tx.query(t, p) })),
    close: () => lite.close(),
  };
}

// Opens the first connection up front so the first customer doesn't pay the handshake.
async function warmUp(db) {
  try {
    await db.query("select 1");
    return true;
  } catch (err) {
    console.error("database warm-up failed:", err.message);
    return false;
  }
}

module.exports = { createDb, warmUp };

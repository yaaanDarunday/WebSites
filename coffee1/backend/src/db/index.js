async function createDb(config) {
  if (config.databaseUrl) {
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl === false ? false : { rejectUnauthorized: false },
      max: 5,
    });
    return {
      driver: "pg",
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
      async tx(fn) {
        const client = await pool.connect();
        try {
          await client.query("begin");
          const result = await fn({ query: (t, p) => client.query(t, p) });
          await client.query("commit");
          return result;
        } catch (err) {
          await client.query("rollback").catch(() => {});
          throw err;
        } finally {
          client.release();
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

module.exports = { createDb };

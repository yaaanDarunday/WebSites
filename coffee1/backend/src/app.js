const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { ApiError, errorHandler } = require("./errors");
const { makeLimiters } = require("./limits");
const { publicRoutes } = require("./routes/public");
const { staffRoutes } = require("./routes/staff");

function createApp({ db, config, now = () => new Date() }) {
  const app = express();
  const limits = makeLimiters(config);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || config.frontendOrigins.includes(origin)) }));
  app.use(express.json({ limit: "20kb" }));

  // Liveness: the process is up and serving. Never touches the database, so a slow or cold
  // database connection can't make the host think the service is dead and stall a deploy.
  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // Readiness: can we reach the database? Logs the real reason when not.
  app.get("/api/health/db", async (req, res) => {
    try {
      await db.query("select 1");
      res.json({ ok: true });
    } catch (err) {
      console.error("health/db failed:", err.message);
      res.status(503).json({ ok: false });
    }
  });

  app.use("/api", publicRoutes({ db, config, now, limits }));
  app.use("/api/staff", staffRoutes({ db, config, limits }));

  app.use("/api", (req, res, next) => next(new ApiError(404, "not_found", "No such endpoint.")));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

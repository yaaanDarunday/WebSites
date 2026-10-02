const { Router } = require("express");
const { ApiError } = require("../errors");
const { parse, loginSchema, statusSchema } = require("../validate");
const { passcodeMatches, signStaffToken, requireStaff } = require("../auth");
const { listOrders, updateStatus, staffView } = require("../orders");

function staffRoutes({ db, config, limits }) {
  const r = Router();

  r.post("/login", limits.login, (req, res) => {
    const { passcode } = parse(loginSchema, req.body);
    if (!passcodeMatches(passcode, config.staffPasscode)) {
      throw new ApiError(401, "bad_passcode", "That passcode isn't right.");
    }
    res.json({ token: signStaffToken(config), expiresIn: 43200 });
  });

  r.use(requireStaff(config));

  r.get("/orders", async (req, res) => {
    res.json({ orders: (await listOrders(db)).map(staffView) });
  });

  r.patch("/orders/:id/status", async (req, res) => {
    if (!/^\d{1,9}$/.test(req.params.id)) throw new ApiError(404, "not_found", "No such order.");
    const { status } = parse(statusSchema, req.body);
    const order = await updateStatus({ db, id: Number(req.params.id), to: status });
    res.json({ order: staffView(order) });
  });

  return r;
}

module.exports = { staffRoutes };

const { z } = require("zod");
const { ApiError } = require("./errors");

function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  const summary = details.map((d) => (d.path ? `${d.path} (${d.message})` : d.message)).join("; ");
  throw new ApiError(400, "invalid_request", `Please check: ${summary}`, details);
}

const trimmed = (max) => z.string().trim().min(1).max(max);

const orderSchema = z.object({
  idempotencyKey: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
  customer: z.object({ name: trimmed(80), email: z.string().trim().max(120).email() }),
  fulfilment: z.enum(["pickup", "ship"]),
  pickupSlot: z.string().datetime().optional(),
  shipping: z.object({ line1: trimmed(120), city: trimmed(80), postcode: trimmed(20), country: trimmed(60) }).optional(),
  items: z.array(z.object({ sku: z.string().min(1).max(40), qty: z.number().int().min(1).max(20) })).min(1).max(30),
  card: z.object({
    number: z.string().regex(/^[\d\s-]{12,23}$/),
    exp: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
    cvc: z.string().regex(/^\d{3,4}$/),
  }),
});

const loginSchema = z.object({ passcode: z.string().min(1).max(200) });
const statusSchema = z.object({ status: z.enum(["preparing", "ready", "completed", "shipped", "cancelled"]) });

const ALL_STATUSES = ["new", "preparing", "ready", "completed", "shipped", "cancelled"];
// ?status=new,preparing  →  { statuses: ["new", "preparing"] } (omitted → null = no filter)
const listQuerySchema = z.object({
  status: z.string().max(100).optional(),
}).transform((q, ctx) => {
  if (!q.status) return { statuses: null };
  const statuses = q.status.split(",").map((s) => s.trim());
  const bad = statuses.find((s) => !ALL_STATUSES.includes(s));
  if (bad) ctx.addIssue({ code: "custom", path: ["status"], message: `unknown status "${bad}"` });
  return { statuses };
});

module.exports = { parse, orderSchema, loginSchema, statusSchema, listQuerySchema };

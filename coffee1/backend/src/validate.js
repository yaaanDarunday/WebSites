const { ApiError } = require("./errors");

function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  const summary = details.map((d) => (d.path ? `${d.path} (${d.message})` : d.message)).join("; ");
  throw new ApiError(400, "invalid_request", `Please check: ${summary}`, details);
}

module.exports = { parse };

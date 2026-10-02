class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "invalid_json", message: "The request body isn't valid JSON." } });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "too_large", message: "The request body is too large." } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong on our side." } });
}

module.exports = { ApiError, errorHandler };

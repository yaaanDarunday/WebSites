(function () {
  const base = () => String(window.ALTURA_API || "").replace(/\/$/, "");

  async function request(path, { method = "GET", body, token } = {}) {
    let res;
    try {
      res = await fetch(base() + path, {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error("Can't reach the café's order system. Check your connection and try again."), { code: "network" });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = data && data.error;
      throw Object.assign(new Error((e && e.message) || "Something went wrong. Please try again."), {
        code: (e && e.code) || "error", status: res.status, details: e && e.details,
      });
    }
    return data;
  }

  window.AlturaAPI = {
    products: () => request("/api/products"),
    slots: () => request("/api/slots"),
    createOrder: (order) => request("/api/orders", { method: "POST", body: order }),
    order: (code) => request("/api/orders/" + encodeURIComponent(code)),
    staffLogin: (passcode) => request("/api/staff/login", { method: "POST", body: { passcode } }),
    staffOrders: (token) => request("/api/staff/orders", { token }),
    staffSetStatus: (token, id, status) => request(`/api/staff/orders/${id}/status`, { method: "PATCH", body: { status }, token }),
  };
})();

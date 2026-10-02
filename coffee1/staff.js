(function () {
  const { h, money, $ } = window.AlturaUtil;
  const app = $("#app"), meta = $("#meta"), signout = $("#signout");
  const API = window.AlturaAPI;
  const COLUMNS = [
    { title: "New", match: ["new"] },
    { title: "Preparing", match: ["preparing"] },
    { title: "Ready", match: ["ready"] },
    { title: "Done", match: ["completed", "shipped"] },
  ];
  const ACTION = { preparing: "Start preparing", ready: "Mark ready", completed: "Mark collected", shipped: "Mark shipped", cancelled: "Cancel" };

  let token = null;
  try { token = sessionStorage.getItem("altura.staff"); } catch { /* blocked */ }
  let timer = null, seen = null;

  const slotLabel = (iso) => new Intl.DateTimeFormat("en", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const stopPolling = () => { clearTimeout(timer); timer = null; };

  function showLogin(message) {
    stopPolling(); token = null; seen = null;
    try { sessionStorage.removeItem("altura.staff"); } catch { /* blocked */ }
    signout.hidden = true; meta.textContent = "";
    const error = h("p", { class: "form-error", role: "alert" }, message || "");
    const input = h("input", { name: "passcode", type: "password", required: true, autocomplete: "current-password", "aria-label": "Staff passcode" });
    const form = h("form", { class: "login", onsubmit: async (e) => {
      e.preventDefault(); error.textContent = "";
      try {
        const res = await API.staffLogin(input.value);
        token = res.token;
        try { sessionStorage.setItem("altura.staff", token); } catch { /* blocked */ }
        showBoard();
      } catch (err) { error.textContent = err.message; input.select(); }
    } },
      h("label", { class: "field" }, h("span", {}, "Staff passcode"), input),
      h("button", { class: "btn", type: "submit" }, "Open the board"), error);
    app.replaceChildren(h("h1", { class: "plain-title" }, "Staff only"), form);
    input.focus();
  }

  function orderCard(o) {
    let armed = false, armTimer = null;
    const buttons = o.nextStatuses.map((status) => {
      const btn = h("button", { type: "button", class: status === "cancelled" ? "btn btn-quiet" : "btn btn-sm" }, ACTION[status]);
      btn.addEventListener("click", async () => {
        if (status === "cancelled" && !armed) {
          armed = true; btn.textContent = "Sure? Cancel order";
          armTimer = setTimeout(() => { armed = false; btn.textContent = ACTION.cancelled; }, 3000);
          return;
        }
        clearTimeout(armTimer);
        buttons.forEach((b) => (b.disabled = true));
        try { await API.staffSetStatus(token, o.id, status); await refresh(); }
        catch (err) {
          if (err.status === 401) return showLogin("Session expired. Sign in again.");
          buttons.forEach((b) => (b.disabled = false));
          meta.textContent = err.message;
        }
      });
      return btn;
    });
    return h("article", { class: "o-card" + (o.isNew ? " is-new" : "") },
      h("header", {}, h("strong", {}, o.code), h("span", {}, o.fulfilment === "pickup" ? slotLabel(o.pickupSlot) : "Ship")),
      h("p", { class: "o-who" }, o.customer.name, " · ", h("a", { href: "mailto:" + o.customer.email }, o.customer.email)),
      o.shipping ? h("p", { class: "o-addr" }, [o.shipping.line1, o.shipping.city, o.shipping.postcode, o.shipping.country].join(", ")) : null,
      h("ul", { class: "o-items" }, o.items.map((i) => h("li", {}, `${i.qty} × ${i.name}`))),
      h("p", { class: "o-total" }, money(o.totalCents)),
      h("div", { class: "o-actions" }, buttons));
  }

  function renderBoard(orders) {
    if (seen) orders.forEach((o) => { o.isNew = !seen.has(o.id); });
    seen = new Set(orders.map((o) => o.id));
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    meta.textContent = `${orders.length - cancelled} orders · ${cancelled} cancelled · updates every 5 s`;
    app.replaceChildren(h("div", { class: "board" }, COLUMNS.map((c) => {
      const list = orders.filter((o) => c.match.includes(o.status)).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      return h("section", { class: "col", "aria-label": c.title },
        h("h2", {}, c.title, h("span", {}, list.length)),
        list.length ? list.map(orderCard) : h("p", { class: "col-empty" }, "Nothing here"));
    })));
  }

  async function refresh() {
    try {
      const { orders } = await API.staffOrders(token);
      renderBoard(orders);
    } catch (err) {
      if (err.status === 401) return showLogin("Session expired. Sign in again.");
      meta.textContent = "Can't reach the server. Retrying…";
    }
  }

  function showBoard() {
    signout.hidden = false;
    app.replaceChildren(h("p", { class: "plain-note" }, "Loading orders…"));
    (async function loop() { await refresh(); if (token) timer = setTimeout(loop, 5000); })();
  }

  signout.addEventListener("click", () => showLogin());
  token ? showBoard() : showLogin();
})();

(function () {
  const { h, money } = window.AlturaUtil;
  const main = document.getElementById("status");
  const code = new URLSearchParams(location.search).get("code") || "";
  const TERMINAL = ["completed", "shipped", "cancelled"];
  const LABEL = { new: "Received", preparing: "Being prepared", ready: "Ready for pickup", completed: "Collected", shipped: "Shipped", cancelled: "Cancelled" };
  const HEADLINE = {
    new: "We've got your order.",
    preparing: "We're making it now.",
    ready: "Ready. Come and get it.",
    completed: "Enjoy. See you again soon.",
    shipped: "On its way to you.",
    cancelled: "This order was cancelled.",
  };
  let timer = null;

  const stop = () => { clearTimeout(timer); timer = null; };
  const schedule = () => { stop(); timer = setTimeout(load, 5000); };

  function render(order, tz) {
    const cancelled = order.status === "cancelled";
    const at = order.pickupSlot
      ? new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(order.pickupSlot))
      : null;
    const current = order.steps.indexOf(order.status);
    main.replaceChildren(
      h("p", { class: "plain-kicker" }, `Order ${order.code}`),
      h("h1", { class: "plain-title" }, cancelled ? HEADLINE.cancelled : `Thanks, ${order.firstName}. ${HEADLINE[order.status]}`),
      cancelled ? null : h("ol", { class: "steps", "aria-label": "Order progress" },
        order.steps.map((s, i) => h("li", { class: i < current ? "is-done" : i === current ? "is-current" : "", "aria-current": i === current ? "step" : null }, LABEL[s]))),
      h("p", { class: "plain-where" },
        order.fulfilment === "pickup"
          ? `Pickup ${at} at 14 Wharf Street, the green door under the chestnut tree.`
          : "Shipping: we'll post your beans once they're roasted and packed."),
      h("ul", { class: "receipt" },
        order.items.map((i) => h("li", {}, h("span", {}, `${i.qty} × ${i.name}`), h("span", {}, money(i.unitPriceCents * i.qty)))),
        h("li", { class: "receipt-total" }, h("span", {}, "Total"), h("span", {}, money(order.totalCents)))),
      h("p", { class: "plain-note" }, "Keep this page's link; it's your receipt and it updates by itself."),
      h("a", { class: "link", href: "index.html" }, "← Back to Altura"));
    document.title = `${LABEL[order.status]} · ${order.code} — Altura Coffee`;
  }

  function renderMissing() {
    main.replaceChildren(
      h("p", { class: "plain-kicker" }, "Order not found"),
      h("h1", { class: "plain-title" }, "We can't find that order."),
      h("p", { class: "plain-note" }, "Check the code in your link. It looks like ALT-4K9F-X2QM."),
      h("a", { class: "link", href: "index.html" }, "← Back to Altura"));
  }

  async function load() {
    try {
      const { order, tz } = await window.AlturaAPI.order(code);
      render(order, tz);
      if (TERMINAL.includes(order.status)) return stop();
    } catch (err) {
      if (err.status === 404) { renderMissing(); return stop(); }
      let note = document.querySelector(".plain-retry");
      if (!note) { note = h("p", { class: "plain-note plain-retry" }); main.append(note); }
      note.textContent = "Can't refresh right now. Trying again…";
    }
    schedule();
  }

  document.addEventListener("visibilitychange", () => { if (!document.hidden && timer) load(); });
  load();
})();

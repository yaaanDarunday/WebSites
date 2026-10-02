(function () {
  const { h, money, $ } = window.AlturaUtil;
  const A = window.Altura;

  let idempotencyKey = null; // one key per checkout attempt, kept until the order succeeds

  const field = (label, name, extra = {}) =>
    h("label", { class: "field" }, h("span", {}, label), h("input", { name, required: true, ...extra }));

  A.renderCheckout = function renderCheckout() {
    const panel = $('[data-panel="checkout"]');
    const lines = A.cart.lines().map((l) => ({ ...l, p: A.products.get(l.sku) })).filter((l) => l.p);
    if (!lines.length) { A.showPanel("cart"); return; }
    const total = lines.reduce((sum, l) => sum + l.p.priceCents * l.qty, 0);
    const beansOnly = lines.every((l) => l.p.kind === "beans");
    idempotencyKey = idempotencyKey || crypto.randomUUID();
    let tz = "UTC";
    let busy = false;

    const errorBox = h("p", { class: "form-error", role: "alert" });
    const slotSelect = h("select", { name: "pickupSlot", required: true }, h("option", { value: "" }, "Loading times…"));
    const slotNote = h("p", { class: "field-note" });
    const pickupSet = h("fieldset", { class: "fs" }, h("label", { class: "field" }, h("span", {}, "Pickup time"), slotSelect), slotNote);
    const shipSet = h("fieldset", { class: "fs", hidden: true, disabled: true },
      field("Address", "line1", { autocomplete: "address-line1", maxlength: 120 }),
      field("City", "city", { autocomplete: "address-level2", maxlength: 80 }),
      field("Postcode", "postcode", { autocomplete: "postal-code", maxlength: 20 }),
      field("Country", "country", { autocomplete: "country-name", maxlength: 60 }));
    const payButton = h("button", { class: "btn", type: "submit" }, `Pay ${money(total)}`);

    const radio = (value, label, disabled, hint) =>
      h("label", { class: "choice" + (disabled ? " is-disabled" : "") },
        h("input", { type: "radio", name: "fulfilment", value, checked: value === "pickup", disabled }),
        h("span", {}, label), hint ? h("em", {}, hint) : null);

    const form = h("form", { class: "checkout" },
      h("fieldset", { class: "fs" },
        h("legend", {}, "Your details"),
        field("Name", "name", { autocomplete: "name", maxlength: 80 }),
        field("Email", "email", { type: "email", autocomplete: "email", maxlength: 120 })),
      h("fieldset", { class: "fs choices" },
        h("legend", {}, "How do you want it?"),
        radio("pickup", "Pick up at Wharf Street", false),
        radio("ship", "Ship to me", !beansOnly, beansOnly ? "Bean bags ship free" : "Only bean bags can be shipped")),
      pickupSet, shipSet,
      h("fieldset", { class: "fs" },
        h("legend", {}, "Payment (demo)"),
        field("Card number", "cardNumber", { inputmode: "numeric", autocomplete: "off", placeholder: "4242 4242 4242 4242", maxlength: 23 }),
        h("div", { class: "row2" },
          field("Expiry", "exp", { placeholder: "MM/YY", autocomplete: "off", maxlength: 5, pattern: "(0[1-9]|1[0-2])/\\d{2}" }),
          field("CVC", "cvc", { inputmode: "numeric", autocomplete: "off", maxlength: 4, pattern: "\\d{3,4}" })),
        h("p", { class: "field-note" }, "This is a demo: 4242 4242 4242 4242 pays, 4000 0000 0000 0002 declines. Use any future expiry and any CVC.")),
      errorBox,
      h("div", { class: "cart-foot-inline" },
        h("button", { class: "link", type: "button", onclick: () => A.showPanel("cart") }, "← Back to order"),
        payButton));

    panel.replaceChildren(
      h("header", { class: "cart-head" },
        h("h2", {}, "Checkout"),
        h("button", { class: "cart-x", type: "button", "aria-label": "Close checkout", onclick: () => A.closeCart() }, "×")),
      h("div", { class: "cart-body" }, form));

    const fmtSlot = (iso) => new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

    async function loadSlots() {
      try {
        const data = await window.AlturaAPI.slots();
        tz = data.tz;
        slotSelect.replaceChildren(
          ...(data.slots.length
            ? [h("option", { value: "" }, "Choose a time"), ...data.slots.map((s) => h("option", { value: s.at }, fmtSlot(s.at)))]
            : [h("option", { value: "" }, "No pickup times left")]));
        slotNote.textContent = data.slots.length ? `Times shown in café time (${tz}).` : "We're closed for now. Try again when we're open.";
      } catch (err) {
        slotNote.textContent = err.message;
      }
    }
    loadSlots();

    form.addEventListener("change", (e) => {
      if (e.target.name !== "fulfilment") return;
      const ship = e.target.value === "ship";
      pickupSet.hidden = ship; pickupSet.disabled = ship;
      shipSet.hidden = !ship; shipSet.disabled = !ship;
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      const f = new FormData(form);
      const ship = f.get("fulfilment") === "ship";
      const payload = {
        idempotencyKey,
        customer: { name: f.get("name"), email: f.get("email") },
        fulfilment: f.get("fulfilment"),
        ...(ship
          ? { shipping: { line1: f.get("line1"), city: f.get("city"), postcode: f.get("postcode"), country: f.get("country") } }
          : { pickupSlot: f.get("pickupSlot") }),
        items: lines.map((l) => ({ sku: l.sku, qty: l.qty })),
        card: { number: f.get("cardNumber"), exp: f.get("exp"), cvc: f.get("cvc") },
      };
      busy = true; payButton.disabled = true; payButton.textContent = "Placing order…"; errorBox.textContent = "";
      try {
        const { order } = await window.AlturaAPI.createOrder(payload);
        idempotencyKey = null;
        A.cart.clear();
        location.href = "order.html?code=" + encodeURIComponent(order.code);
      } catch (err) {
        errorBox.textContent = err.message;
        if (err.code === "slot_full" || err.code === "slot_invalid") loadSlots();
        busy = false; payButton.disabled = false; payButton.textContent = `Pay ${money(total)}`;
      }
    });
  };
})();

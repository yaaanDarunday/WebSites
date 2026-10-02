(function () {
  const { h, money, $ } = window.AlturaUtil;
  const A = window.Altura;
  const root = document.documentElement;

  const backdrop = h("div", { class: "cart-backdrop", onclick: () => A.closeCart() });
  const panelCart = h("div", { class: "cart-panel", "data-panel": "cart" });
  const panelCheckout = h("div", { class: "cart-panel", "data-panel": "checkout", hidden: true });
  const drawer = h("aside", { class: "cart", role: "dialog", "aria-modal": "true", "aria-label": "Your order", tabindex: "-1" }, panelCart, panelCheckout);
  document.body.append(backdrop, drawer);

  // The trail stage listens for wheel/touch/keys on window; keep those away from the drawer and its backdrop.
  ["wheel", "touchstart", "touchmove", "touchend", "keydown"].forEach((type) =>
    drawer.addEventListener(type, (e) => { if (!(type === "keydown" && e.key === "Escape")) e.stopPropagation(); }, { passive: true }));
  ["wheel", "touchstart", "touchmove", "touchend"].forEach((type) =>
    backdrop.addEventListener(type, (e) => e.stopPropagation(), { passive: true }));

  let lastFocus = null;
  let inerted = [];
  // aria-modal alone doesn't stop Tab: make everything behind the drawer inert while it is open.
  const setBackgroundInert = (on) => {
    if (on) inerted = [...document.body.children].filter((el) => el !== drawer && el !== backdrop && el.tagName !== "SCRIPT");
    inerted.forEach((el) => { el.inert = on; });
    if (!on) inerted = [];
  };

  A.openCart = function openCart() {
    lastFocus = document.activeElement;
    A.showPanel("cart");
    setBackgroundInert(true);
    root.classList.add("cart-open");
    drawer.focus({ preventScroll: true });
  };
  A.closeCart = function closeCart() {
    root.classList.remove("cart-open");
    setBackgroundInert(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  A.showPanel = function showPanel(name) {
    panelCart.hidden = name !== "cart";
    panelCheckout.hidden = name !== "checkout";
    if (name === "checkout" && A.renderCheckout) A.renderCheckout();
    if (name === "cart") renderCart();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("cart-open")) A.closeCart();
  });

  function resolvedLines() {
    return A.cart.lines().map((l) => ({ ...l, p: A.products.get(l.sku) })).filter((l) => l.p);
  }

  function lineEl({ sku, qty, p }) {
    return h("li", { class: "cart-line" },
      h("div", {}, h("p", { class: "cart-name" }, p.name), h("p", { class: "cart-unit" }, money(p.priceCents))),
      h("div", { class: "qty" },
        h("button", { type: "button", "data-key": sku + ":-", "aria-label": `Remove one ${p.name}`, onclick: () => A.cart.setQty(sku, qty - 1) }, "−"),
        h("span", { "aria-live": "polite" }, qty),
        h("button", { type: "button", "data-key": sku + ":+", "aria-label": `Add one ${p.name}`, disabled: qty >= 20, onclick: () => A.cart.setQty(sku, qty + 1) }, "+")),
      h("p", { class: "cart-line-total" }, money(p.priceCents * qty)));
  }

  function renderCart() {
    const focusKey = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
    const lines = resolvedLines();
    const total = lines.reduce((sum, l) => sum + l.p.priceCents * l.qty, 0);
    panelCart.replaceChildren(
      h("header", { class: "cart-head" },
        h("h2", {}, "Your order"),
        h("button", { class: "cart-x", type: "button", "aria-label": "Close order", onclick: () => A.closeCart() }, "×")),
      h("div", { class: "cart-body" },
        A.error ? h("p", { class: "cart-error", role: "alert" }, A.error) : null,
        lines.length
          ? h("ul", { class: "cart-lines" }, lines.map(lineEl))
          : h("p", { class: "cart-empty" }, "Nothing here yet. Add a flat white and we'll start the kettle.")),
      h("footer", { class: "cart-foot" },
        h("p", { class: "cart-total" }, h("span", {}, "Total"), h("strong", {}, money(total))),
        h("button", { class: "btn", type: "button", disabled: !lines.length, onclick: () => A.showPanel("checkout") }, "Checkout")));
    if (focusKey) { const again = drawer.querySelector(`[data-key="${focusKey}"]`); if (again && !again.disabled) again.focus({ preventScroll: true }); }
  }

  const tab = $(".tab-order");
  const badge = $(".tab-count", tab);
  function renderBadge() {
    const n = A.cart.count();
    badge.textContent = n ? String(n) : "";
    tab.setAttribute("aria-label", n ? `Order ahead, ${n} item${n === 1 ? "" : "s"} in your order` : "Order ahead");
  }
  // capture phase: beat any other click handler on the tab bar and the mailto fallback
  tab.addEventListener("click", (e) => { e.preventDefault(); e.stopImmediatePropagation(); A.openCart(); }, true);

  function refresh() {
    renderBadge();
    if (!panelCart.hidden) renderCart();
  }
  A.cart.subscribe(refresh);
  A.onChange(refresh);
  renderBadge();
  renderCart();
})();

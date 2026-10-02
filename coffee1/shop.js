(function () {
  const { h, money, $, $$ } = window.AlturaUtil;

  let storage = null;
  try { storage = window.localStorage; } catch { /* blocked */ }
  const cart = window.AlturaCartStore.createCart(storage);

  const Altura = {
    cart, money,
    products: new Map(),
    ready: false,
    error: null,
    listeners: new Set(),
    onChange(fn) { this.listeners.add(fn); },
    emit() { this.listeners.forEach((fn) => fn()); },
  };
  window.Altura = Altura;

  const nodes = $$("[data-sku]");

  function setAddState(btn, enabled, label) {
    btn.disabled = !enabled;
    btn.title = enabled ? "" : label;
  }

  function decorate() {
    nodes.forEach((node) => {
      const p = Altura.products.get(node.dataset.sku);
      const btn = $(".add", node);
      if (!btn) return;
      if (!p) { setAddState(btn, false, Altura.error || "Not available for ordering"); return; }
      const price = $(".m-price, .bean-price", node);
      if (price) {
        if ($("small", price)) price.firstChild.nodeValue = money(p.priceCents);
        else price.textContent = money(p.priceCents);
      }
      setAddState(btn, p.available, "Sold out right now");
    });
  }

  nodes.forEach((node) => {
    const sku = node.dataset.sku;
    let btn = $(".add", node);
    if (!btn) { // menu rows: append a "+" button; bean cards already have one from main.js
      const label = $(".m-name", node).textContent;
      btn = h("button", { class: "add", type: "button", "aria-label": `Add ${label} to order` }, "+");
      node.append(btn);
    }
    btn.disabled = true; // until the API answers
    btn.addEventListener("click", () => {
      if (!Altura.products.get(sku)) return;
      Altura.cart.add(sku);
      btn.classList.add("is-added");
      setTimeout(() => btn.classList.remove("is-added"), 600);
    });
  });

  window.AlturaAPI.products()
    .then(({ products }) => {
      products.forEach((p) => Altura.products.set(p.sku, p));
      Altura.cart.prune(new Set(products.filter((p) => p.available).map((p) => p.sku)));
      Altura.ready = true;
    })
    .catch((err) => {
      Altura.error = "Online ordering is offline right now. You can still visit us on Wharf Street.";
      console.warn("[altura] products failed:", err.message);
    })
    .finally(() => { decorate(); Altura.emit(); });
})();

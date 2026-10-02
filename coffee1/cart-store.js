(function (root) {
  const KEY = "altura.cart.v1";
  const MAX_QTY = 20;
  const valid = (l) => l && typeof l.sku === "string" && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= MAX_QTY;

  function createCart(storage) {
    const subs = new Set();
    let lines = [];
    try {
      const parsed = JSON.parse(storage && storage.getItem(KEY));
      if (Array.isArray(parsed)) lines = parsed.filter(valid).map((l) => ({ sku: l.sku, qty: l.qty }));
    } catch { /* unreadable storage: start empty */ }

    function save() {
      try { storage && storage.setItem(KEY, JSON.stringify(lines)); } catch { /* private mode etc. */ }
      subs.forEach((fn) => fn(lines));
    }

    return {
      lines: () => lines.map((l) => ({ ...l })),
      count: () => lines.reduce((n, l) => n + l.qty, 0),
      add(sku, qty = 1) {
        const line = lines.find((l) => l.sku === sku);
        if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
        else lines.push({ sku, qty: Math.min(MAX_QTY, qty) });
        save();
      },
      setQty(sku, qty) {
        if (qty <= 0) lines = lines.filter((l) => l.sku !== sku);
        else {
          const line = lines.find((l) => l.sku === sku);
          if (line) line.qty = Math.min(MAX_QTY, qty);
        }
        save();
      },
      clear() { lines = []; save(); },
      prune(validSkus) { lines = lines.filter((l) => validSkus.has(l.sku)); save(); },
      subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    };
  }

  const api = { createCart, KEY };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AlturaCartStore = api;
})(typeof window !== "undefined" ? window : globalThis);

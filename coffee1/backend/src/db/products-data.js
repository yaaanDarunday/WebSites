// Source of truth for the menu. Names match the labels on the site; prices are cents.
const PRODUCTS = [
  { sku: "espresso", kind: "drink", name: "Espresso", note: "Altura house, chocolate & plum", price_cents: 320 },
  { sku: "cortado", kind: "drink", name: "Cortado", note: "Equal parts, no foam art debate", price_cents: 380 },
  { sku: "flat-white", kind: "drink", name: "Flat white", note: "Double ristretto, whole or oat", price_cents: 420 },
  { sku: "ridge-latte", kind: "drink", name: "Ridge latte", note: "Brown-butter syrup, sea salt", price_cents: 490 },
  { sku: "batch-brew", kind: "drink", name: "Batch brew", note: "Rotating single origin", price_cents: 340 },
  { sku: "pour-over", kind: "drink", name: "Pour-over", note: "V60, four minutes, worth it", price_cents: 550 },
  { sku: "cold-brew", kind: "drink", name: "Cold brew", note: "Eighteen hours in the river-cold fridge", price_cents: 460 },
  { sku: "cascara-tonic", kind: "drink", name: "Cascara tonic", note: "Dried cherry tea, tonic, orange", price_cents: 500 },
  { sku: "hot-chocolate", kind: "drink", name: "Hot chocolate", note: "70% single-estate, whole milk", price_cents: 440 },
  { sku: "chai", kind: "drink", name: "Chai", note: "Brewed from whole spice, not syrup", price_cents: 450 },
  { sku: "fresh-mint", kind: "drink", name: "Fresh mint", note: "A handful of it, hot water", price_cents: 300 },
  { sku: "cardamom-bun", kind: "food", name: "Cardamom bun", note: "Until they're gone, usually 10am", price_cents: 390 },
  { sku: "olive-oil-cake", kind: "food", name: "Olive oil cake", note: "Orange, rosemary, a lot of oil", price_cents: 420 },
  { sku: "trail-toast", kind: "food", name: "Trail toast", note: "Sourdough, ricotta, honey, walnut", price_cents: 750 },
  { sku: "bean-lot-07", kind: "beans", name: "Finca Altura Pink Bourbon", note: "250 g · Lot 07 · Pink grapefruit, honey, black tea", price_cents: 1500 },
  { sku: "bean-lot-11", kind: "beans", name: "La Loma Caturra", note: "250 g · Lot 11 · Red apple, panela, cocoa nib", price_cents: 1400 },
  { sku: "bean-lot-02", kind: "beans", name: "Altura House blend", note: "250 g · Lot 02 · Dark chocolate, plum, toasted hazelnut", price_cents: 1200 },
];

module.exports = { PRODUCTS };

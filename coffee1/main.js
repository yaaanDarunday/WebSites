/* Altura Coffee
   Scroll model: a stepped stage. Observer moves one stop per wheel/swipe/key along
   a contour map, then hands over to native scroll (no Lenis). Static map on
   mobile and with reduced motion.
   Motif: the trail. Loader draws it, the stage walks it, bean cards carry
   contour art, the visit map routes you in. */

gsap.registerPlugin(ScrollTrigger, Observer, MotionPathPlugin, DrawSVGPlugin, CustomEase);
CustomEase.create("circ", "0, 0.55, 0.45, 1");       // San Rita out-circ
CustomEase.create("pop", "0.18, 0.89, 0.32, 1.28");  // San Rita node pop
CustomEase.create("ui", "0.525, 0, 0, 1");           // Sui default
CustomEase.create("exit", "0.625, 0, 0.875, 0");

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const html = document.documentElement;
const SVGNS = "http://www.w3.org/2000/svg";
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wideMQ = matchMedia("(min-width: 900px)");
const journey = wideMQ.matches && !reduceMotion;   // stepped stage vs static map

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
html.classList.add(journey ? "is-locked" : "is-static");

/* ------------------------------------------------------------------
   Data
------------------------------------------------------------------- */
const MAP_W = 1600, MAP_H = 1000;
const FRAME = { t: 40, r: 56, b: 96, l: 390 };   // mirrors the CSS --frame-* vars

const ICONS = {
  farm: '<circle class="fill" cx="-3.5" cy="3" r="4.5"/><circle class="fill" cx="4" cy="2" r="4"/><path d="M-3 -1 C -2 -6 1 -8 5 -9 M4 -2 C 4 -5 5 -7 5 -9"/>',
  beds: '<path d="M-9 -2 H9 M-9 3 H9 M-7 -2 V8 M7 -2 V8 M-6 -6 L-3 -8 L0 -6 L3 -8 L6 -6"/>',
  roastery: '<circle cx="-1" cy="2" r="6"/><path d="M5 2 H9 M-1 -4 V-9 H3 M-4 2 H2"/>',
  cafe: '<path d="M-7 -2 H5 V3 A6 6 0 0 1 -7 3 Z M5 0 H7 A2.5 2.5 0 0 1 7 5 H4 M-4 -5 C -5 -7 -3 -8 -4 -10 M0 -5 C -1 -7 1 -8 0 -10"/>',
};

const STOPS = [
  { id: "farm", name: "Finca Altura", alt: 1850, x: 275, y: 215,
    text: "Caturra and Pink Bourbon, picked ripe by hand on a cloud-forest ridge." },
  { id: "beds", name: "Drying beds", alt: 1420, x: 520, y: 390,
    text: "Twenty days on raised beds, turned every hour through the midday sun." },
  { id: "roastery", name: "The roastery", alt: 610, x: 760, y: 560,
    text: "Roasted Tuesdays and Fridays in a twelve-kilo drum, light to medium." },
  { id: "cafe", name: "The café", alt: 40, x: 985, y: 742,
    text: "Poured on Wharf Street, seven till five. You made it down, and the kettle’s on." },
];

const RIVER = [[1700, -120], [1560, 120], [1330, 290], [1150, 400], [1010, 560], [1060, 720], [980, 880], [1020, 1120]];

const BEANS = [
  { lot: "Lot 07", name: "Finca Altura<br>Pink Bourbon", notes: "Pink grapefruit, honey, black tea",
    facts: [["Altitude", "1,850 m"], ["Process", "Washed"], ["Harvest", "May 2026"]], roast: 2, price: 15, seed: 11 },
  { lot: "Lot 11", name: "La Loma<br>Caturra", notes: "Red apple, panela, cocoa nib",
    facts: [["Altitude", "1,700 m"], ["Process", "Honey"], ["Harvest", "April 2026"]], roast: 3, price: 14, seed: 29 },
  { lot: "Lot 02", name: "Altura<br>House blend", notes: "Dark chocolate, plum, toasted hazelnut",
    facts: [["Altitude", "1,100–1,850 m"], ["Process", "Washed & natural"], ["Use", "Espresso & milk"]], roast: 4, price: 12, seed: 3 },
];

const fmt = (h) => `${h % 12 || 12} ${h < 12 || h === 24 ? "AM" : "PM"}`;
const HOURS = [ // index = Date.getDay()
  ["Sunday", 8, 16], ["Monday", 7, 17], ["Tuesday", 7, 17], ["Wednesday", 7, 17],
  ["Thursday", 7, 17], ["Friday", 7, 17], ["Saturday", 8, 16],
];

/* ------------------------------------------------------------------
   Seeded noise for the terrain
------------------------------------------------------------------- */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNoise(seed) {
  const rnd = mulberry32(seed), N = 64;
  const table = Array.from({ length: N * N }, rnd);
  const at = (x, y) => table[((y % N + N) % N) * N + ((x % N + N) % N)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const value = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y) => value(x, y) * 0.6 + value(x * 2.1, y * 2.1) * 0.28 + value(x * 4.3, y * 4.3) * 0.12;
}
function distToPolyline(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

/* contour polygons from d3-contour -> SVG path data */
function contourPath(geometry, x0, y0, cell) {
  let d = "";
  for (const polygon of geometry.coordinates) {
    for (const ring of polygon) {
      d += "M" + ring.map(([gx, gy]) => `${Math.round(x0 + gx * cell)},${Math.round(y0 + gy * cell)}`).join("L") + "Z";
    }
  }
  return d;
}
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVGNS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

/* ------------------------------------------------------------------
   Build the map
------------------------------------------------------------------- */
const map = $("#map");
const TINTS = ["#232c1d", "#3a482d", "#5f6b45", "#8f8f6a", "#bdb391", "#d8cdb0"];
const tint = (t) => {
  const seg = Math.min(0.9999, Math.max(0, t)) * (TINTS.length - 1), i = Math.floor(seg);
  return gsap.utils.interpolate(TINTS[i], TINTS[i + 1], seg - i);
};

function buildTerrain() {
  const noise = makeNoise(7);
  const X0 = -400, Y0 = -300, CELL = 12;
  const nx = Math.ceil((MAP_W + 800) / CELL), ny = Math.ceil((MAP_H + 600) / CELL);
  const hills = [[272, 200, 1.0, 330], [640, 140, 0.62, 240], [1280, 160, 0.55, 270], [1490, 500, 0.4, 220], [160, 720, 0.35, 230], [670, 930, 0.25, 190], [1500, 900, 0.3, 200]];
  const values = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = X0 + i * CELL, y = Y0 + j * CELL;
      let h = 0.28 * (1 - y / MAP_H);
      for (const [hx, hy, a, r] of hills) h += a * Math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (r * r));
      h -= 0.45 * Math.exp(-((distToPolyline(x, y, RIVER) / 80) ** 2));
      h += 0.14 * noise(x / 230, y / 230);
      values[j * nx + i] = h;
    }
  }
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const LEVELS = 18;
  const thresholds = Array.from({ length: LEVELS }, (_, k) => lo + ((k + 0.5) / LEVELS) * (hi - lo));

  const g = $(".map-terrain", map);
  el("rect", { x: X0, y: Y0, width: nx * CELL, height: ny * CELL, fill: tint(0) }, g);
  d3.contours().size([nx, ny]).thresholds(thresholds)(values).forEach((c, k) => {
    el("path", {
      d: contourPath(c, X0, Y0, CELL),
      fill: tint((k + 1) / LEVELS),
      "fill-rule": "evenodd",
      class: k % 4 === 3 ? "is-index" : "",
    }, g);
  });

  // a handful of spot heights
  const labels = $(".map-labels", map);
  const rnd = mulberry32(4);
  const hAt = (x, y) => values[Math.round((y - Y0) / CELL) * nx + Math.round((x - X0) / CELL)];
  const hFarm = hAt(STOPS[0].x, STOPS[0].y), hCafe = hAt(STOPS[3].x, STOPS[3].y);
  const elev = (x, y) => Math.max(0, Math.round((40 + ((hAt(x, y) - hCafe) / (hFarm - hCafe)) * 1810) / 10) * 10);
  for (let n = 0; n < 14; n++) {
    const x = 80 + rnd() * 1440, y = 60 + rnd() * 880;
    if (STOPS.some((s) => Math.hypot(s.x - x, s.y - y) < 90)) continue;
    const t = el("text", { x, y, class: "lbl-elev" }, labels);
    t.textContent = `▲ ${elev(x, y)}`;
  }
}

function buildWater() {
  const g = $(".map-water", map);
  const d = "M" + RIVER.map((p) => p.join(",")).join("L");
  el("path", { d, "stroke-width": 26, opacity: 0.55 }, g);
  el("path", { d, "stroke-width": 9, class: "river-core" }, g);
  const labels = $(".map-labels", map);
  [["Río Lento", 1270, 300, -33, 26], ["Cloud Ridge", 150, 110, -10, 30], ["Pine Hollow", 610, 250, 6, 22],
   ["El Mirador", 1230, 120, 4, 22], ["Wharf Street", 1085, 800, 78, 18], ["Low Meadows", 300, 820, -4, 24]]
    .forEach(([txt, x, y, rot, size]) => {
      const t = el("text", { x, y, transform: `rotate(${rot} ${x} ${y})`, "font-size": size }, labels);
      t.textContent = txt;
    });
}

// trail = switchback zigzag through the stops; remember where each stop sits on it
const trail = { points: [], stopIndex: [], fracs: [] };
function buildTrail() {
  const rnd = mulberry32(21);
  const pts = [[STOPS[0].x, STOPS[0].y]];
  trail.stopIndex.push(0);
  for (let s = 0; s < STOPS.length - 1; s++) {
    const a = STOPS[s], b = STOPS[s + 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const nxp = -dy / len, nyp = dx / len;
    const SEG = 11;
    for (let k = 1; k < SEG; k++) {
      const t = k / SEG;
      const amp = 24 * Math.sin(t * Math.PI) * (k % 2 ? 1 : -1) * (0.55 + 0.45 * rnd());
      pts.push([a.x + dx * t + nxp * amp, a.y + dy * t + nyp * amp]);
    }
    pts.push([b.x, b.y]);
    trail.stopIndex.push(pts.length - 1);
  }
  trail.points = pts;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  trail.fracs = trail.stopIndex.map((i) => cum[i] / cum[cum.length - 1]);

  const g = $(".map-trail", map);
  // side trails, decorative
  [["M520,390 L470,330 L500,290 L450,230 L480,170 L440,120", 1], ["M760,560 L820,500 L800,460 L880,420 L870,370 L950,330", 1], ["M275,215 L230,280 L250,330 L190,380 L210,440", 1]]
    .forEach(([d]) => el("path", { d, class: "trail-ghost" }, g));
  const d = "M" + pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join("L");
  el("path", { d, class: "trail-ghost trail-main-ghost" }, g);
  trail.glow = el("path", { d, class: "trail-live-glow" }, g);
  trail.live = el("path", { d, class: "trail-live" }, g);
  // the bean rides above the stops; it is only visible while travelling
  trail.marker = el("g", { class: "marker" });
  trail.marker.innerHTML = '<g class="marker-body"><ellipse rx="9" ry="6"/><path d="M-6.5 0 C -2 -2.5 2 2.5 6.5 0"/></g>';
}

function buildStops() {
  const g = $(".map-stops", map);
  STOPS.forEach((s, k) => {
    const stop = el("g", { class: "stop", transform: `translate(${s.x} ${s.y})`, "data-step": k + 1 }, g);
    stop.innerHTML = `
      <circle class="halo-glow" r="60"/>
      <rect class="halo" x="-64" y="-64" width="128" height="128"/>
      <g class="stop-body"><circle class="node" r="17"/><g class="icon">${ICONS[s.id]}</g></g>
      <text class="stop-label" y="-30">${s.name}</text>`;
    stop.addEventListener("click", () => journey && locked && goTo(k + 1));
  });

  // legend rail + static list
  const legend = $(".legend-stops"), list = $(".stop-list");
  STOPS.forEach((s, k) => {
    const li = document.createElement("li");
    li.innerHTML = `<button type="button" data-step="${k + 1}">
        <svg viewBox="-12 -12 24 24" aria-hidden="true"><g class="icon">${ICONS[s.id]}</g></svg>
        <span class="ls-name">${String(k + 1).padStart(2, "0")} · ${s.name}</span>
        <span class="ls-alt">${s.alt.toLocaleString("en")} m</span>
      </button>`;
    li.querySelector("button").addEventListener("click", () => journey && locked && goTo(k + 1));
    legend.appendChild(li);

    const item = document.createElement("li");
    item.innerHTML = `<p class="sl-kicker"><span>Stop ${String(k + 1).padStart(2, "0")}</span><span>${s.alt.toLocaleString("en")} m</span></p>
      <h2>${s.name}</h2><p>${s.text}</p>`;
    list.appendChild(item);
  });
}

buildTerrain();
buildWater();
buildTrail();
buildStops();
map.appendChild(trail.marker);
const markerBody = $(".marker-body", map);
gsap.set(markerBody, { scale: 0, svgOrigin: "0 0" });

/* ------------------------------------------------------------------
   Camera: viewBox that keeps the SVG's aspect equal to the viewport's
------------------------------------------------------------------- */
const stageMap = $(".stage-map");
const cam = { x: 0, y: 0, w: MAP_W, h: MAP_H };
const applyCam = () => map.setAttribute("viewBox", `${cam.x.toFixed(2)} ${cam.y.toFixed(2)} ${cam.w.toFixed(2)} ${cam.h.toFixed(2)}`);

function camFor(step) {
  const box = stageMap.getBoundingClientRect();
  const W = box.width, H = box.height;
  if (!journey) {                 // static: fit the whole trail (terrain extends past the edges)
    const s = Math.min(W / 1100, H / 720);
    return { x: 640 - W / 2 / s, y: 480 - H / 2 / s, w: W / s, h: H / s };
  }
  if (step === 0) {               // overview: cover the framed window
    const L = FRAME.l, T = FRAME.t, R = W - FRAME.r, B = H - FRAME.b;
    const s = Math.max((R - L) / 1480, (B - T) / 920);
    return { x: 800 - (L + R) / 2 / s, y: 500 - (T + B) / 2 / s, w: W / s, h: H / s };
  }
  const s = Math.max(W / 780, H / 520);
  const stop = STOPS[step - 1];
  return { x: stop.x - (W * 0.5) / s, y: stop.y - (H * 0.44) / s, w: W / s, h: H / s };
}

const progress = { p: 0 };
const markerPath = gsap.to(trail.marker, {
  motionPath: { path: trail.live, align: trail.live, alignOrigin: [0.5, 0.5], autoRotate: true },
  duration: 1, ease: "none", paused: true,
});
const liveLen = trail.live.getTotalLength();
trail.live.style.strokeDasharray = trail.glow.style.strokeDasharray = liveLen;
const applyProgress = () => {
  trail.live.style.strokeDashoffset = trail.glow.style.strokeDashoffset = liveLen * (1 - progress.p);
  markerPath.progress(progress.p);
};

/* ------------------------------------------------------------------
   Card, altitude and HUD
------------------------------------------------------------------- */
const card = $(".card");
const cardParts = () => [$(".card-kicker"), $(".card-title"), $(".card-text")];
function fillCard(step) {
  if (step === 0) {
    $(".card-step").textContent = "The trail";
    $(".card-count").textContent = "4 stops";
    $(".card-title").textContent = "Farm to cup";
    $(".card-text").textContent = "From a cloud-forest ridge down to a café by the river. Scroll to follow the bean.";
    return;
  }
  const s = STOPS[step - 1];
  $(".card-step").textContent = `Stop ${String(step).padStart(2, "0")} / 04`;
  $(".card-count").textContent = `Alt ${s.alt.toLocaleString("en")} m`;
  $(".card-title").textContent = s.name;
  $(".card-text").textContent = s.text;
}
const altEl = $(".alt-num");
const alt = { v: STOPS[0].alt };
const applyAlt = () => (altEl.textContent = Math.round(alt.v / 10) * 10 >= 1000
  ? (Math.round(alt.v / 10) * 10).toLocaleString("en") : String(Math.round(alt.v / 10) * 10));

const HUD = [".rail-title", ".legend-stops", ".ruler", ".survey", ".scalebar-l", ".hint"];

/* ------------------------------------------------------------------
   Stepped stage
------------------------------------------------------------------- */
const STEPS = STOPS.length;   // 0 = overview, 1..4 = stops
let step = 0, busy = false, locked = journey;
const stage = $(".stage");

function goTo(next, instant = false) {
  next = gsap.utils.clamp(0, STEPS, next);
  if (next === step && !instant) return;
  const prev = step;
  step = next;
  busy = true;
  gsap.killTweensOf(".hint");

  $$(".stop").forEach((s) => s.classList.toggle("is-active", Number(s.dataset.step) === step));
  stage.classList.toggle("is-deep", step > 0);
  const target = camFor(step);
  const p = step === 0 ? 0 : trail.fracs[step - 1];
  const altTarget = step === 0 ? STOPS[0].alt : STOPS[step - 1].alt;

  if (instant) {
    Object.assign(cam, target); applyCam();
    progress.p = p; applyProgress();
    alt.v = altTarget; applyAlt();
    fillCard(step);
    gsap.set(stageMap, { clipPath: step ? "inset(0px 0px 0px 0px)" : `inset(${FRAME.t}px ${FRAME.r}px ${FRAME.b}px ${FRAME.l}px)` });
    gsap.set(HUD, { autoAlpha: step ? 0 : 1 });
    busy = false;
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: "circ" }, onComplete: () => gsap.delayedCall(0.15, () => (busy = false)) });
  tl.to(cam, { ...target, duration: 1.25, onUpdate: applyCam }, 0);
  tl.to(progress, { p, duration: 1.2, ease: "power2.inOut", onUpdate: applyProgress }, 0.05);
  tl.fromTo(markerBody, { scale: 0 }, { scale: 1.4, duration: 0.35, ease: "pop", svgOrigin: "0 0" }, 0.05);
  tl.to(markerBody, { scale: 0, duration: 0.25, ease: "exit", svgOrigin: "0 0" }, 1.0);
  tl.to(alt, { v: altTarget, duration: 1.2, ease: "power2.inOut", onUpdate: applyAlt }, 0.05);

  if (prev === 0 && step > 0) {
    tl.to(HUD, { autoAlpha: 0, duration: 0.3, ease: "exit" }, 0);
    tl.to(stageMap, { clipPath: "inset(0px 0px 0px 0px)", duration: 1.1 }, 0);
  } else if (step === 0) {
    tl.to(stageMap, { clipPath: `inset(${FRAME.t}px ${FRAME.r}px ${FRAME.b}px ${FRAME.l}px)`, duration: 1.1 }, 0);
    tl.to(HUD, { autoAlpha: 1, duration: 0.5, stagger: 0.04 }, 0.6);
  }

  tl.to(cardParts(), { autoAlpha: 0, y: -8, duration: 0.16, ease: "exit", stagger: 0.02 }, 0);
  tl.add(() => fillCard(step), 0.2);
  tl.fromTo(cardParts(), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: "pop", stagger: 0.06 }, 0.22);
  if (step > 0) tl.fromTo(`.stop[data-step="${step}"] .stop-body`, { scale: 0.6, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.6, ease: "pop" }, 0.75);
}

function lockStage(atStep) {
  locked = true;
  window.scrollTo(0, 0);
  html.classList.add("is-locked");
  reentry.disable();
  stageObs.enable();
  setTab("trail");
  goTo(atStep);
}
function release(targetSel = "#menu", smooth = true) {
  if (!locked) return;
  locked = false;
  stageObs.disable();
  html.classList.remove("is-locked");
  ScrollTrigger.refresh();
  const target = $(targetSel);
  if (target) window.scrollTo({ top: target.getBoundingClientRect().top + scrollY, behavior: smooth ? "smooth" : "auto" });
  gsap.delayedCall(0.8, () => reentry.enable());
}

// wheelSpeed -1 makes wheel and touch agree: onUp = forward, onDown = back
const stageObs = Observer.create({
  target: window, type: "wheel,touch", wheelSpeed: -1, tolerance: 12, preventDefault: true,
  onUp: () => { if (busy) return; step < STEPS ? goTo(step + 1) : release("#menu"); },
  onDown: () => { if (busy) return; if (step > 0) goTo(step - 1); },
});
const reentry = Observer.create({
  target: window, type: "wheel,touch", wheelSpeed: -1, tolerance: 12,
  onDown: () => { if (!locked && scrollY <= 0) lockStage(STEPS); },
});
reentry.disable();
if (!journey) { stageObs.disable(); }

window.addEventListener("keydown", (e) => {
  if (!journey || !locked || busy) return;
  const onButton = e.target.closest("button, a");
  if (["ArrowDown", "PageDown", "ArrowRight"].includes(e.key) || (e.key === " " && !onButton)) {
    e.preventDefault();
    step < STEPS ? goTo(step + 1) : release("#menu");
  } else if (["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key)) {
    e.preventDefault(); goTo(step - 1);
  } else if (e.key === "Home") { e.preventDefault(); goTo(0); }
  else if (e.key === "End") { e.preventDefault(); release("#menu"); }
});

// tabbing into the page below leaves the stage
document.addEventListener("focusin", (e) => {
  if (!journey || !locked) return;
  const inMain = e.target.closest("main");
  if (inMain) { release(null, false); e.target.scrollIntoView({ block: "center" }); }
});

$(".skip").addEventListener("click", () => release("#menu"));

/* ------------------------------------------------------------------
   Tab bar: active tab fills with its section's colour
------------------------------------------------------------------- */
const tabs = $$(".tab[data-tab]");
function setTab(id) { tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === id)); }
tabs.forEach((tab) => tab.addEventListener("click", (e) => {
  e.preventDefault();
  const id = tab.dataset.tab;
  if (id === "trail") {
    if (journey) { if (!locked) lockStage(0); else goTo(0); }
    else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    return;
  }
  if (journey && locked) release(`#${id}`);
  else window.scrollTo({ top: $(`#${id}`).getBoundingClientRect().top + scrollY, behavior: reduceMotion ? "auto" : "smooth" });
}));
$(".foot-top").addEventListener("click", (e) => { e.preventDefault(); tabs[0].click(); });
$(".brand").addEventListener("click", (e) => { e.preventDefault(); tabs[0].click(); });

function sectionTabs() {
  ScrollTrigger.create({ trigger: "#trail", start: "top top", end: "bottom 55%", onToggle: (s) => s.isActive && setTab("trail") });
  $$("[data-tab]", $("main")).forEach((sec) => ScrollTrigger.create({
    trigger: sec, start: "top 55%", end: "bottom 55%",
    onToggle: (s) => s.isActive && setTab(sec.dataset.tab),
  }));
}

/* ------------------------------------------------------------------
   Beans: contour art per lot
------------------------------------------------------------------- */
function beanArt(seed) {
  const noise = makeNoise(seed), rnd = mulberry32(seed);
  const nx = 64, ny = 40, v = new Float64Array(nx * ny);
  const peaks = [[10 + rnd() * 44, 8 + rnd() * 24, 1], [10 + rnd() * 44, 8 + rnd() * 24, 0.6]];
  let top = [0, 0, -Infinity];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let h = 0.25 * noise(i / 9, j / 9);
    for (const [px, py, a] of peaks) h += a * Math.exp(-((i - px) ** 2 + (j - py) ** 2) / 140);
    v[j * nx + i] = h;
    if (h > top[2]) top = [i, j, h];
  }
  const svg = el("svg", { viewBox: `2 2 ${nx - 5} ${ny - 5}`, preserveAspectRatio: "xMidYMid slice" });  // cropped: d3 closes rings along the grid edge
  d3.contours().size([nx, ny]).thresholds(12)(v).forEach((c, k) => {
    el("path", { d: contourPath(c, 0, 0, 1), class: k % 3 === 2 ? "is-index" : "", "vector-effect": "non-scaling-stroke" }, svg);
  });
  el("circle", { cx: top[0], cy: top[1], r: 1.4, "vector-effect": "non-scaling-stroke" }, svg);
  return svg;
}
const beansGrid = $(".beans-grid");
BEANS.forEach((b) => {
  const card = document.createElement("article");
  card.className = "bean";
  card.innerHTML = `
    <div class="bean-art"></div>
    <div>
      <p class="bean-lot"><span>${b.lot}</span><span>Roast ${b.roast}/5</span></p>
      <h3>${b.name}</h3>
    </div>
    <div>
      <p class="bean-notes">${b.notes}</p>
      <dl class="bean-facts">${b.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}
        <dt>Roast</dt><dd><span class="roast-meter" aria-label="Roast level ${b.roast} of 5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < b.roast ? "on" : ""}"></i>`).join("")}</span></dd>
      </dl>
    </div>
    <div class="bean-foot">
      <p class="bean-price">${b.price}<small>/ 250 g</small></p>
      <a href="#visit">Pick up in store</a>
    </div>`;
  card.querySelector(".bean-art").appendChild(beanArt(b.seed));
  card.querySelector(".bean-foot a").addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: $("#visit").getBoundingClientRect().top + scrollY, behavior: reduceMotion ? "auto" : "smooth" });
  });
  beansGrid.appendChild(card);
});

/* ------------------------------------------------------------------
   Hours, live clock, open status
------------------------------------------------------------------- */
const hoursBody = $(".visit-hours tbody");
[1, 2, 3, 4, 5, 6, 0].forEach((d) => {
  const [day, o, c] = HOURS[d];
  const tr = document.createElement("tr");
  tr.dataset.day = d;
  tr.innerHTML = `<th scope="row">${day}</th><td>${fmt(o)} – ${fmt(c)}</td>`;
  hoursBody.appendChild(tr);
});
function tick() {
  const now = new Date();
  const [, o, c] = HOURS[now.getDay()];
  const h = now.getHours() + now.getMinutes() / 60;
  const open = h >= o && h < c;
  const nextOpen = HOURS[(now.getDay() + (h >= c ? 1 : 0)) % 7][1];
  const label = open ? `Open now · till ${fmt(c)}` : `Closed · opens ${fmt(nextOpen)}`;
  html.classList.toggle("is-open", open);
  $(".ruler-status em").textContent = label;
  $(".visit-status span").textContent = label;
  $(".visit-status").classList.toggle("is-open", open);
  $$("tr", hoursBody).forEach((tr) => tr.classList.toggle("is-today", Number(tr.dataset.day) === now.getDay()));
}
tick();
setInterval(tick, 1000);

/* ------------------------------------------------------------------
   Section reveals
------------------------------------------------------------------- */
function sectionMotion() {
  if (reduceMotion) return;
  $$(".sec-title, .foot-big").forEach((t) => gsap.from(t, {
    clipPath: "inset(100% 0% 0% 0%)", y: 60, duration: 1.1, ease: "circ",
    scrollTrigger: { trigger: t, start: "top 88%" },
  }));
  gsap.set("[data-pop], .bean", { autoAlpha: 0, y: 30 });
  ScrollTrigger.batch("[data-pop], .bean", {
    start: "top 90%", once: true,
    onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: "pop", stagger: 0.09 }),
  });
  $$(".bean").forEach((b) => gsap.from($$(".bean-art path", b), {
    drawSVG: "0%", duration: 1.6, ease: "circ", stagger: 0.04,
    scrollTrigger: { trigger: b, start: "top 80%" },
  }));
  const vm = $(".visit-map");
  gsap.timeline({ scrollTrigger: { trigger: vm, start: "top 75%" } })
    .from(".vm-route", { drawSVG: "0%", duration: 1.4, ease: "power2.inOut" })
    .from(".vm-pin", { scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "pop" }, "-=0.3");
}

/* ------------------------------------------------------------------
   Boot: loader -> intro
------------------------------------------------------------------- */
function placeMap() {
  if (journey) goTo(step, true);
  else {
    Object.assign(cam, camFor(0)); applyCam();
    progress.p = 1; applyProgress();
    $$(".stop").forEach((s) => s.classList.add("is-active"));
  }
}

function intro() {
  if (!journey) return;
  const tl = gsap.timeline({ defaults: { ease: "circ" } });
  tl.from(".statement span", { yPercent: 60, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: "pop" }, 0)
    .from(".trail-ghost", { autoAlpha: 0, duration: 1.2, stagger: 0.1 }, 0.1)
    .from(".stop-body", { scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "pop", stagger: 0.12 }, 0.5)
    .from(".rail > *, .ruler > span", { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.04 }, 0.2)
    .from(".card, .skip", { autoAlpha: 0, y: 20, duration: 0.6, ease: "pop" }, 0.7);
  // standalone so goTo() can kill it; inside the timeline it re-showed the hint after leaving the overview
  gsap.from(".hint", { autoAlpha: 0, duration: 0.6, delay: 1.2, ease: "circ" });
}

function runLoader() {
  return new Promise((resolve) => {
    if (reduceMotion) { resolve(); return; }
    const num = $(".loader-num"), count = { v: 0 }, lines = $$(".loader-log li");
    const tl = gsap.timeline({ onComplete: resolve });
    tl.from(".loader-trail polyline", { drawSVG: "0%", duration: 1.8, ease: "power2.inOut" }, 0)
      .from(".loader-trail circle", { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "pop", stagger: 0.42 }, 0.1)
      .to(count, {
        v: 100, duration: 1.9, ease: "power1.inOut",
        onUpdate: () => {
          num.textContent = String(Math.round(count.v)).padStart(3, "0");
          lines.forEach((l, i) => l.classList.toggle("is-on", count.v >= i * 20));
        },
      }, 0)
      .to(".loader", { yPercent: -100, duration: 0.6, ease: "exit" }, 2.1);
  });
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if ((wideMQ.matches && !reduceMotion) !== journey) { location.reload(); return; }
    placeMap();
    ScrollTrigger.refresh();
  }, 150);
});

document.fonts.ready.then(async () => {
  window.scrollTo(0, 0);
  placeMap();
  await runLoader();
  html.classList.remove("is-loading");
  sectionTabs();
  setTab(journey || scrollY < innerHeight / 2 ? "trail" : "menu");
  sectionMotion();
  ScrollTrigger.refresh();
  intro();
});

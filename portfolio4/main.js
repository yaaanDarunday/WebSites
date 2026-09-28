/* Ossian Hale — the specimen wall.
   Scroll model: the page never scrolls. Observer feeds a target offset; a lerp
   (~0.09/frame at 60fps, ~700ms settle, measured on briganti.works) glides an
   infinite, wrapping wall of tiles. Phones and reduced motion get native scroll. */

gsap.registerPlugin(Observer, Flip);

const EASE = {
  osmo: "cubic-bezier(.625,.05,0,1)",
  expo: "expo.out",
  quint: "power4.out",
  exit: "power2.in",
};

const PROJECTS = [
  {
    title: "Kiln & Co.", kind: "Identity", client: "Kiln & Co. Ceramics", year: 2025, r: 1,
    role: "Identity, packaging, signage", bg: "#c4502f", fg: "#f6e9dc",
    desc: "A mark cut from a single bowl profile, reused as the packaging die-line and the shop’s window grille.",
    art: (b, f) => `
      <rect width="300" height="300" fill="${b}"/>
      <circle cx="150" cy="150" r="96" fill="${f}"/>
      <rect x="40" y="40" width="220" height="110" fill="${b}"/>
      <text x="22" y="34" font-size="13" font-weight="700" fill="${f}">K&amp;C</text>
      <text x="278" y="34" font-size="9" font-weight="500" fill="${f}" text-anchor="end">EST. 1998</text>
      <text x="22" y="284" font-size="9" font-weight="500" fill="${f}">STONEWARE · PORTO</text>`,
  },
  {
    title: "Northbound Grotesk", kind: "Typeface", client: "Retail release", year: 2025, r: 3 / 4,
    role: "Type design, specimen", bg: "#121212", fg: "#f3f3f0",
    desc: "Nine weights drawn for cold signage: short descenders, open apertures and a lowercase that survives 8px on a train platform.",
    art: (b, f) => `
      <rect width="300" height="400" fill="${b}"/>
      <text x="20" y="30" font-size="9" font-weight="500" fill="${f}" opacity=".7">NORTHBOUND GROTESK — 9 WEIGHTS</text>
      <text x="8" y="250" font-size="232" font-weight="800" letter-spacing="-14" fill="${f}">Nb</text>
      <text x="20" y="306" font-size="23" font-weight="700" fill="${f}">ABCDEFGHIJKLM</text>
      <text x="20" y="334" font-size="23" font-weight="400" fill="${f}">nopqrstuvwxyz</text>
      <text x="20" y="362" font-size="23" font-weight="900" fill="${f}">0123456789</text>`,
  },
  {
    title: "Salt Journal", kind: "Editorial", client: "Salt Journal", year: 2024, r: 3 / 4,
    role: "Art direction, masthead, layout system", bg: "#dfe5e8", fg: "#1d2b53",
    desc: "A quarterly about coastlines. The grid is set by the tide table of each issue’s harbour, so no two issues share one.",
    art: (b, f) => `
      <rect width="300" height="400" fill="${b}"/>
      <text x="16" y="92" font-size="96" font-weight="900" letter-spacing="-5" fill="${f}">SALT</text>
      <text x="20" y="116" font-size="9" font-weight="600" fill="${f}">ISSUE 07 — TIDES</text>
      <circle cx="206" cy="232" r="52" fill="#e8743b"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="20" y="${300 + i * 11}" width="${260 - (i % 3) * 40}" height="2" fill="${f}" opacity=".6"/>`).join("")}`,
  },
  {
    title: "Fieldnotes", kind: "Product identity", client: "Fieldnotes (app)", year: 2024, r: 1,
    role: "Identity, icon, motion", bg: "#ffffff", fg: "#151413",
    desc: "Three stacked bars that animate as a sync indicator, a loading state and the app icon — one shape, three jobs.",
    art: (b, f) => `
      <rect width="300" height="300" fill="${b}"/>
      <rect x="84" y="92" width="132" height="30" rx="15" fill="${f}"/>
      <rect x="84" y="132" width="92" height="30" rx="15" fill="${f}"/>
      <rect x="84" y="172" width="132" height="30" rx="15" fill="${f}"/>
      <text x="150" y="252" font-size="16" font-weight="600" fill="${f}" text-anchor="middle">fieldnotes</text>`,
  },
  {
    title: "Mono Lake Festival", kind: "Campaign", client: "Mono Lake Sound", year: 2026, r: 4 / 3,
    role: "Campaign, posters, motion", bg: "#2a3fbf", fg: "#f3f3f0",
    desc: "Rings that expand with each day of the line-up announcement; by the festival weekend the poster is solid white.",
    art: (b, f) => `
      <rect width="400" height="300" fill="${b}"/>
      ${Array.from({ length: 7 }, (_, i) => `<circle cx="286" cy="150" r="${22 + i * 20}" fill="none" stroke="${f}" stroke-width="2"/>`).join("")}
      <text x="22" y="62" font-size="36" font-weight="800" letter-spacing="-1" fill="${f}">MONO</text>
      <text x="22" y="98" font-size="36" font-weight="800" letter-spacing="-1" fill="${f}">LAKE</text>
      <text x="22" y="276" font-size="10" font-weight="500" fill="${f}">SOUND FESTIVAL · 14—16.08.26</text>`,
  },
  {
    title: "Parc", kind: "Wayfinding", client: "City of Almere", year: 2023, r: 3 / 4,
    role: "Wayfinding, pictograms", bg: "#f1c232", fg: "#151413",
    desc: "Signs for a park with no straight paths. Every arrow is drawn at the angle you actually walk, not the nearest 45°.",
    art: (b, f) => `
      <rect width="300" height="400" fill="${b}"/>
      <text x="4" y="372" font-size="360" font-weight="900" letter-spacing="-10" fill="${f}">P</text>
      <path d="M190 84h84M246 56l28 28-28 28" fill="none" stroke="${f}" stroke-width="10" stroke-linecap="square"/>
      <text x="20" y="34" font-size="9" font-weight="600" fill="${f}">PARC — ROUTE 3</text>`,
  },
  {
    title: "Hollow Records", kind: "Identity", client: "Hollow Records", year: 2023, r: 4 / 3,
    role: "Identity, sleeve system", bg: "#1c3a2e", fg: "#e9dcc1",
    desc: "A ring that thins with each release’s runtime. The label’s full catalogue reads as a single slowing record.",
    art: (b, f) => `
      <rect width="400" height="300" fill="${b}"/>
      <circle cx="200" cy="146" r="96" fill="none" stroke="${f}" stroke-width="40"/>
      <circle cx="200" cy="146" r="7" fill="${f}"/>
      <text x="22" y="282" font-size="10" font-weight="600" fill="${f}">HOLLOW RECORDS</text>
      <text x="378" y="282" font-size="10" font-weight="500" fill="${f}" text-anchor="end">HR—031</text>`,
  },
  {
    title: "Atlas Opera", kind: "Season identity", client: "Atlas Opera House", year: 2024, r: 3 / 4,
    role: "Season identity, print", bg: "#7d1b1b", fg: "#f1e4d0",
    desc: "The season is the headline. Two numerals carry every poster; the productions sit in the rules between them.",
    art: (b, f) => `
      <rect width="300" height="400" fill="${b}"/>
      <text x="20" y="34" font-size="9" font-weight="600" fill="${f}">ATLAS OPERA — SEASON</text>
      <text x="10" y="196" font-size="176" font-weight="800" letter-spacing="-10" fill="${f}">24</text>
      <line x1="20" y1="214" x2="280" y2="214" stroke="${f}" stroke-width="1.5"/>
      <line x1="20" y1="222" x2="280" y2="222" stroke="${f}" stroke-width="1.5"/>
      <text x="10" y="372" font-size="176" font-weight="800" letter-spacing="-10" fill="${f}">25</text>`,
  },
];

const PHRASES = ["cultural institutions.", "small publishers.", "restless startups.", "record labels.", "people who make things slowly."];

const $ = (s, el = document) => el.querySelector(s);
const body = document.body;
const wallEl = $("#wall");
const trackEl = $(".wordmark__track");
const labelEl = $("#label");
const caseEl = $("#case");
const caseFrame = $("#case-frame");

const mqStatic = matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)");
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
const DEFAULT_LABEL = `Selection (${String(PROJECTS.length).padStart(2, "0")})`;

const svgFor = (p) => {
  const [w, h] = p.r === 1 ? [300, 300] : p.r < 1 ? [300, 400] : [400, 300];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${p.art(p.bg, p.fg)}</svg>`;
};

/* ---------- Wall state ---------- */
const W = {
  isStatic: mqStatic.matches,
  tiles: [],       // { el, base, h, p }
  pitch: 0, H: 0,
  current: 0, target: 0, rendered: NaN,
  markLen: 0,
  observer: null,
  locked: false,
  dragged: 0,
};

function buildWall() {
  W.isStatic = mqStatic.matches;
  body.classList.toggle("is-static", W.isStatic);
  wallEl.innerHTML = "";
  W.tiles = [];
  wallEl.style.removeProperty("height");

  if (W.isStatic) {
    PROJECTS.forEach((p, i) => wallEl.append(makeTile(p, i, false)));
    return;
  }

  const vw = document.documentElement.clientWidth, vh = innerHeight;
  const sides = 12, gap = vw < 1024 ? 16 : 24;
  const col = (vw - 2 * sides - 11 * gap) / 12;
  const w = Math.round(2 * col + gap);
  W.pitch = Math.round(w * 1.96);
  let rows = Math.ceil(vh / W.pitch) + 2;
  rows += rows % 2;
  W.H = rows * W.pitch;

  // Offsets inside a row, in tile widths (lead site: 90/123/90/101px at 222px tiles)
  const OFF = [[0.26, 0, 0.25, 0.25], [0, 0.15, 0, 0.05]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 4; c++) {
      const n = r * 4 + c;
      const i = n % PROJECTS.length;
      const p = PROJECTS[i];
      const k = (r % 2) + c * 3;                 // odd rows shift one column right
      const el = makeTile(p, i, n >= PROJECTS.length);
      const h = Math.round(w / p.r);
      el.style.width = w + "px";
      el.style.height = h + "px";
      el.style.left = Math.round(sides + k * (col + gap)) + "px";
      wallEl.append(el);
      W.tiles.push({ el, h, p, base: r * W.pitch + OFF[r % 2][c] * w + 72 });
    }
  }
  W.markLen = trackEl.firstElementChild.getBoundingClientRect().height;
  W.rendered = NaN;
  render();
}

function makeTile(p, i, duplicate) {
  const el = document.createElement("button");
  el.className = "tile";
  el.dataset.index = i;
  el.style.setProperty("--r", p.r);
  el.setAttribute("aria-label", `${p.title} — ${p.kind}, ${p.year}. Open project`);
  if (duplicate) { el.tabIndex = -1; el.setAttribute("aria-hidden", "true"); }
  el.innerHTML = `<span class="tile__art">${svgFor(p)}</span>`;
  return el;
}

const wrapY = (base) => gsap.utils.wrap(-W.pitch, W.H - W.pitch, base - W.current);

function render() {
  if (W.isStatic || W.current === W.rendered) return;
  W.rendered = W.current;
  for (const t of W.tiles) t.el.style.transform = `translate3d(0,${wrapY(t.base).toFixed(2)}px,0)`;
  if (W.markLen) {
    const y = gsap.utils.wrap(-W.markLen, 0, -W.current * 0.35);
    trackEl.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;
  }
}

gsap.ticker.add((time, dt) => {
  if (W.isStatic) return;
  const a = 1 - Math.pow(1 - 0.09, dt / (1000 / 60));
  const d = W.target - W.current;
  W.current = Math.abs(d) < 0.05 ? W.target : W.current + d * a;
  render();
});

function setLocked(v) {
  W.locked = v;
  if (W.observer) v ? W.observer.disable() : W.observer.enable();
}

function nudge(dy) { if (!W.locked && !W.isStatic) W.target += dy; }

function createObserver() {
  W.observer?.kill();
  W.observer = null;
  if (W.isStatic) return;
  W.observer = Observer.create({
    target: window,
    type: "wheel,touch,pointer",
    preventDefault: true,
    tolerance: 0,
    dragMinimum: 4,
    onWheel: (self) => nudge(self.deltaY * (self.event.deltaMode === 1 ? 40 : 1)),
    onDragStart: () => { W.dragged = 0; body.classList.add("is-dragging"); },
    onDrag: (self) => { W.dragged += Math.abs(self.deltaY) + Math.abs(self.deltaX); nudge(-self.deltaY * 1.2); },
    onDragEnd: (self) => {
      body.classList.remove("is-dragging");
      nudge(gsap.utils.clamp(-900, 900, -self.velocityY * 0.28));   // a short throw
    },
  });
}

wallEl.addEventListener("pointerdown", () => { W.dragged = 0; });

// A drag must not count as a click on the tile it started on
wallEl.addEventListener("click", (e) => {
  if (W.dragged > 6) { e.stopPropagation(); e.preventDefault(); W.dragged = 0; }
}, true);

addEventListener("keydown", (e) => {
  if (W.locked || W.isStatic) return;
  const onButton = document.activeElement?.tagName === "BUTTON" || document.activeElement?.tagName === "A";
  const vh = innerHeight;
  const map = { ArrowDown: 140, ArrowUp: -140, PageDown: vh * 0.8, PageUp: -vh * 0.8 };
  if (e.key in map) { e.preventDefault(); nudge(map[e.key]); }
  else if (e.key === " " && !onButton) { e.preventDefault(); nudge((e.shiftKey ? -1 : 1) * vh * 0.8); }
});

/* ---------- Tiles: hover label, focus-into-view, open ---------- */
function setLabel(text) {
  if (labelEl.textContent === text) return;
  gsap.killTweensOf(labelEl);
  labelEl.textContent = text;
  if (!mqReduce.matches) gsap.fromTo(labelEl, { yPercent: 100 }, { yPercent: 0, duration: 0.35, ease: EASE.osmo });
}

wallEl.addEventListener("pointerover", (e) => {
  const t = e.target.closest(".tile");
  if (t && e.pointerType === "mouse") { const p = PROJECTS[t.dataset.index]; setLabel(`${p.title} — ${p.year}`); }
});
wallEl.addEventListener("pointerout", (e) => {
  if (e.target.closest(".tile") && !e.relatedTarget?.closest?.(".tile")) setLabel(DEFAULT_LABEL);
});
wallEl.addEventListener("focusin", (e) => {
  const el = e.target.closest(".tile");
  if (!el) return;
  const p = PROJECTS[el.dataset.index];
  setLabel(`${p.title} — ${p.year}`);
  if (W.isStatic) return;
  const t = W.tiles.find((x) => x.el === el);
  const y = wrapY(t.base) - (W.target - W.current);  // where it will settle
  if (y < 64 || y + t.h > innerHeight - 64) W.target += y + t.h / 2 - innerHeight / 2;
});
wallEl.addEventListener("focusout", () => setLabel(DEFAULT_LABEL));
wallEl.addEventListener("click", (e) => {
  const el = e.target.closest(".tile");
  if (el) openCase(+el.dataset.index, el);
});

/* ---------- Rotating phrase (borrowed from Sublimio) ---------- */
const phraseEl = $(".phrase");
let phraseIdx = 0;
setInterval(() => {
  if (document.hidden || mqReduce.matches) return;
  phraseIdx = (phraseIdx + 1) % PHRASES.length;
  gsap.timeline()
    .to(phraseEl, { yPercent: -110, duration: 0.35, ease: EASE.exit })
    .add(() => { phraseEl.textContent = PHRASES[phraseIdx]; })
    .fromTo(phraseEl, { yPercent: 110 }, { yPercent: 0, duration: 0.65, ease: EASE.expo });
}, 2800);

/* ---------- Panels: Index / Info ---------- */
const panels = { index: $("#panel-index"), info: $("#panel-info") };
let openPanel = null;

$("#index-list").innerHTML = PROJECTS.map((p, i) => `
  <li><button class="index__row" data-index="${i}" style="--row-bg:${p.bg};--row-fg:${p.fg}">
    <small>${String(i + 1).padStart(2, "0")}</small>
    <span>${p.title}</span>
    <small class="hide-sm">${p.kind}</small>
    <small class="hide-sm">${p.client}</small>
    <small>${p.year}</small>
  </button></li>`).join("");

$("#index-list").addEventListener("click", (e) => {
  const row = e.target.closest(".index__row");
  if (!row) return;
  const i = +row.dataset.index;
  showPanel(null).then(() => openCase(i, visibleTileFor(i)));
});

function visibleTileFor(i) {
  const els = [...wallEl.querySelectorAll(`.tile[data-index="${i}"]`)];
  return els.find((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }) || null;
}

function setCurrentNav(name) {
  document.querySelectorAll(".navlink").forEach((b) => {
    b.toggleAttribute("aria-current", b.dataset.open === name);
    if (b.dataset.open === name) b.setAttribute("aria-current", "page");
  });
}

function showPanel(name) {
  const quick = mqReduce.matches;
  const tl = gsap.timeline();
  if (openPanel && openPanel !== name) {
    const el = panels[openPanel];
    tl.to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: quick ? 0 : 0.4, ease: EASE.exit, onComplete: () => { el.hidden = true; } });
  }
  if (name && name !== openPanel) {
    const el = panels[name];
    tl.add(() => { el.hidden = false; el.scrollTop = 0; });
    tl.fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: quick ? 0 : 0.65, ease: "cubic-bezier(.51,0,.1,1)" });
    if (!quick) tl.from(el.querySelectorAll(".panel__kicker, .index li, .info__statement, .info__cols > div"),
      { y: 18, opacity: 0, duration: 0.6, stagger: 0.04, ease: EASE.quint }, "-=0.3");
  }
  const closing = openPanel;
  openPanel = name;
  setLocked(!!name);
  body.classList.toggle("has-panel", !!name);
  if (!name && closing && caseEl.hidden) $(`.navlink[data-open="${closing}"]`)?.focus({ preventScroll: true });
  setCurrentNav(name || "wall");
  if (W.isStatic) body.style.overflow = name ? "hidden" : "";
  return tl.then();
}

document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", (e) => {
  e.preventDefault();
  const name = b.dataset.open;
  showPanel(name === "wall" || name === openPanel ? null : name).then(() => {
    if (name === "index" && openPanel === "index") $(".index__row")?.focus();
  });
}));

/* ---------- Case: Flip from the tile ---------- */
const C = { index: -1, art: null, home: null, lastFocus: null, busy: false };

function fillCase(i) {
  const p = PROJECTS[i];
  C.index = i;
  $("#case-title").textContent = p.title;
  $("#case-count").textContent = `${String(i + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}`;
  $("#case-meta").innerHTML = [["Client", p.client], ["Year", p.year], ["Type", p.kind], ["Role", p.role]]
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  $("#case-desc").textContent = p.desc;
  caseFrame.style.setProperty("--r", p.r);
}

function returnArt(animate) {
  if (!C.art) return null;
  const art = C.art, home = C.home;
  C.art = C.home = null;
  if (!animate) { home.append(art); return null; }
  const state = Flip.getState(art);
  home.append(art);
  return Flip.from(state, { duration: 0.7, ease: EASE.osmo, absolute: true });
}

function openCase(i, sourceTile) {
  if (C.busy) return;
  C.busy = true;
  C.lastFocus = document.activeElement;
  setLocked(true);
  fillCase(i);
  caseEl.hidden = false;
  if (W.isStatic) body.style.overflow = "hidden";
  caseEl.scrollTop = 0;
  setLabel(DEFAULT_LABEL);

  const motion = !mqReduce.matches;
  const art = sourceTile?.querySelector(".tile__art");
  const tl = gsap.timeline({ onComplete: () => { C.busy = false; } });
  tl.fromTo(".case__bg", { opacity: 0 }, { opacity: 1, duration: motion ? 0.4 : 0, ease: "power1.out" }, 0);

  if (art && motion) {
    const state = Flip.getState(art);
    C.art = art; C.home = sourceTile;
    caseFrame.replaceChildren(art);
    tl.add(Flip.from(state, { duration: 0.95, ease: EASE.expo, absolute: true }), 0);
  } else {
    caseFrame.innerHTML = `<span class="tile__art">${svgFor(PROJECTS[i])}</span>`;
    tl.fromTo(caseFrame, { opacity: 0 }, { opacity: 1, duration: motion ? 0.5 : 0 }, 0);
  }
  tl.fromTo([".case__bar", ...caseEl.querySelectorAll(".reveal")], { y: motion ? 16 : 0, opacity: 0 },
    { y: 0, opacity: 1, duration: motion ? 0.65 : 0, stagger: 0.06, ease: EASE.quint }, motion ? 0.3 : 0);
  $("#case-close").focus({ preventScroll: true });
}

function closeCase() {
  if (caseEl.hidden || C.busy) return;
  C.busy = true;
  const motion = !mqReduce.matches;
  const tl = gsap.timeline({
    onComplete: () => {
      caseEl.hidden = true;
      caseFrame.replaceChildren();
      gsap.set(caseFrame, { clearProps: "opacity" });
      setLocked(!!openPanel);
      if (W.isStatic) body.style.overflow = "";
      C.busy = false;
      C.lastFocus?.focus?.({ preventScroll: true });
    },
  });
  tl.to([".case__bar", ...caseEl.querySelectorAll(".reveal")], { opacity: 0, duration: motion ? 0.2 : 0, ease: EASE.exit }, 0);
  tl.to(".case__bg", { opacity: 0, duration: motion ? 0.35 : 0, ease: "power1.in" }, motion ? 0.1 : 0);
  if (C.art) {
    const flip = returnArt(motion);
    if (flip) tl.add(flip, 0.1);
  } else {
    tl.to(caseFrame, { opacity: 0, duration: motion ? 0.25 : 0 }, 0);
  }
}

function stepCase(dir) {
  if (C.busy) return;
  const next = (C.index + dir + PROJECTS.length) % PROJECTS.length;
  const motion = !mqReduce.matches;
  C.busy = true;
  gsap.timeline({ onComplete: () => { C.busy = false; } })
    .to([caseFrame, ...caseEl.querySelectorAll(".reveal")], { opacity: 0, x: motion ? -12 * dir : 0, duration: motion ? 0.25 : 0, ease: EASE.exit })
    .add(() => {
      returnArt(false);
      fillCase(next);
      caseFrame.innerHTML = `<span class="tile__art">${svgFor(PROJECTS[next])}</span>`;
      caseEl.scrollTop = 0;
    })
    .fromTo([caseFrame, ...caseEl.querySelectorAll(".reveal")], { opacity: 0, x: motion ? 16 * dir : 0 },
      { opacity: 1, x: 0, duration: motion ? 0.6 : 0, stagger: 0.05, ease: EASE.quint });
}

$("#case-close").addEventListener("click", closeCase);
$("#case-next").addEventListener("click", () => stepCase(1));
$("#case-prev").addEventListener("click", () => stepCase(-1));

addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!caseEl.hidden) closeCase();
    else if (openPanel) showPanel(null);
  }
  if (!caseEl.hidden) {
    if (e.key === "ArrowRight") stepCase(1);
    if (e.key === "ArrowLeft") stepCase(-1);
    if (e.key === "Tab") {                       // keep focus inside the dialog
      const f = [...caseEl.querySelectorAll("button")];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
});

/* ---------- Boot ---------- */
function intro() {
  body.classList.remove("is-loading");
  if (mqReduce.matches) return;
  const tl = gsap.timeline();
  if (!W.isStatic) {
    W.current = -innerHeight * 1.1;             // the wall arrives on the same lerp it scrolls with
    W.target = 0;
    tl.from(trackEl.parentElement, { yPercent: 100, duration: 1.4, ease: EASE.expo }, 0);
  } else {
    tl.from(trackEl, { yPercent: 60, opacity: 0, duration: 1.2, ease: EASE.expo }, 0);
    tl.from(".tile", { y: 40, opacity: 0, duration: 0.9, stagger: 0.06, ease: EASE.quint }, 0.2);
  }
  tl.from(".meta > *, .hud .chip", { y: 10, opacity: 0, duration: 0.6, stagger: 0.04, ease: EASE.quint }, 0.35);
}

let lastW = innerWidth;
function rebuild() {
  const was = W.isStatic;
  if (C.art) returnArt(false);
  buildWall();
  if (was !== W.isStatic) { createObserver(); setLocked(W.locked); body.style.overflow = ""; trackEl.style.transform = ""; }
}

document.fonts.ready.then(() => {
  buildWall();
  createObserver();
  intro();
});

let resizeT;
addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    // Mobile browsers fire resize when the toolbar hides; static mode only rebuilds on a real width change
    if (W.isStatic && mqStatic.matches && innerWidth === lastW) return;
    lastW = innerWidth;
    if (!caseEl.hidden) return;
    rebuild();
  }, 200);
});
mqStatic.addEventListener("change", rebuild);

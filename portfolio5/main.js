/* Ilan Reyes — fullstack developer portfolio (portfolio5)
   Lead: Pablo Míguez (Lenis, character-fill statement, pinned cream/ink card track,
   curved role marquee, dithered field). Borrowed: Alphane Labs' colour-coded
   isometric line drawing that turns/comes apart inside a pinned inset panel —
   here the four layers of the stack, drawn in strokes and pulled apart. */

/* ==================================================================
   Content — placeholder persona. Swap these for real details.
================================================================== */
const LAYERS = [
  { id: "ui", short: "UI", name: "Interface", color: "#f880c8", desc: "React, Next.js and TypeScript. Accessible, fast, animated only where it helps." },
  { id: "api", short: "API", name: "Services", color: "#ff7d38", desc: "Node, Go, tRPC and GraphQL. Typed contracts from the database to the button." },
  { id: "data", short: "Data", name: "Storage", color: "#8fd356", desc: "Postgres, Redis and queues. Schemas shaped by the queries you actually run." },
  { id: "infra", short: "Infra", name: "Platform", color: "#3fb6ff", desc: "AWS, Docker, Terraform and CI. Observability before the first incident." },
];

const PROJECTS = [
  { title: "Ledgerline", year: "2026", layers: ["ui", "api", "data", "infra"], stack: "Next.js · tRPC · Postgres · AWS", desc: "Realtime bookkeeping for small teams. Ledgers sync across devices in under 200ms, offline edits merge cleanly." },
  { title: "Fieldnote", year: "2025", layers: ["ui", "api", "data"], stack: "React Native · GraphQL · SQLite sync", desc: "An offline-first inspection app for site engineers, with photo capture and conflict-free sync back to the office." },
  { title: "Ratebook", year: "2025", layers: ["api", "data", "infra"], stack: "Go · gRPC · Redis · Kubernetes", desc: "A pricing API for a logistics network: 3,000 quotes a second at a p99 of 40ms." },
  { title: "Kiln", year: "2024", layers: ["ui", "infra"], stack: "Storybook · Turborepo · Vercel", desc: "A design-system platform: 90 components, visual regression on every pull request, docs that deploy themselves." },
  { title: "Signal Desk", year: "2024", layers: ["ui", "api", "data"], stack: "Remix · Node · Postgres · pgvector", desc: "A support inbox that triages tickets with embeddings and routes them to the right person before anyone reads them." },
  { title: "Harbor", year: "2023", layers: ["api", "infra"], stack: "Node · Terraform · GitHub Actions", desc: "An internal deploy dashboard: one button, preview environments per branch, rollbacks in seconds." },
];

const LOG = [
  { when: "2024 — Now", role: "Senior Fullstack Engineer", org: "Northgate", stack: "Payments platform · Next.js, Go, Postgres" },
  { when: "2021 — 2024", role: "Fullstack Developer", org: "Parcelwise", stack: "Logistics SaaS · React, Node, AWS" },
  { when: "2019 — 2021", role: "Frontend Developer", org: "Studio Okra", stack: "Agency work · Vue, WebGL, Contentful" },
  { when: "2018", role: "BSc Computer Science", org: "University of Porto", stack: "Distributed systems, databases" },
];

const ROLES = ["Interfaces", "APIs", "Databases", "Infrastructure", "Realtime", "DX"];
const ROLE_LAYER = ["ui", "api", "data", "infra", "api", "infra"];

/* ==================================================================
   Setup
================================================================== */
gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const layerColor = (id) => LAYERS.find((l) => l.id === id).color;
const pad2 = (n) => String(n).padStart(2, "0");
const EASE = "power3.inOut";

if (reduceMotion) document.documentElement.classList.add("is-static");
$(".year").textContent = new Date().getFullYear();

/* ------------------------------------------------------------------
   Smooth scroll — Lenis on the GSAP ticker (skipped for reduced motion)
------------------------------------------------------------------- */
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id.length > 1 ? $(id) : null;
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.5 });
    else target.scrollIntoView();
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
});

/* Clock (Lisbon) */
const clock = $(".clock-time");
const tick = () => (clock.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" }));
tick();
setInterval(tick, 15000);

/* ==================================================================
   Render content
================================================================== */
$(".layers").innerHTML = LAYERS.map((l) => `
  <li class="layer" style="--layer:${l.color}">
    <span class="layer-swatch" aria-hidden="true"></span>
    <p class="layer-name">${l.short}<em>${l.name}</em></p>
    <p class="layer-desc">${l.desc}</p>
  </li>`).join("");

/* a small line-drawn stack per project: its layers lit, the rest faint (the stack motif, reused) */
function miniStack(on) {
  const C = Math.cos(Math.PI / 6), S = 0.5, W = 300, D = 220, T = 12, GAP = 58;
  const p = (x, y, z) => `${((x - y) * C).toFixed(1)} ${((x + y) * S - z).toFixed(1)}`;
  return [...LAYERS].reverse().map((l, i) => {
    const z = i * GAP;
    const lit = on.includes(l.id);
    const d = `M${p(0, 0, z + T)}L${p(W, 0, z + T)}L${p(W, D, z + T)}L${p(0, D, z + T)}Z` +
      `M${p(0, D, z + T)}L${p(0, D, z)}L${p(W, D, z)}L${p(W, 0, z)}L${p(W, 0, z + T)}M${p(W, D, z + T)}L${p(W, D, z)}`;
    const fill = `M${p(0, 0, z + T)}L${p(W, 0, z + T)}L${p(W, 0, z)}L${p(W, D, z)}L${p(0, D, z)}L${p(0, D, z + T)}Z`;
    return `<path d="${fill}" class="mini-fill"/><path d="${d}" stroke="${lit ? l.color : "currentColor"}" opacity="${lit ? 1 : 0.18}"/>`;
  }).join("");
}

$(".track").innerHTML = PROJECTS.map((p, i) => `
  <li class="card">
    <div class="card-top"><span>${pad2(i + 1)}</span><span class="card-year">${p.year}</span></div>
    <h3 class="card-title">${p.title}</h3>
    <p class="card-desc">${p.desc}</p>
    <svg class="card-stack-fig" viewBox="-200 -196 470 470" aria-hidden="true">${miniStack(p.layers)}</svg>
    <div class="card-foot">
      <ul class="card-layers" aria-label="Layers built">
        ${LAYERS.map((l) => `<li class="${p.layers.includes(l.id) ? "" : "is-off"}" style="--layer:${l.color}">${l.short}${p.layers.includes(l.id) ? "" : '<span class="sr-only"> (not in this project)</span>'}</li>`).join("")}
      </ul>
      <div class="card-row">
        <span class="card-stack">${p.stack}</span>
        <a class="card-link" href="#contact">Case study <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </li>`).join("");
$(".work-count-total").textContent = pad2(PROJECTS.length);

$(".log-list").innerHTML = LOG.map((r) => `
  <li class="log-row" tabindex="0">
    <span class="log-when">${r.when}</span>
    <p class="log-role">${r.role} <span>@ ${r.org}</span></p>
    <p class="log-stack">${r.stack}</p>
  </li>`).join("");

/* ------------------------------------------------------------------
   Split helpers (hand-rolled, so there is no SplitText in this build).
   Words never break; characters are what the fill and the rise animate.
------------------------------------------------------------------- */
function splitChars(el) {
  const text = el.textContent.trim().replace(/\s+/g, " ");
  const visual = text.split(" ").map((w) => `<span class="word">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`).join(" ");
  el.innerHTML = `<span class="sr-only">${text}</span><span aria-hidden="true">${visual}</span>`;
  return $$(".ch", el);
}

/* ==================================================================
   Hero: dithered field (Pablo's ordered-dot field, here a living gradient)
================================================================== */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (() => {
  const canvas = $(".dither");
  const ctx = canvas.getContext("2d");
  let cols = 0, rows = 0, img = null, cell = 4;
  const pointer = { x: 0.68, y: 0.42, tx: 0.68, ty: 0.42 };
  const blobs = [
    { ax: 0.18, ay: 0.12, fx: 0.11, fy: 0.07, cx: 0.66, cy: 0.42, r: 0.3, w: 0.95 },
    { ax: 0.24, ay: 0.16, fx: 0.06, fy: 0.09, cx: 0.5, cy: 0.5, r: 0.22, w: 0.7 },
    { ax: 0.1, ay: 0.2, fx: 0.08, fy: 0.05, cx: 0.85, cy: 0.3, r: 0.2, w: 0.6 },
  ];

  function resize() {
    cell = innerWidth < 900 ? 3 : 4;
    cols = Math.ceil(canvas.clientWidth / cell);
    rows = Math.ceil(canvas.clientHeight / cell);
    canvas.width = cols;
    canvas.height = rows;
    img = ctx.createImageData(cols, rows);
  }

  function draw(t) {
    if (!img) return;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    const data = img.data;
    const aspect = cols / rows;
    const centres = blobs.map((b) => ({
      x: b.cx + Math.sin(t * b.fx * 6.283) * b.ax,
      y: b.cy + Math.cos(t * b.fy * 6.283) * b.ay,
      r2: b.r * b.r, w: b.w,
    }));
    centres.push({ x: pointer.x, y: pointer.y, r2: 0.04, w: 0.55 });
    for (let y = 0; y < rows; y++) {
      const ny = y / rows;
      // fade out under the name (top-left) and above the role cylinder (bottom)
      const vFade = Math.min(1, (1 - ny) / 0.38);
      for (let x = 0; x < cols; x++) {
        const nx = x / cols;
        let v = 0;
        for (let i = 0; i < centres.length; i++) {
          const c = centres[i];
          const dx = (nx - c.x) * aspect, dy = ny - c.y;
          v += c.w * Math.exp(-(dx * dx + dy * dy) / c.r2);
        }
        // keep the name (top-left) and the status block (top-right) on clean black
        const nameFade = nx < 0.55 && ny < 0.62 ? 0.35 + 0.65 * Math.max((nx - 0.25) / 0.3, (ny - 0.32) / 0.3, 0) : 1;
        const fx = Math.min(1, Math.max(0, (nx - 0.6) / 0.12));
        const fy = Math.min(1, Math.max(0, (0.32 - ny) / 0.1));
        const metaFade = 1 - fx * fy;
        // tanh caps the field at 0.74, under the top Bayer thresholds: the centre stays dotted, never solid
        v = 0.74 * Math.tanh(v * 0.9) * vFade * Math.min(1, nameFade) * metaFade;
        const on = v > BAYER[(y & 3) * 4 + (x & 3)];
        const o = (y * cols + x) * 4;
        data[o] = 254; data[o + 1] = 250; data[o + 2] = 238;
        data[o + 3] = on ? 110 : 0;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  let running = false, last = 0, time = 0;
  const loop = (_, dtMs) => {
    time += dtMs / 1000;
    if (time - last < 1 / 30) return; // 30fps is plenty for a dot field
    last = time;
    draw(time);
  };
  return {
    init() {
      resize();
      draw(0);
      addEventListener("resize", () => { resize(); draw(time); });
      if (!reduceMotion) {
        addEventListener("pointermove", (e) => { pointer.tx = e.clientX / innerWidth; pointer.ty = e.clientY / innerHeight; });
      }
    },
    play() { if (!running && !reduceMotion) { running = true; gsap.ticker.add(loop); } },
    pause() { if (running) { running = false; gsap.ticker.remove(loop); } },
  };
})();

/* ==================================================================
   Hero: a ring of role words around a vertical axis
================================================================== */
const cylinder = (() => {
  const ring = $(".cylinder-ring");
  let radius = 0, angle = 0, speed = 9, boost = 0;
  const words = [...ROLES, ...ROLES]; // twice round, so the ring is wide and the curve gentle

  function build() {
    ring.innerHTML = words.map((w, i) => `<span class="cyl-item">${w}<i class="cyl-dot" style="background:${layerColor(ROLE_LAYER[i % ROLES.length])}"></i></span>`).join("");
    const items = $$(".cyl-item", ring);
    const gap = parseFloat(getComputedStyle(items[0]).fontSize) * 0.36;
    const widths = items.map((el) => el.offsetWidth + gap);
    const circumference = widths.reduce((a, b) => a + b, 0);
    radius = circumference / (2 * Math.PI);
    let run = 0;
    items.forEach((el, i) => {
      const theta = ((run + widths[i] / 2) / circumference) * 360;
      run += widths[i];
      el.style.left = `${-el.offsetWidth / 2}px`;
      el.style.transform = `rotateY(${theta}deg) translateZ(${radius}px)`;
    });
    render();
  }
  function render() {
    ring.style.transform = `translateZ(${-radius}px) rotateY(${-angle}deg)`;
  }
  const loop = (_, dtMs) => {
    boost *= 0.94;
    angle += (speed + boost) * (dtMs / 1000);
    render();
  };
  return {
    build,
    play() { if (!reduceMotion) gsap.ticker.add(loop); },
    kick(v) { boost = Math.min(boost + Math.abs(v) / 60, 60); },
  };
})();

/* ==================================================================
   The stack — isometric slabs drawn in strokes (after Alphane Labs)
================================================================== */
const ISO = (() => {
  const C = Math.cos(Math.PI / 6), S = 0.5;
  const W = 300, D = 220, T = 14;
  const GAP_IN = 24, GAP_OUT = 108;
  const p = (x, y, z = 0) => [(x - y) * C, (x + y) * S - z];
  const pt = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const poly = (pts, close = true) => `M${pts.map(pt).join("L")}${close ? "Z" : ""}`;
  const top = (u, v) => p(u, v, T);
  const line = (a, b) => poly([top(...a), top(...b)], false);
  const rect = (u1, v1, u2, v2) => poly([top(u1, v1), top(u2, v1), top(u2, v2), top(u1, v2)]);
  const circle = (u, v, r, n = 20) => poly(Array.from({ length: n }, (_, i) => top(u + r * Math.cos((i / n) * 6.283), v + r * Math.sin((i / n) * 6.283))));

  const outline = [
    poly([top(0, 0), top(W, 0), top(W, D), top(0, D)]),
    poly([p(0, D, T), p(0, D, 0), p(W, D, 0), p(W, 0, 0), p(W, 0, T)], false),
    poly([p(W, D, T), p(W, D, 0)], false),
  ];
  const silhouette = poly([top(0, 0), top(W, 0), p(W, 0, 0), p(W, D, 0), p(0, D, 0), top(0, D)]);

  // what is drawn on each layer's top face
  const GLYPHS = {
    ui: [
      rect(30, 28, 270, 192), line([30, 58], [270, 58]),
      circle(48, 43, 5), circle(64, 43, 5), circle(80, 43, 5),
      rect(52, 78, 150, 170),
      line([172, 90], [250, 90]), line([172, 110], [240, 110]), line([172, 130], [228, 130]),
      rect(172, 148, 236, 170),
    ],
    api: [0, 1, 2].flatMap((i) => {
      const v = 60 + i * 50;
      return [circle(42, v, 9), line([54, v], [226, v]), line([214, v - 9], [228, v]), line([214, v + 9], [228, v]), rect(240, v - 14, 270, v + 14)];
    }),
    data: [
      rect(36, 34, 264, 186), line([36, 70], [264, 70]), line([36, 108], [264, 108]), line([36, 146], [264, 146]),
      line([112, 34], [112, 186]), line([190, 34], [190, 186]), circle(54, 52, 5),
    ],
    infra: (() => {
      const us = [62, 150, 238], vs = [50, 110, 170], out = [];
      us.forEach((u) => vs.forEach((v) => out.push(rect(u - 16, v - 16, u + 16, v + 16))));
      us.forEach((u) => out.push(line([u, 66], [u, 94]), line([u, 126], [u, 154])));
      vs.forEach((v) => out.push(line([78, v], [134, v]), line([166, v], [222, v])));
      return out;
    })(),
  };

  const svg = $(".iso");
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent?.appendChild(n);
    return n;
  };

  // centre the exploded stack: slabs span 0 → −3·gap, so shift the group by 1.5·gap
  const mid = (W + D) * S / 2 - T / 2;
  const halfH = (W + D) * S / 2 + T + 1.5 * GAP_OUT + 24;
  svg.setAttribute("viewBox", `${-D * C - 30} ${mid - halfH} ${W * C + D * C + 250} ${halfH * 2}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const stack = el("g", {}, svg);

  // bottom slab first, so each upper slab's fill hides the lines beneath it
  const order = [...LAYERS].reverse();
  const slabs = order.map((layer) => {
    const g = el("g", { class: "slab", "data-layer": layer.id }, stack);
    el("path", { d: silhouette, class: "slab-fill" }, g);
    const strokes = [...outline, ...GLYPHS[layer.id]].map((d) => el("path", { d, stroke: layer.color, pathLength: 1 }, g));
    const [lx, ly] = p(W, 0, T / 2);
    const label = el("g", { class: "iso-tag" }, g);
    el("path", { d: `M${lx + 10} ${ly}H${lx + 64}`, stroke: layer.color, pathLength: 1 }, label);
    const txt = el("text", { x: lx + 74, y: ly + 4, class: "iso-label", fill: layer.color }, label);
    txt.textContent = `${layer.short} — ${layer.name}`;
    return { g, strokes, label, layer };
  });

  return { slabs, stack, GAP_IN, GAP_OUT };
})();

/* ==================================================================
   Motion
================================================================== */
const heroLines = $$(".hero-line");
const heroChars = heroLines.flatMap((line) => {
  line.innerHTML = [...line.textContent].map((c) => `<span class="ch">${c}</span>`).join("");
  return $$(".ch", line);
});
const statementChars = splitChars($(".statement-text"));
const contactChars = splitChars($(".contact-title"));
const layerItems = $$(".layer");
const hudN = $(".stack-hud-n");
const hudK = $(".stack-hud-k");
const cards = $$(".card");
const countN = $(".work-count-n");

function setStackState(stage) {
  // stage: 0 assembled, 1..4 = focused layer (top-down), 5 = all
  hudN.textContent = pad2(Math.min(stage, 4));
  hudK.textContent = stage === 0 ? "Assembled" : stage === 5 ? "Exploded" : LAYERS[stage - 1].name;
  layerItems.forEach((li, i) => li.classList.toggle("is-dim", stage >= 1 && stage <= 4 && i !== stage - 1));
}

/* stacked slab positions for a given gap */
const slabY = (i, gap) => -i * gap;
const groupY = (gap) => 1.5 * gap;

function placeStatic() {
  // final, fully readable states: used for reduced motion
  ISO.slabs.forEach((s, i) => {
    gsap.set(s.g, { y: slabY(i, ISO.GAP_OUT) });
    gsap.set(s.strokes, { strokeDashoffset: 0, strokeDasharray: 1 });
    gsap.set(s.label, { autoAlpha: 1 });
    gsap.set(s.label.querySelector("path"), { strokeDashoffset: 0, strokeDasharray: 1 });
  });
  gsap.set(ISO.stack, { y: groupY(ISO.GAP_OUT) });
  setStackState(5);
}

function boot() {
  dither.init();
  cylinder.build();
  addEventListener("resize", () => cylinder.build());

  if (reduceMotion) {
    placeStatic();
    return;
  }

  dither.play();
  cylinder.play();

  /* hero intro: letters rise out of their line masks */
  gsap.timeline({ defaults: { ease: "expo.out" } })
    .from(heroChars, { yPercent: 108, duration: 1.4, stagger: 0.045 }, 0.15)
    .from(".hero-meta > *", { y: 16, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.6)
    .from(".cylinder", { autoAlpha: 0, y: 30, duration: 1.2 }, 0.5)
    .from(".bar", { autoAlpha: 0, duration: 0.8, ease: "power2.out" }, 0.3);

  /* the field only runs while the hero is on screen */
  ScrollTrigger.create({ trigger: ".hero", start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? dither.play() : dither.pause()) });

  /* role ring spins faster with scroll velocity */
  ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onUpdate: (s) => cylinder.kick(s.getVelocity()) });

  /* character fill: a sharp lit front sweeps the statement (Pablo) */
  for (const [chars, trigger, start, end] of [
    [statementChars, ".statement-text", "top 78%", "bottom 42%"],
    [contactChars, ".contact-title", "top 85%", "bottom 55%"],
  ]) {
    gsap.fromTo(chars, { opacity: 0.13 }, {
      opacity: 1, duration: 0.05, stagger: 0.02, ease: "none",
      scrollTrigger: { trigger, start, end, scrub: 0.4 },
    });
  }

  /* stroke setup for the drawing */
  ISO.slabs.forEach((s) => {
    gsap.set([...s.strokes, s.label.querySelector("path")], { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(s.label, { autoAlpha: 0 });
  });

  const mm = gsap.matchMedia();
  mm.add({ desktop: "(min-width: 900px)", phone: "(max-width: 899px)" }, (c) => {
    const { desktop } = c.conditions;
    const top = [...ISO.slabs].reverse(); // UI first when focusing top-down

    /* ---- The stack ---- */
    ISO.slabs.forEach((s, i) => gsap.set(s.g, { y: slabY(i, ISO.GAP_IN) }));
    gsap.set(ISO.stack, { y: groupY(ISO.GAP_IN) });

    const tl = gsap.timeline({
      defaults: { ease: EASE },
      scrollTrigger: desktop
        ? { trigger: ".stack", start: "top top", end: "+=340%", pin: true, scrub: 0.8, onUpdate: (s) => stageFrom(s.progress) }
        : { trigger: ".stack-figure", start: "top 85%", end: "bottom 45%", scrub: 0.6 },
    });
    // 1. draw, bottom slab first
    ISO.slabs.forEach((s, i) => tl.to(s.strokes, { strokeDashoffset: 0, duration: 1, stagger: 0.03, ease: "power1.inOut" }, i * 0.45));
    // 2. pull the layers apart and tag them
    const out = tl.duration();
    ISO.slabs.forEach((s, i) => tl.to(s.g, { y: slabY(i, ISO.GAP_OUT), duration: 1.4 }, out));
    tl.to(ISO.stack, { y: groupY(ISO.GAP_OUT), duration: 1.4 }, out);
    ISO.slabs.forEach((s, i) => {
      tl.to(s.label, { autoAlpha: 1, duration: 0.3 }, out + 0.6 + i * 0.1);
      tl.to(s.label.querySelector("path"), { strokeDashoffset: 0, duration: 0.6 }, out + 0.6 + i * 0.1);
    });
    // 3. focus each layer in turn, top-down (desktop only)
    let focusStart = tl.duration();
    if (desktop) {
      top.forEach((s, k) => {
        const at = focusStart + 0.4 + k * 1.6;
        tl.to(top.filter((o) => o !== s).map((o) => o.g), { opacity: 0.18, duration: 0.5 }, at);
        tl.to(s.g, { opacity: 1, x: -14, duration: 0.5 }, at);
        tl.to(s.g, { x: 0, duration: 0.5 }, at + 1.2);
      });
      tl.to(ISO.slabs.map((s) => s.g), { opacity: 1, duration: 0.5 }, tl.duration() + 0.2);
      tl.to({}, { duration: 0.6 }); // hold the exploded view before the pin releases
    } else {
      setStackState(5);
    }

    // which HUD stage a progress value belongs to
    const total = tl.duration();
    function stageFrom(progress) {
      const t = progress * total;
      if (t < focusStart + 0.4) return setStackState(t > out + 0.6 ? 5 : 0);
      const k = Math.floor((t - focusStart - 0.4) / 1.6);
      setStackState(k >= 0 && k < 4 ? k + 1 : 5);
    }

    /* ---- Work ---- */
    if (desktop) {
      const track = $(".track");
      const distance = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: ".work",
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (s) => (countN.textContent = pad2(Math.round(s.progress * (cards.length - 1)) + 1)),
        },
      });
    } else {
      cards.forEach((card) => gsap.from(card, { y: 40, autoAlpha: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 88%" } }));
    }

    return () => setStackState(0);
  });

  /* log rows rise in */
  gsap.utils.toArray(".log-row").forEach((row, i) =>
    gsap.from(row, { y: 24, autoAlpha: 0, duration: 0.8, ease: "expo.out", delay: (i % 4) * 0.06, scrollTrigger: { trigger: row, start: "top 90%" } }));

  /* nav marks the section in view — created last, after the pins exist */
  [["#stack", 0], ["#work", 1], ["#log", 2], ["#contact", 3]].forEach(([id, i]) => {
    const link = $$(".nav a")[i];
    ScrollTrigger.create({
      trigger: id, start: "top 50%", end: "bottom 50%",
      onToggle: (s) => (s.isActive ? link.setAttribute("aria-current", "true") : link.removeAttribute("aria-current")),
    });
  });
}

document.fonts.ready.then(() => {
  boot();
  ScrollTrigger.refresh();
});

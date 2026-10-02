/* Yan Mark Darunday — portfolio
   One motif: the request-trace span bar. It is the loader waterfall, each project's plugin trace, the stack wipes and the nav progress.
   Scroll model: native smooth scroll (Lenis) with set pieces. */

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase);

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("exit", "0.625, 0, 0.875, 0");

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const SCRAMBLE_CHARS = "01<>/{}[]=+*#_";

/* The projects in this repo. `trace` lists what each one is built on. */
const projects = [
  { slug: "coffee1", name: "Altura Coffee", type: "Brand site · Café", motif: "Contour trail map",
    desc: "A café site drawn as a trail map. Scrolling walks a coffee bean from a 1,850 m farm down to a riverside café.",
    trace: ["ScrollTrigger", "DrawSVG", "MotionPath", "Observer"] },
  { slug: "portfolio1", name: "Iris Vale", type: "Portfolio · Designer", motif: "Spinning disc",
    desc: "Odometer preloader, masked line reveals, a pinned work index, colour-wipe services and a live HUD.",
    trace: ["ScrollTrigger", "SplitText", "ScrambleText", "Lenis"] },
  { slug: "portfolio2", name: "Juno Raske", type: "Portfolio · Director", motif: "Film frame & timecode",
    desc: "A timecode slate loader, a letterbox hero that opens full-bleed and a pinned horizontal film reel.",
    trace: ["ScrollTrigger", "SplitText", "ScrambleText", "Lenis"] },
  { slug: "portfolio3", name: "Aiko Lund", type: "Portfolio · Product designer", motif: "One blue square",
    desc: "One square counts the loader, floods the screen, becomes the cursor and opens every project on a pinned stage.",
    trace: ["ScrollTrigger", "SplitText", "ScrambleText", "Lenis"] },
  { slug: "portfolio4", name: "Ossian Hale", type: "Portfolio · Type designer", motif: "Infinite specimen wall",
    desc: "The page never scrolls. Wheel, drag and arrow keys glide a wrapping wall of posters that Flip open into case views.",
    trace: ["Observer", "Flip"] },
  { slug: "portfolio5", name: "Ilan Reyes", type: "Portfolio · Fullstack", motif: "The stack in strokes",
    desc: "A dithered dot field, a 3D cylinder of roles and a pinned panel that pulls the stack apart layer by layer.",
    trace: ["ScrollTrigger", "Lenis"] },
];

/* Spread a project's trace across a timeline, like spans in a waterfall */
const spans = (list) => list.map((label, k) => {
  const x = Math.min(k * (0.62 / Math.max(list.length - 1, 1)), 0.62);
  const w = Math.min(0.38 + ((k * 37) % 23) / 100, 1 - x);
  return { label, x: x.toFixed(3), w: w.toFixed(3) };
});
const traceHTML = (list) => spans(list).map((s) =>
  `<li><span class="mono">${s.label}</span><i class="track"><b style="--x:${s.x};--w:${s.w}"></b></i></li>`).join("");

/* ------------------------------------------------------------------
   Odometer — a 0–9 reel per digit, yPercent -10 per step
------------------------------------------------------------------- */
function createOdometer(el) {
  const digits = Number(el.dataset.digits || 2);
  el.innerHTML = "";
  el.setAttribute("role", "img");
  const reels = Array.from({ length: digits }, () => {
    const digit = document.createElement("span");
    digit.className = "odo-digit";
    const reel = document.createElement("span");
    reel.className = "odo-reel";
    reel.innerHTML = "0123456789".split("").map((n) => `<span>${n}</span>`).join("");
    digit.appendChild(reel);
    el.appendChild(digit);
    return reel;
  });
  return {
    set(value, { duration = 1.1, ease = "expo.out", stagger = 0.06 } = {}) {
      el.setAttribute("aria-label", String(Math.round(value)));
      const str = String(Math.max(0, Math.round(value))).padStart(digits, "0").slice(-digits);
      reels.forEach((reel, i) => {
        gsap.to(reel, { yPercent: -10 * Number(str[i]), duration, ease, delay: (digits - 1 - i) * stagger, overwrite: true });
      });
    },
  };
}

/* ------------------------------------------------------------------
   Render work
------------------------------------------------------------------- */
const stage = $(".work-stage");
const list = $(".work-list");
stage.innerHTML = projects.map((p, i) => {
  const media = `<div class="card-media"><img src="assets/${p.slug}.jpg" alt="Screenshot of the ${p.name} home page" width="1440" height="900" loading="${i < 2 ? "eager" : "lazy"}" decoding="async"></div>`;
  return `
  <a class="card" href="../${p.slug}/" data-cursor="Open" aria-label="${p.name}, ${p.type}. Open the site">
    <div class="card-chrome mono" aria-hidden="true"><i><b></b></i><span class="card-url">~/WebSites/${p.slug}/</span><span>${String(i + 1).padStart(2, "0")}</span></div>
    ${media}
    <div class="card-foot"><h3 class="card-title">${p.name}</h3><span class="card-open mono">Open site ↗</span></div>
  </a>`;
}).join("");
list.innerHTML = projects.map((p, i) => `
  <li class="work-item${i === 0 ? " is-active" : ""}" data-index="${i}">
    <span class="work-item-cat mono">${p.type}</span>
    <span class="work-item-name">${p.name}</span>
    <span class="work-item-desc">${p.desc}</span>
  </li>`).join("");

const cards = $$(".card");
const items = $$(".work-item");
const fields = { type: $('[data-field="type"]'), motif: $('[data-field="motif"]') };
const traceEl = $("[data-field-trace]");
const workOdo = createOdometer($(".work-counter .odo"));
let activeIndex = -1;
let pinned = false;

function setActive(i, instant = false) {
  if (i === activeIndex) return;
  activeIndex = i;
  const p = projects[i];
  items.forEach((el, n) => el.classList.toggle("is-active", n === i));
  if (pinned) cards.forEach((c, n) => (n === i ? c.removeAttribute("tabindex") : c.setAttribute("tabindex", "-1")));
  workOdo.set(i + 1, { duration: instant ? 0 : 0.9 });
  const swap = () => {
    Object.entries(fields).forEach(([k, el]) => (el.textContent = p[k]));
    traceEl.innerHTML = traceHTML(p.trace);
  };
  if (instant || reduceMotion) return swap();
  const vals = [...Object.values(fields), traceEl];
  gsap.timeline()
    .to(vals, { filter: "blur(8px)", opacity: 0, duration: 0.2, ease: "power1.in", overwrite: true })
    .add(() => {
      swap();
      gsap.fromTo($$(".track b", traceEl), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "expo.out", stagger: 0.06, delay: 0.05 });
    })
    .to(vals, { filter: "blur(0px)", opacity: 1, duration: 0.45, ease: "power2.out", stagger: 0.05 });
}
setActive(0, true);

/* ------------------------------------------------------------------
   Smooth scroll (Lenis on the GSAP ticker)
------------------------------------------------------------------- */
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: typeof target === "number" ? target : target.getBoundingClientRect().top + scrollY, behavior: reduceMotion ? "auto" : "smooth" });
}

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id.length > 1 ? $(id) : null;
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
  });
});

/* ------------------------------------------------------------------
   HUD: difference cursor
------------------------------------------------------------------- */

if (finePointer) {
  const cursor = $(".cursor");
  const cursorLabel = $(".cursor-label");
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
  window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });
  $$("[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => { cursorLabel.textContent = el.dataset.cursor; cursor.classList.add("is-active"); });
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
  });
}

$$(".scramble-hover").forEach((a) => {
  const text = a.textContent;
  a.addEventListener("pointerenter", () => {
    if (reduceMotion) return;
    gsap.to(a, { duration: 0.8, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.6, revealDelay: 0.1 }, overwrite: true });
  });
});

/* ------------------------------------------------------------------
   Split text (autoSplit re-splits on resize and font load)
------------------------------------------------------------------- */
let introDone = false;
let heroAnim;
SplitText.create(".hero-title", {
  type: "lines",
  mask: "lines",
  autoSplit: true,
  onSplit(self) {
    heroAnim = gsap.from(self.lines, { yPercent: 115, duration: 1.5, ease: "expo.out", stagger: 0.1, paused: !introDone && !reduceMotion });
    if (reduceMotion) heroAnim.progress(1);
    return heroAnim;
  },
});

if (!reduceMotion) {
  SplitText.create(".statement-text", {
    type: "words",
    autoSplit: true,
    onSplit(self) {
      return gsap.fromTo(self.words, { opacity: 0.12 }, {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: ".statement", start: "top 65%", end: "bottom 65%", scrub: true },
      });
    },
  });

  SplitText.create(".wordmark", {
    type: "chars",
    mask: "chars",
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.chars, {
        yPercent: 100, ease: "none", stagger: 0.06,
        scrollTrigger: { trigger: ".footer", start: "top 95%", end: "bottom bottom", scrub: 0.6 },
      });
    },
  });
}

/* ------------------------------------------------------------------
   Scroll choreography (pins only on desktop without reduced motion)
------------------------------------------------------------------- */
const mm = gsap.matchMedia();

mm.add({ desktop: "(min-width: 900px)", mobile: "(max-width: 899px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
  const { desktop, reduce } = ctx.conditions;

  if (!reduce) {
    gsap.to(".hero-title", { yPercent: -12, opacity: 0.3, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* Work: pinned focus index */
  if (desktop && !reduce) {
    pinned = true;
    const n = cards.length;
    const tl = gsap.timeline({
      defaults: { ease: "none", duration: 1 },
      scrollTrigger: {
        trigger: ".work",
        start: "top top",
        end: () => "+=" + (n - 1) * innerHeight * 1.3,
        pin: ".work-inner",
        scrub: 1.4,
        // weight: step to the adjacent project only, never carry flick velocity past it
        snap: { snapTo: "labels", directional: true, inertia: false, duration: { min: 0.35, max: 0.8 }, delay: 0.12, ease: "power3.inOut" },
        // heavier wheel while the reel is pinned so a hard scroll can't skip ahead
        onToggle: (self) => { if (lenis) lenis.options.wheelMultiplier = self.isActive ? 0.45 : 1; },
        onUpdate: (self) => setActive(Math.round(self.progress * (n - 1))),
        invalidateOnRefresh: true,
      },
    });
    tl.addLabel("p0");
    for (let i = 1; i < n; i++) {
      tl.fromTo(cards[i], { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" })
        .fromTo(cards[i].querySelector(".card-title"), { yPercent: 60 }, { yPercent: 0 }, "<")
        .fromTo(cards[i - 1], { scale: 1, yPercent: 0, filter: "brightness(1)" }, { scale: 0.92, yPercent: -3, filter: "brightness(0.55)" }, "<")
        .addLabel("p" + i);
    }
    cards.forEach((c, i) => i && c.setAttribute("tabindex", "-1"));
    const onItem = (i) => scrollToTarget(tl.scrollTrigger.labelToScroll("p" + i));
    items.forEach((item, i) => {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      const go = () => onItem(i);
      const key = (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go());
      item.addEventListener("click", go);
      item.addEventListener("keydown", key);
      ctx.add(() => () => { item.removeEventListener("click", go); item.removeEventListener("keydown", key); });
    });
    return () => { pinned = false; if (lenis) lenis.options.wheelMultiplier = 1; cards.forEach((c) => c.removeAttribute("tabindex")); };
  }

  if (desktop && reduce) {
    // No pin: the list switches which card is on top
    pinned = true;
    const show = (i) => {
      cards.forEach((c, n) => gsap.set(c, { clipPath: n === i ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)", zIndex: n === i ? 2 : 1 }));
      setActive(i, true);
    };
    show(0);
    items.forEach((item, i) => {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.addEventListener("click", () => show(i));
      item.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), show(i)));
    });
    return () => { pinned = false; };
  }

  if (!reduce) {
    cards.forEach((c) => gsap.from(c, { y: 60, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 92%" } }));
  }
});

/* Stack: colour wipe + travelling latency meter (span bar, row-sized) */
const LAYER_MS = [48, 112, 31, 204];
mm.add("(prefers-reduced-motion: no-preference)", () => {
  $$(".svc").forEach((svc, i) => {
    const fill = $(".svc-fill", svc);
    const meter = $(".svc-meter", svc);
    gsap.timeline({
      scrollTrigger: {
        trigger: svc, start: "top 85%", end: "bottom 30%", scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (self) => (meter.textContent = `${Math.round(self.progress * LAYER_MS[i])} ms`),
      },
    })
      .fromTo(fill, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none" }, 0)
      .fromTo(meter, { x: 0 }, { x: () => svc.offsetWidth - meter.offsetWidth, ease: "none" }, 0);
  });
});
if (reduceMotion) $$(".svc-meter").forEach((m, i) => (m.textContent = `${LAYER_MS[i]} ms`));

/* ------------------------------------------------------------------
   About: theme inversion (night → bone) + odometer stats
------------------------------------------------------------------- */
const root = document.documentElement;
const THEMES = {
  night: { "--bg": "#0b0b0c", "--fg": "#ebe9e3", "--signal-ink": "#c6ff3a" },
  bone: { "--bg": "#ebe9e3", "--fg": "#0b0b0c", "--signal-ink": "#4b6a00" },
};
ScrollTrigger.create({
  trigger: ".about",
  start: "top 55%",
  end: "bottom 45%",
  onToggle: (self) => gsap.to(root, { ...(self.isActive ? THEMES.bone : THEMES.night), duration: reduceMotion ? 0 : 0.8, ease: "osmo", overwrite: true }),
});

$$(".stats .odo").forEach((el) => {
  const odo = createOdometer(el);
  const value = Number(el.dataset.value);
  if (reduceMotion) return odo.set(value, { duration: 0 });
  ScrollTrigger.create({
    trigger: el, start: "top 85%",
    onEnter: () => odo.set(value, { duration: 1.8, stagger: 0.12 }),
    onLeaveBack: () => odo.set(0, { duration: 0.5, ease: "power2.inOut" }),
  });
});

if (!reduceMotion) {
  const marquee = gsap.to(".marquee-track", { xPercent: -50, duration: 30, ease: "none", repeat: -1 });
  ScrollTrigger.create({
    trigger: ".marquee", start: "top bottom", end: "bottom top",
    onUpdate: (self) => {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 5);
      gsap.to(marquee, { timeScale: boost, duration: 0.2, overwrite: true });
      gsap.to(marquee, { timeScale: 1, duration: 1.2, delay: 0.2, ease: "power2.out" });
    },
  });

  gsap.from(".contact-cta", { yPercent: 30, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".contact", start: "top 70%" } });
  gsap.from(".corner-btn", { y: 20, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".corner-btns", start: "top 92%" } });
}

/* ------------------------------------------------------------------
   Nav: active segment + per-section span bars. Created last so the
   pinned section's spacing is already measured.
------------------------------------------------------------------- */
const navLinks = $$(".nav-link");
$$("[data-section]").forEach((section) => {
  const link = navLinks.find((a) => a.getAttribute("href") === "#" + section.id);
  if (!link) return;
  const bar = $(".nav-bar", link);
  ScrollTrigger.create({
    trigger: section,
    start: "top 50%",
    end: "bottom 50%",
    onToggle: (self) => link.classList.toggle("is-active", self.isActive),
    onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
  });
});

/* ------------------------------------------------------------------
   Intro: the page's request trace → 200 OK → curtain up → hero
------------------------------------------------------------------- */
function startSite() {
  introDone = true;
  document.body.classList.remove("is-loading");
  lenis?.start();
  heroAnim?.play();
  if (reduceMotion) return;
  const eyebrow = $(".eyebrow");
  const eyebrowText = eyebrow.textContent;
  eyebrow.textContent = "";
  gsap.timeline()
    .to(eyebrow, { duration: 1.2, scrambleText: { text: eyebrowText, chars: SCRAMBLE_CHARS, speed: 0.5 } }, 0)
    .from(".hud > *", { y: -14, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 }, 0.2)
    .from(".hero-foot > *", { y: 20, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.08 }, 0.4);
}

function playIntro() {
  if (reduceMotion) { $(".loader")?.remove(); startSite(); return; }

  let seen = false;
  try { seen = sessionStorage.getItem("ymd-intro") === "1"; sessionStorage.setItem("ymd-intro", "1"); } catch (e) {}
  const d = seen ? 1 : 2.4;

  const loaderOdo = createOdometer($(".loader .odo"));
  const counter = { v: 0 };
  const status = $(".loader-status");
  const tl = gsap.timeline();

  $$(".loader [data-scramble]").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    tl.to(el, { duration: d * 0.6, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.4 } }, 0);
  });

  $$(".loader-trace li").forEach((li) => {
    const bar = $("b", li);
    const x = Number(getComputedStyle(bar).getPropertyValue("--x"));
    tl.to(bar, { scaleX: 1, duration: d * 0.35, ease: "power2.out" }, x * d * 0.85);
  });

  tl.to(counter, {
    v: 412, duration: d, ease: "power2.inOut",
    onUpdate: () => loaderOdo.set(counter.v, { duration: 0.4, ease: "power3.out", stagger: 0 }),
  }, 0)
    .to(status, { duration: 0.5, scrambleText: { text: "200 OK · Welcome", chars: SCRAMBLE_CHARS, speed: 0.6 } }, d - 0.2)
    .to([".loader-trace li", ".loader-head", ".loader-foot"], { yPercent: -40, opacity: 0, duration: 0.4, ease: "exit", stagger: 0.03 }, "+=0.2")
    .to(".loader", { yPercent: -100, duration: 0.9, ease: "osmo" }, "-=0.15")
    .add(startSite, "-=0.5")
    .add(() => $(".loader")?.remove());
}

document.fonts.ready.then(() => {
  ScrollTrigger.refresh();
  playIntro();
});

/* ------------------------------------------------------------------
   Hero field: a fine dot grid with a cursor spotlight and click ripples.
   Inspired by 21st.dev's "Pixel Perfect Hero".
------------------------------------------------------------------- */
(() => {
  const canvas = document.querySelector(".hero-canvas");
  const hero = document.querySelector(".hero");
  if (!canvas || !hero || reduceMotion) return;
  const ctx = canvas.getContext("2d");
  const CELL = 36;
  const SIGNAL = "198,255,58";
  const FG = "235,233,227";
  const ripples = [];
  const pointer = { x: -999, y: -999, sx: -999, sy: -999, last: 0 };
  let w = 0, h = 0, dpr = 1, cols = 0, rows = 0, visible = true;

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / CELL) + 1; rows = Math.ceil(h / CELL) + 1;
  };
  new ResizeObserver(resize).observe(hero);
  resize();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

  const drop = (x, y, amp, speed, now) => {
    ripples.push({ x, y, amp, speed, t0: now });
    if (ripples.length > 6) ripples.shift();
  };

  const local = (e) => {
    const r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  window.addEventListener("pointermove", (e) => {
    const p = local(e);
    pointer.x = p.x; pointer.y = p.y;
    const now = performance.now();
  }, { passive: true });
  hero.addEventListener("pointerdown", (e) => {
    const p = local(e);
    drop(p.x, p.y, 0.8, 480, performance.now());
  });
  hero.addEventListener("pointerleave", () => { pointer.x = pointer.y = -999; });

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) return;
    // ease the spotlight toward the pointer
    if (pointer.sx < -900) { pointer.sx = pointer.x; pointer.sy = pointer.y; }
    pointer.sx += (pointer.x - pointer.sx) * 0.18;
    pointer.sy += (pointer.y - pointer.sy) * 0.18;

    ctx.clearRect(0, 0, w, h);
    while (ripples.length && now - ripples[0].t0 > 3200) ripples.shift();

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * CELL, y = j * CELL;
        let v = 0;
        for (const r of ripples) {
          const age = (now - r.t0) / 1000;
          const d = Math.hypot(x - r.x, y - r.y);
          const front = age * r.speed;
          const ring = Math.exp(-((d - front) ** 2) / 1800);
          v += r.amp * ring * Math.max(0, 1 - age / 3.2);
        }
        const dp = Math.hypot(x - pointer.sx, y - pointer.sy);
        const spot = Math.exp(-(dp * dp) / 30000) * 0.55;
        const t = Math.min(1, v + spot);
        if (t < 0.02) {
          ctx.fillStyle = `rgba(${FG},0.09)`;
          ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
          continue;
        }
        const s = 1 + t * 5;
        ctx.fillStyle = `rgba(${SIGNAL},${0.12 + t * 0.6})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
  };
  requestAnimationFrame(frame);
})();

/* ------------------------------------------------------------------
   Hero waves: thin contour lines that undulate slowly and bend around
   the cursor, like a trace waveform. Lines near the cursor pick up the signal colour.
------------------------------------------------------------------- */
(() => {
  const canvas = document.querySelector(".hero-net");
  const hero = document.querySelector(".hero");
  if (!canvas || !hero || reduceMotion) return;
  const ctx = canvas.getContext("2d");
  const SIGNAL = "198,255,58";
  const FG = "235,233,227";
  const GAP = 26, STEP = 14, PULL = 190;
  let w = 0, h = 0, visible = true;
  const mouse = { x: -999, y: -999, sx: -999, sy: -999 };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(hero);
  resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

  window.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    if (mouse.sx < -900) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
  }, { passive: true });
  hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = now / 1000;
    if (mouse.x > -900) {
      mouse.sx += (mouse.x - mouse.sx) * 0.12;
      mouse.sy += (mouse.y - mouse.sy) * 0.12;
    } else { mouse.sx = mouse.sy = -999; }

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let y0 = GAP; y0 < h; y0 += GAP) {
      const row = y0 / GAP;
      // proximity of the whole line to the cursor, for the colour shift
      const near = Math.max(0, 1 - Math.abs(y0 - mouse.sy) / PULL);
      ctx.strokeStyle = near > 0.02
        ? `rgba(${SIGNAL},${0.07 + near * 0.3})`
        : `rgba(${FG},0.07)`;
      ctx.beginPath();
      for (let x = 0; x <= w + STEP; x += STEP) {
        let y = y0
          + Math.sin(x * 0.006 + t * 0.35 + row * 0.35) * 7
          + Math.sin(x * 0.014 - t * 0.5 + row * 0.8) * 3;
        const dx = x - mouse.sx, dy = y0 - mouse.sy;
        const d2 = dx * dx + dy * dy;
        if (d2 < PULL * PULL * 2) y += Math.exp(-d2 / (PULL * PULL * 0.6)) * (dy >= 0 ? 1 : -1) * 26;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };
  requestAnimationFrame(frame);
})();

/* Juno Raske — director & cinematographer
   One motif: the film frame. Timecode slate loader · letterbox split ·
   hero still that opens from 2.39:1 to full-bleed · pinned horizontal reel
   with sprockets and a projector gate · shot list with a reel-roll preview ·
   theme inversion to bone · credits marquee · an edit-timeline HUD whose
   playhead is the scroll position. */

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase);

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("exit", "0.625, 0, 0.875, 0");

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const SCRAMBLE_CHARS = "0123456789:/_—#";
const FPS = 24;

const projects = [
  { title: "Salt <em>Year</em>", plain: "Salt Year", type: "Short film", client: "Low Tide Pictures", format: "Alexa 35 / Anamorphic", year: "2026", award: "Berlinale Shorts", scene: "dusk" },
  { title: "Halo<em>gen</em>", plain: "Halogen", type: "Music video", client: "Mira Sol", format: "16mm / Kodak 500T", year: "2025", award: "UKMVA — Best Cinematography", scene: "neon" },
  { title: "Low <em>Tide</em> Club", plain: "Low Tide Club", type: "Commercial", client: "Northwind Outdoor", format: "Alexa Mini LF", year: "2025", award: "Ciclope — Shortlist", scene: "fog" },
  { title: "Dry <em>County</em>", plain: "Dry County", type: "Documentary", client: "Parallel Films", format: "Super 16 / Digital", year: "2024", award: "IFFR — Official Selection", scene: "desert" },
  { title: "Glass <em>House</em>", plain: "Glass House", type: "Music video", client: "Halden Records", format: "Venice 2", year: "2024", award: "Camerimage — Nominee", scene: "tunnel" },
  { title: "Night <em>Ferry</em>", plain: "Night Ferry", type: "Short film", client: "Self-produced", format: "35mm / Kodak 250D", year: "2023", award: "Clermont-Ferrand", scene: "night" },
];
const stillHTML = (scene) => `<div class="still" data-scene="${scene}"><i class="still-sun"></i><i class="still-glint"></i></div>`;

/* ------------------------------------------------------------------
   Odometer — pattern "00:00:00:00": each 0 is a 0–9 reel, the rest static
------------------------------------------------------------------- */
function createOdometer(el) {
  const pattern = el.dataset.pattern || "00";
  el.innerHTML = "";
  el.setAttribute("role", "img");
  const reels = [];
  [...pattern].forEach((ch) => {
    if (ch !== "0") {
      const sep = el.appendChild(document.createElement("span"));
      sep.className = "odo-sep";
      sep.textContent = ch;
      return;
    }
    const digit = el.appendChild(document.createElement("span"));
    digit.className = "odo-digit";
    const reel = digit.appendChild(document.createElement("span"));
    reel.className = "odo-reel";
    reel.innerHTML = "0123456789".split("").map((n) => `<span>${n}</span>`).join("");
    reels.push(reel);
  });
  return {
    /* value: a number (padded) or a digit string matching the reel count */
    set(value, { duration = 1.1, ease = "expo.out", stagger = 0.06, label } = {}) {
      const str = (typeof value === "number" ? String(Math.max(0, Math.round(value))) : value)
        .replace(/\D/g, "").padStart(reels.length, "0").slice(-reels.length);
      el.setAttribute("aria-label", label ?? String(Number(str)));
      reels.forEach((reel, i) => {
        gsap.to(reel, { yPercent: -10 * Number(str[i]), duration, ease, delay: (reels.length - 1 - i) * stagger, overwrite: true });
      });
    },
  };
}

/* frames → "HH:MM:SS:FF" */
const timecode = (frames) => {
  const f = Math.floor(frames);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(f / (FPS * 3600)))}:${pad(Math.floor(f / (FPS * 60)) % 60)}:${pad(Math.floor(f / FPS) % 60)}:${pad(f % FPS)}`;
};

/* viewport width without the scrollbar, for centring the reel gate */
const setVW = () => document.documentElement.style.setProperty("--vw", document.documentElement.clientWidth + "px");
setVW();
window.addEventListener("resize", setVW);

/* ------------------------------------------------------------------
   Render the reel + the preview column
------------------------------------------------------------------- */
const track = $(".reel-track");
track.innerHTML = projects.map((p, i) => `
  <li class="frame${i === 0 ? " is-active" : ""}" data-index="${i}">
    <button class="frame-btn" type="button" data-cursor="Roll" aria-label="${p.plain}, ${p.type}, ${p.year}">
      ${stillHTML(p.scene)}
      <span class="frame-no mono" aria-hidden="true">${String(i + 1).padStart(2, "0")} — ${p.type}</span>
    </button>
    <div class="frame-cap">
      <h3 class="frame-cap-title">${p.title}</h3>
      <span class="mono">${p.year}</span>
      <span class="frame-cap-meta mono">${p.client} · ${p.format} · ${p.award}</span>
    </div>
  </li>`).join("");

const frames = $$(".frame");
const reelOdo = createOdometer($(".reel-count .odo"));
const fields = Object.fromEntries($$(".reel-meta [data-field]").map((el) => [el.dataset.field, el]));
let activeIndex = -1;

function setActive(i, instant = false) {
  if (i === activeIndex) return;
  activeIndex = i;
  const p = projects[i];
  frames.forEach((el, n) => el.classList.toggle("is-active", n === i));
  reelOdo.set(i + 1, { duration: instant ? 0 : 0.8 });
  const fill = () => {
    fields.title.innerHTML = p.title;
    ["type", "client", "format", "year", "award"].forEach((k) => (fields[k].textContent = p[k]));
  };
  if (instant || reduceMotion) return fill();
  // title: fast exit down, rise back in; specs decode like a slate
  gsap.timeline({ overwrite: true })
    .to(fields.title, { yPercent: 30, opacity: 0, duration: 0.18, ease: "exit" })
    .add(fill)
    .fromTo(fields.title, { yPercent: -30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out" })
    .add(() => ["type", "client", "format", "year", "award"].forEach((k, n) => {
      const el = fields[k];
      el.textContent = "";
      gsap.to(el, { duration: 0.6, delay: n * 0.04, scrambleText: { text: p[k], chars: SCRAMBLE_CHARS, speed: 0.8 } });
    }), "<");
}
setActive(0, true);

const previewInner = $(".preview-inner");
previewInner.innerHTML = [0, 1, 2, 3].map((i) => stillHTML(["dusk", "neon", "night", "tunnel"][i])).join("");
$$(".still", previewInner).forEach((s, i) => (s.style.top = i * 100 + "%"));

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
  if (lenis) return lenis.scrollTo(target, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  const top = typeof target === "number" ? target : target.getBoundingClientRect().top + scrollY;
  window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
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
   HUD: clock, cursor, coordinates
------------------------------------------------------------------- */
const clock = $(".clock");
const tick = () => (clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
tick();
setInterval(tick, 1000);

if (finePointer) {
  const cursor = $(".cursor");
  const cursorLabel = $(".cursor-label");
  const xy = { x: $(".xy-x"), y: $(".xy-y") };
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
  window.addEventListener("pointermove", (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    xy.x.textContent = String(Math.round(e.clientX)).padStart(4, "0");
    xy.y.textContent = String(Math.round(e.clientY)).padStart(4, "0");
  });
  $$("[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => { cursorLabel.textContent = el.dataset.cursor; cursor.classList.add("is-active"); });
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
  });
}

$$(".scramble-hover").forEach((a) => {
  const text = a.textContent;
  a.addEventListener("pointerenter", () => {
    if (reduceMotion) return;
    gsap.to(a, { duration: 0.8, scrambleText: { text, chars: "!<>-_\\/[]{}—=+*^?#%$@", speed: 0.6, revealDelay: 0.1 }, overwrite: true });
  });
});

/* ------------------------------------------------------------------
   Split text — autoSplit keeps it correct through resize / font load
------------------------------------------------------------------- */
let introDone = false;
let heroAnim;
SplitText.create(".hero-word", {
  type: "chars",
  mask: "chars",
  autoSplit: true,
  onSplit(self) {
    heroAnim = gsap.from(self.chars, { yPercent: 110, duration: 1.4, ease: "expo.out", stagger: 0.045, paused: !introDone && !reduceMotion });
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
        scrollTrigger: { trigger: ".statement", start: "top 65%", end: "bottom 70%", scrub: true },
      });
    },
  });

  // Shot names rise out of a line mask as each row enters
  SplitText.create(".shot-name", {
    type: "lines",
    mask: "lines",
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.lines, {
        yPercent: 105, duration: 1, ease: "expo.out", stagger: 0.12,
        scrollTrigger: { trigger: ".shot-list", start: "top 80%" },
      });
    },
  });

  SplitText.create(".wordmark", {
    type: "chars",
    mask: "chars",
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.chars, {
        yPercent: 100, ease: "none", stagger: 0.08,
        scrollTrigger: { trigger: ".footer", start: "top 95%", end: "bottom bottom", scrub: 0.6 },
      });
    },
  });
}

/* ------------------------------------------------------------------
   Scroll choreography — pins only on desktop with motion allowed
------------------------------------------------------------------- */
const mm = gsap.matchMedia();
const reel = $(".reel");

mm.add({ desktop: "(min-width: 900px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
  const { desktop, reduce } = ctx.conditions;

  /* OPEN: the letterboxed still opens to full-bleed, the name parts */
  if (desktop && !reduce) {
    const pin = $(".hero-pin");
    // start size comes from the --win-w token (in vw), never from the animated element
    const winW = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--win-w")) / 100) * innerWidth;
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=90%", pin: pin, scrub: 0.8, invalidateOnRefresh: true },
    })
      .fromTo(".hero-frame", { width: winW, height: () => winW() / 2.39 },
        { width: () => pin.offsetWidth, height: () => pin.offsetHeight }, 0)
      .fromTo(".hero-frame .still", { scale: 1.18 }, { scale: 1 }, 0)
      .to(".hero-word--l", { xPercent: -40 }, 0)
      .to(".hero-word--r", { xPercent: 40 }, 0)
      .to([".hero-intro", ".spec", ".scroll-hint", ".hero-eyebrow", ".hero-slate", ".hero-frame-tc"], { opacity: 0, y: -20, duration: 0.35 }, 0)
      .to(".hero-frame .crop", { opacity: 0, duration: 0.2 }, 0.8);
  } else if (!reduce) {
    gsap.to(".hero-frame .still", { yPercent: 12, scale: 1.1, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* REEL: pinned horizontal strip, one frame in the gate at a time */
  if (desktop && !reduce) {
    reel.classList.add("reel--pinned");
    const cleanups = [];
    const n = frames.length;
    const step = () => frames[1].offsetLeft - frames[0].offsetLeft;
    const strip = gsap.to(track, {
      x: () => -step() * (n - 1),
      ease: "none",
      scrollTrigger: {
        trigger: reel,
        start: "top top",
        end: () => "+=" + step() * (n - 1) * 1.1,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        snap: { snapTo: 1 / (n - 1), inertia: false, duration: { min: 0.25, max: 0.7 }, delay: 0.05, ease: "power2.inOut" },
        onUpdate: (self) => setActive(Math.round(self.progress * (n - 1))),
      },
    });
    // each still drifts inside its frame as it crosses the gate
    frames.forEach((f) => {
      gsap.fromTo($(".still", f), { xPercent: 7 }, {
        xPercent: -7, ease: "none",
        scrollTrigger: { trigger: f, containerAnimation: strip, start: "left right", end: "right left", scrub: true },
      });
    });
    // click or keyboard focus rolls that frame into the gate
    frames.forEach((f, i) => {
      const go = () => {
        const st = strip.scrollTrigger;
        if (i !== activeIndex) scrollToTarget(st.start + (st.end - st.start) * (i / (n - 1)));
      };
      const btn = $(".frame-btn", f);
      btn.addEventListener("click", go);
      btn.addEventListener("focus", go);
      cleanups.push(() => { btn.removeEventListener("click", go); btn.removeEventListener("focus", go); });
    });
    ctx.add(() => () => { reel.classList.remove("reel--pinned"); cleanups.forEach((fn) => fn()); });
  } else if (!reduce) {
    frames.forEach((f) => gsap.from(f, { y: 60, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: f, start: "top 90%" } }));
  }
});

/* SHOT LIST: preview frame follows the cursor; its stills roll like a reel */
if (finePointer && !reduceMotion) {
  const preview = $(".preview");
  const px = gsap.quickTo(preview, "x", { duration: 0.6, ease: "power3" });
  const py = gsap.quickTo(preview, "y", { duration: 0.6, ease: "power3" });
  const list = $(".shot-list");
  window.addEventListener("pointermove", (e) => { px(e.clientX + 170); py(e.clientY); });
  list.addEventListener("pointerenter", () => gsap.to(preview, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out", overwrite: "auto" }));
  list.addEventListener("pointerleave", () => gsap.to(preview, { opacity: 0, scale: 0.6, duration: 0.3, ease: "exit", overwrite: "auto" }));
  $$(".shot").forEach((row) => {
    row.addEventListener("pointerenter", () => gsap.to(previewInner, { yPercent: -100 * Number(row.dataset.preview), duration: 0.7, ease: "osmo", overwrite: true }));
  });
}

/* ------------------------------------------------------------------
   ABOUT: theme inversion to bone + odometer stats
------------------------------------------------------------------- */
const root = document.documentElement;
const THEMES = { dark: { "--bg": "#0b0b0a", "--fg": "#ece6da" }, light: { "--bg": "#ece6da", "--fg": "#0b0b0a" } };
ScrollTrigger.create({
  trigger: ".about",
  start: "top 55%",
  end: "bottom 45%",
  onToggle: (self) => gsap.to(root, { ...(self.isActive ? THEMES.light : THEMES.dark), duration: reduceMotion ? 0 : 0.8, ease: "osmo", overwrite: true }),
});

$$(".stats .odo").forEach((el) => {
  const odo = createOdometer(el);
  const value = Number(el.dataset.value);
  if (reduceMotion) return odo.set(value, { duration: 0 });
  odo.set(0, { duration: 0 });
  ScrollTrigger.create({
    trigger: el, start: "top 85%",
    onEnter: () => odo.set(value, { duration: 1.8, stagger: 0.12 }),
    onLeaveBack: () => odo.set(0, { duration: 0.5, ease: "power2.in" }),
  });
});

if (!reduceMotion) {
  // Credits marquee: constant drift, kicked by scroll velocity
  const marquee = gsap.to(".marquee-track", { xPercent: -50, duration: 30, ease: "none", repeat: -1 });
  ScrollTrigger.create({
    trigger: ".marquee", start: "top bottom", end: "bottom top",
    onUpdate: (self) => {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 6);
      gsap.to(marquee, { timeScale: boost, duration: 0.2, overwrite: true });
      gsap.to(marquee, { timeScale: 1, duration: 1.2, delay: 0.2, ease: "power2.out" });
    },
  });

  gsap.from(".cut-cta", { yPercent: 30, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".cut", start: "top 70%" } });
  gsap.from(".vf-btn", { y: 20, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".vf-btns", start: "top 92%" } });
}

/* ------------------------------------------------------------------
   Deck — the edit timeline. Built last so pin spacing is measured.
   Clip widths = section heights; playhead + timecode = page progress.
------------------------------------------------------------------- */
const deckClips = $$(".deck-clip");
const deckHead = $(".deck-head");
const deckTC = $(".deck-tc");
const RUNTIME = 3 * 60 * FPS + 24 * FPS; // the page "runs" 00:03:24:00

$$("[data-section]").forEach((section) => {
  const clip = deckClips.find((a) => a.getAttribute("href") === "#" + section.id);
  if (!clip) return;
  const fill = $(".deck-fill", clip);
  const st = ScrollTrigger.create({
    trigger: section,
    start: "top 50%",
    end: "bottom 50%",
    onToggle: (self) => clip.classList.toggle("is-active", self.isActive),
    onUpdate: (self) => gsap.set(fill, { scaleX: self.progress }),
    onRefresh: (self) => (clip.style.flexGrow = Math.max(1, Math.round(self.end - self.start))),
  });
  clip.style.flexGrow = Math.max(1, Math.round(st.end - st.start));
});
ScrollTrigger.create({
  start: 0,
  end: "max",
  onUpdate: (self) => {
    gsap.set(deckHead, { left: self.progress * 100 + "%" });
    deckTC.textContent = timecode(self.progress * RUNTIME);
  },
});

/* ------------------------------------------------------------------
   Intro: slate timecode rolls → letterbox bars split → the name rises
------------------------------------------------------------------- */
function startSite() {
  introDone = true;
  document.body.classList.remove("is-loading");
  lenis?.start();
  heroAnim?.play();
  if (reduceMotion) return;
  const eyebrow = $(".hero-eyebrow");
  const eyebrowText = eyebrow.textContent;
  eyebrow.textContent = "";
  gsap.timeline()
    .to(eyebrow, { duration: 1.2, scrambleText: { text: eyebrowText, chars: SCRAMBLE_CHARS, speed: 0.5 } }, 0)
    .from(".hero-frame .still", { scale: 1.45, duration: 1.9, ease: "expo.out", clearProps: "scale" }, 0)
    .from(".hero-frame .crop", { opacity: 0, scale: 2.2, duration: 0.8, ease: "expo.out", stagger: 0.05 }, 0.5)
    .from([".hud > *", ".deck"], { opacity: 0, duration: 0.8, ease: "power2.out", stagger: 0.05 }, 0.3)
    .from([".hero-slate", ".hero-intro", ".spec", ".scroll-hint", ".hero-frame-tc"], { y: 24, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.07 }, 0.4);
}

function playIntro() {
  if (reduceMotion) { $(".loader")?.remove(); startSite(); return; }

  let seen = false;
  try { seen = sessionStorage.getItem("jr-intro") === "1"; sessionStorage.setItem("jr-intro", "1"); } catch (e) {}
  const roll = seen ? 0.9 : 2.4;

  const tcOdo = createOdometer($(".loader-tc .odo"));
  const counter = { f: 0 };
  const tl = gsap.timeline();

  $$(".loader [data-scramble]").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    tl.to(el, { duration: roll * 0.7, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.4 } }, 0);
  });

  tl.to(counter, {
    f: 3 * FPS, duration: roll, ease: "power1.inOut", // three seconds of slate
    onUpdate: () => tcOdo.set(timecode(counter.f), { duration: 0.12, ease: "none", stagger: 0, label: "Loading" }),
  }, 0)
    .to(".loader-line", { scaleX: 1, duration: roll, ease: "power1.inOut" }, 0)
    .to([".loader-tc", ".loader-label"], { yPercent: -40, opacity: 0, duration: 0.35, ease: "exit", stagger: 0.03 }, "+=0.2")
    .to(".loader-line", { scaleX: 0, transformOrigin: "100% 50%", duration: 0.35, ease: "exit" }, "<")
    .to(".loader-half--top", { yPercent: -100, duration: 1.1, ease: "osmo" }, "-=0.05")
    .to(".loader-half--bot", { yPercent: 100, duration: 1.1, ease: "osmo" }, "<")
    .add(startSite, "-=0.7")
    .add(() => $(".loader")?.remove());
}

document.fonts.ready.then(() => {
  ScrollTrigger.refresh();
  playIntro();
});

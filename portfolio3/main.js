/* Aiko Lund — product designer
   One motif: the unit — a single blue square. It counts the loader up,
   floods the screen, lands as the full stop after the name, opens every
   project, marks the active nav item, becomes the cursor that wraps what
   you hover, and finally floods the contact section. Minimal surface,
   decisive motion: expo settles, osmo UI, fast exits. */

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase);

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("exit", "0.625, 0, 0.875, 0");

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const UNIT = 48; // side of the square every project opens from

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const projects = [
  { name: "Ledger", cat: "Fintech / Mobile", year: "2026", c: "#0f3d3e", f: "#e6eee8", comp: "bars", desc: "A payments app for two million people. The send flow went from seven steps to three." },
  { name: "Tempo", cat: "Scheduling / SaaS", year: "2025", c: "#f2c14e", f: "#141414", comp: "circle", desc: "Shift planning for hospitals, built around a single, draggable week." },
  { name: "Atlas", cat: "Design system", year: "2025", c: "#e9573f", f: "#ffffff", comp: "grid", desc: "Tokens, 140 components and the docs site for a logistics group of nine brands." },
  { name: "Field", cat: "Agritech / Dashboard", year: "2024", c: "#c9d6cf", f: "#141414", comp: "arc", desc: "Soil and weather data for farm managers, readable in direct sunlight." },
  { name: "Quiet", cat: "Hardware / Companion", year: "2023", c: "#141414", f: "#f3f3f1", comp: "stack", desc: "The companion app for a screenless sleep device — one button, no feed." },
];

const compHTML = (type) => {
  if (type === "bars") return [38, 62, 45, 80, 56, 92, 70].map((h) => `<i style="--h:${h}%"></i>`).join("");
  if (type === "circle") return "<i></i><i></i>";
  if (type === "grid") return Array.from({ length: 40 }, (_, i) => `<i${[3, 9, 10, 17, 22, 27, 28, 36].includes(i) ? ' class="on"' : ""}></i>`).join("");
  if (type === "arc") return [20, 40, 60, 80, 100].map((s) => `<i style="--s:${s}%"></i>`).join("");
  return "<i></i><i></i><i></i>";
};
// only tween the properties each type needs — a stray yPercent would override the CSS translate that centres the circles
const compFrom = (type) => (type === "bars" ? { scaleY: 0 } : type === "stack" ? { yPercent: 40, opacity: 0 } : { scale: 0 });
const compTo = (type) => (type === "bars" ? { scaleY: 1 } : type === "stack" ? { yPercent: 0, opacity: 1 } : { scale: 1 });

/* ------------------------------------------------------------------
   Odometer — pattern "000": each 0 is a 0–9 reel
------------------------------------------------------------------- */
function createOdometer(el) {
  const count = (el.dataset.pattern || "00").length;
  el.innerHTML = "";
  el.setAttribute("role", "img");
  const reels = Array.from({ length: count }, () => {
    const digit = el.appendChild(document.createElement("span"));
    digit.className = "odo-digit";
    const reel = digit.appendChild(document.createElement("span"));
    reel.className = "odo-reel";
    reel.innerHTML = "0123456789".split("").map((n) => `<span>${n}</span>`).join("");
    return reel;
  });
  return {
    set(value, { duration = 1.1, ease = "expo.out", stagger = 0.06 } = {}) {
      const str = String(Math.max(0, Math.round(value))).padStart(count, "0").slice(-count);
      el.setAttribute("aria-label", String(Math.round(value)));
      reels.forEach((reel, i) => gsap.to(reel, { yPercent: -10 * Number(str[i]), duration, ease, delay: (count - 1 - i) * stagger, overwrite: true }));
    },
  };
}

/* a centred UNIT-sized square as a clip-path, for any box */
const unitClip = (el, cy, size = UNIT) => {
  const W = el.offsetWidth, H = el.offsetHeight;
  const y = (cy ?? H / 2) - size / 2, x = (W - size) / 2;
  return `inset(${y}px ${x}px ${H - y - size}px ${x}px)`;
};

/* open a panel out of the unit: nothing → blue unit → full project */
function openPanel(tl, i, at) {
  const panel = panels[i];
  const kids = [...comps[i].children];
  // explicit 4-value strings on both ends: browsers serialise inset(a b a b) as inset(a b),
  // which GSAP would pair against a 4-value end and open the panel off-centre
  tl.fromTo(panel, { clipPath: () => unitClip(panel, null, 0) }, { clipPath: () => unitClip(panel), duration: 0.2, ease: "back.out(3)" }, at)
    .fromTo(panel, { clipPath: () => unitClip(panel) }, { clipPath: FULL, duration: 1, ease: "power3.inOut", immediateRender: false }, at + 0.2)
    .fromTo(units[i], { scale: 1 }, { scale: 0, rotation: 90, duration: 0.35, ease: "exit" }, at + 0.75)
    .fromTo(kids, compFrom(projects[i].comp), { ...compTo(projects[i].comp), duration: 0.45, ease: "expo.out", stagger: { amount: 0.15 } }, at + 0.6);
  return tl;
}
const FULL = "inset(0px 0px 0px 0px)";

/* ------------------------------------------------------------------
   Render work
------------------------------------------------------------------- */
$(".work-stage").innerHTML = projects.map((p, i) => `
  <article class="project" data-index="${i}">
    <div class="panel" style="--c:${p.c};--f:${p.f}">
      <div class="panel-top mono"><span>${String(i + 1).padStart(2, "0")} — ${p.cat}</span><span>${p.year}</span></div>
      <div class="comp comp--${p.comp}" aria-hidden="true">${compHTML(p.comp)}</div>
      <p class="panel-name">${p.name}</p>
      <i class="panel-unit" aria-hidden="true"></i>
    </div>
    <div class="project-cap"><h3>${p.name}</h3><span class="mono">${p.year}</span><p>${p.desc}</p></div>
  </article>`).join("");
$(".work-list").innerHTML = projects.map((p, i) => `
  <li class="work-item${i === 0 ? " is-active" : ""}">
    <button type="button" data-magnet>
      <span class="mono">${String(i + 1).padStart(2, "0")}</span>
      <span class="work-item-name"><i class="work-item-mark"></i>${p.name}</span>
      <span class="mono">${p.cat.split(" / ")[0]}</span>
    </button>
  </li>`).join("");

const panels = $$(".panel");
const comps = $$(".comp");
const units = $$(".panel-unit");
const items = $$(".work-item");
const workOdo = createOdometer($(".work-num .odo"));
const workDesc = $(".work-desc");
let activeIndex = -1;

function setActive(i, instant = false) {
  if (i === activeIndex) return;
  activeIndex = i;
  items.forEach((el, n) => el.classList.toggle("is-active", n === i));
  workOdo.set(i + 1, { duration: instant ? 0 : 0.9 });
  if (instant || reduceMotion) { workDesc.textContent = projects[i].desc; return; }
  gsap.timeline({ overwrite: true })
    .to(workDesc, { opacity: 0, y: -8, duration: 0.18, ease: "exit" })
    .add(() => (workDesc.textContent = projects[i].desc))
    .fromTo(workDesc, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" });
}
setActive(0, true);

/* ------------------------------------------------------------------
   Smooth scroll
------------------------------------------------------------------- */
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
window.scrollTo(0, 0);

function scrollToTarget(target) {
  if (lenis) return lenis.scrollTo(target, { duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
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
   Clock, grid toggle, scramble
------------------------------------------------------------------- */
const clock = $(".clock");
const tick = () => (clock.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }));
tick();
setInterval(tick, 15000);

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "g" || e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
  document.body.classList.toggle("show-grid");
});

$$(".scramble-hover").forEach((a) => {
  const text = a.textContent;
  a.addEventListener("pointerenter", () => {
    if (reduceMotion) return;
    gsap.to(a, { duration: 0.7, scrambleText: { text, chars: "■□▪▫", speed: 0.7, revealDelay: 0.1 }, overwrite: true });
  });
});

/* ------------------------------------------------------------------
   Cursor — a blue unit; over [data-magnet] it wraps the element
------------------------------------------------------------------- */
if (finePointer && !reduceMotion) {
  const cur = $(".cursor");
  const xTo = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" });
  const yTo = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
  const PAD = 6;
  let magnet = null, mx = -50, my = -50;

  const follow = () => {
    if (!magnet) { xTo(mx - 5); yTo(my - 5); return; }
    const r = magnet.getBoundingClientRect();
    // hug the element, with a slight pull toward the pointer
    xTo(r.left - PAD + (mx - (r.left + r.width / 2)) * 0.08);
    yTo(r.top - PAD + (my - (r.top + r.height / 2)) * 0.08);
  };
  window.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; follow(); });
  lenis?.on("scroll", follow);

  $$("[data-magnet]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      magnet = el;
      const r = el.getBoundingClientRect();
      cur.classList.add("is-magnet");
      gsap.to(cur, { width: r.width + PAD * 2, height: r.height + PAD * 2, duration: 0.4, ease: "osmo", overwrite: "auto" });
      follow();
    });
    el.addEventListener("pointerleave", () => {
      magnet = null;
      cur.classList.remove("is-magnet");
      gsap.to(cur, { width: 10, height: 10, duration: 0.3, ease: "osmo", overwrite: "auto" });
      follow();
    });
  });
}

/* ------------------------------------------------------------------
   Split text
------------------------------------------------------------------- */
let introDone = false;
let heroAnim;
SplitText.create(".hero-line", {
  type: "chars",
  mask: "chars",
  autoSplit: true,
  onSplit(self) {
    heroAnim = gsap.from(self.chars, { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.035, paused: !introDone && !reduceMotion });
    if (reduceMotion) heroAnim.progress(1);
    return heroAnim;
  },
});

if (!reduceMotion) {
  SplitText.create(".statement-text", {
    type: "words",
    autoSplit: true,
    onSplit(self) {
      return gsap.fromTo(self.words, { opacity: 0.1 }, {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: ".statement", start: "top 65%", end: "bottom 70%", scrub: true },
      });
    },
  });

  // Principles: the word rises, the rule draws, the unit pops in
  $$(".principle").forEach((row) => {
    const word = $(".principle-word", row);
    const bullet = $(".sq-bullet", row);
    SplitText.create(word, {
      type: "chars",
      mask: "chars",
      autoSplit: true,
      onSplit(self) {
        return gsap.timeline({ scrollTrigger: { trigger: row, start: "top 82%", toggleActions: "play none none reverse" } })
          .from(self.chars, { yPercent: 105, duration: 1.1, ease: "expo.out", stagger: 0.03 }, 0)
          .from($(".principle-rule", row), { scaleX: 0, duration: 1.3, ease: "expo.out" }, 0)
          .from(bullet, { scale: 0, rotation: -90, duration: 0.6, ease: "back.out(2.4)" }, 0.35)
          .from([$(".principle-no", row), $(".principle-text", row)], { y: 16, opacity: 0, duration: 0.7, ease: "expo.out", stagger: 0.06 }, 0.2);
      },
    });
  });
}

/* ------------------------------------------------------------------
   Scroll choreography — pins only on desktop with motion allowed
------------------------------------------------------------------- */
const work = $(".work");
const mm = gsap.matchMedia();

mm.add({ desktop: "(min-width: 900px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
  const { desktop, reduce } = ctx.conditions;
  if (reduce) return;

  // Index: text drifts up, the full stop spins away
  gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } })
    .to(".hero-title", { yPercent: -18 }, 0)
    .to(".hero-sq", { rotation: 180, scale: 0, ease: "power2.in" }, 0)
    .to([".hero-intro", ".hero-tag", ".hero-avail"], { y: -60, opacity: 0 }, 0);

  if (desktop) {
    /* WORK: pinned stage — each project opens out of the unit */
    work.classList.add("work--pinned");
    const n = panels.length;

    // the first panel opens as the section arrives
    openPanel(gsap.timeline({ scrollTrigger: { trigger: work, start: "top 80%", end: "top top", scrub: 0.6, invalidateOnRefresh: true } }), 0, 0);

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: work,
        start: "top top",
        end: () => "+=" + (n - 1) * innerHeight,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        snap: { snapTo: "labelsDirectional", inertia: false, duration: { min: 0.3, max: 0.8 }, delay: 0.05, ease: "power2.inOut" },
        onUpdate: (self) => setActive(Math.round(self.progress * (n - 1))),
      },
    });
    tl.addLabel("p0");
    for (let i = 1; i < n; i++) {
      const at = (i - 1) * 1.2; // every step is 1.2 long, so labels stay evenly spaced
      openPanel(tl, i, at).fromTo(panels[i - 1], { scale: 1 }, { scale: 0.9, duration: 1, ease: "power2.in" }, at + 0.2);
      tl.addLabel("p" + i, at + 1.2);
    }

    const cleanups = [];
    items.forEach((item, i) => {
      const btn = $("button", item);
      const go = () => scrollToTarget(tl.scrollTrigger.labelToScroll("p" + i));
      btn.addEventListener("click", go);
      cleanups.push(() => btn.removeEventListener("click", go));
    });
    ctx.add(() => () => { work.classList.remove("work--pinned"); cleanups.forEach((fn) => fn()); });
  } else {
    // mobile: each panel opens out of the unit as it enters
    panels.forEach((panel, i) => {
      openPanel(gsap.timeline({ scrollTrigger: { trigger: panel, start: "top 85%" }, defaults: { overwrite: "auto" } }).timeScale(0.9), i, 0);
    });
  }

  /* CONTACT: the unit floods the section blue */
  const fill = $(".contact-fill");
  gsap.timeline({ scrollTrigger: { trigger: ".contact", start: "top 85%", end: "top top", scrub: 0.6, invalidateOnRefresh: true } })
    .fromTo(fill, { clipPath: () => unitClip(fill, innerHeight * 0.1) }, { clipPath: FULL, ease: "power3.in", duration: 1 }, 0)
    .fromTo(".contact-body", { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "none" }, 0.75);
});

/* the HUD and cursor turn white once the flood has taken over */
ScrollTrigger.create({
  trigger: ".contact",
  start: "top 12%",
  onToggle: (self) => document.body.classList.toggle("is-blue", self.isActive),
});

/* ------------------------------------------------------------------
   About: odometer stats
------------------------------------------------------------------- */
$$(".stats .odo").forEach((el) => {
  const odo = createOdometer(el);
  const value = Number(el.dataset.value);
  if (reduceMotion) return odo.set(value, { duration: 0 });
  odo.set(0, { duration: 0 });
  ScrollTrigger.create({
    trigger: el, start: "top 88%",
    onEnter: () => odo.set(value, { duration: 1.6, stagger: 0.1 }),
    onLeaveBack: () => odo.set(0, { duration: 0.4, ease: "power2.in" }),
  });
});

if (!reduceMotion) {
  gsap.from(".about-lede", { y: 40, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".about", start: "top 70%" } });
}

/* ------------------------------------------------------------------
   Nav: the unit slides to the active link; section counter rolls.
   Created last so the pin spacing is already measured.
------------------------------------------------------------------- */
const navLinks = $$(".nav-link");
const navDot = $(".nav-dot");
const hudOdo = createOdometer($(".hud-count .odo"));
hudOdo.set(1, { duration: 0 });
$$("[data-section]").forEach((section, i) => {
  const link = navLinks.find((a) => a.getAttribute("href") === "#" + section.id);
  ScrollTrigger.create({
    trigger: section,
    start: "top 50%",
    end: "bottom 50%",
    onToggle: (self) => {
      link?.classList.toggle("is-active", self.isActive);
      if (!self.isActive) return;
      hudOdo.set(i + 1, { duration: 0.7 });
      if (link) gsap.to(navDot, { x: link.offsetLeft, opacity: 1, duration: 0.55, ease: "osmo" });
      else gsap.to(navDot, { opacity: 0, duration: 0.25, ease: "exit" });
    },
  });
});

/* ------------------------------------------------------------------
   Intro: the unit counts, floods, and lands as the full stop
------------------------------------------------------------------- */
function startSite() {
  introDone = true;
  document.body.classList.remove("is-loading");
  lenis?.start();
  heroAnim?.play();
  if (reduceMotion) return;
  gsap.timeline()
    .from(".hud > *", { y: -12, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 }, 0.2)
    .from([".hero-tag", ".hero-avail", ".hero-intro", ".hero-scroll"], { y: 18, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.06 }, 0.35);
}

function playIntro() {
  const loader = $(".loader");
  const sq = $(".loader-sq");
  if (reduceMotion) { loader.remove(); sq.remove(); startSite(); return; }

  let seen = false;
  try { seen = sessionStorage.getItem("al-intro") === "1"; sessionStorage.setItem("al-intro", "1"); } catch (e) {}
  const count = seen ? 0.8 : 1.9;

  const heroSq = $(".hero-sq");
  const pctOdo = createOdometer($(".loader-pct .odo"));
  const counter = { v: 0 };
  const box = (s) => ({ left: innerWidth / 2 - s / 2, top: innerHeight / 2 - s / 2, width: s, height: s });
  const heroBox = (k) => () => heroSq.getBoundingClientRect()[k];

  gsap.set(heroSq, { autoAlpha: 0 });
  gsap.set(sq, box(0));

  gsap.timeline()
    .to(sq, { ...box(12), duration: 0.5, ease: "expo.out" })
    .from([".loader-pct", ".loader-label"], { opacity: 0, y: 8, duration: 0.5, ease: "expo.out", stagger: 0.05 }, 0.1)
    .to(counter, { v: 100, duration: count, ease: "power2.inOut", onUpdate: () => pctOdo.set(counter.v, { duration: 0.3, ease: "power3.out", stagger: 0 }) }, 0.2)
    .to(sq, { ...box(72), duration: count, ease: "steps(6)" }, 0.2)
    .to([".loader-pct", ".loader-label"], { opacity: 0, y: -10, duration: 0.3, ease: "exit", stagger: 0.03 }, "+=0.15")
    .to(sq, { left: 0, top: 0, width: () => innerWidth, height: () => innerHeight, duration: 0.8, ease: "osmo" }, "-=0.05")
    .set(loader, { autoAlpha: 0 })
    .to(sq, { left: heroBox("left"), top: heroBox("top"), width: heroBox("width"), height: heroBox("height"), duration: 1.3, ease: "expo.inOut" }, "+=0.05")
    .add(startSite, "-=0.75")
    .set(heroSq, { autoAlpha: 1 })
    .add(() => { sq.remove(); loader.remove(); });
}

document.fonts.ready.then(() => {
  ScrollTrigger.refresh();
  playIntro();
});

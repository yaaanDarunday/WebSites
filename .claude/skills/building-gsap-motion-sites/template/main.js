/* Iris Vale — portfolio
   Patterns lifted from the GSAP showcase study (see ../references/showcase-study.md):
   odometer loader (A24) · scramble labels (Revelatio) · masked line reveal ·
   word-by-word scroll highlight · pinned focus index (Huy Phan) · colour wipe
   rows with dB meter (Dkton) · theme inversion (Revelatio) · live HUD (Illoca) */

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, CustomEase);

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("exit", "0.625, 0, 0.875, 0");

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#%$@";

const projects = [
  { name: "Halden <em>Records</em>", plain: "Halden Records", cat: "Music / WebGL", role: "Design, Creative Development", year: "2026", award: "Awwwards SOTD", desc: "A record label site where every release is a spinning object you can scratch.", colors: ["#ff4d1f", "#121212", "#efede8"], shape: "ring" },
  { name: "Northwind <em>Atlas</em>", plain: "Northwind Atlas", cat: "Product / Mapping", role: "Product Design", year: "2025", award: "CSSDA Website of the Day", desc: "Cartography tooling for field teams — dense data, calm motion.", colors: ["#2b4fbf", "#efe6d4", "#9fb4ff"], shape: "grid" },
  { name: "Salt &amp; <em>Signal</em>", plain: "Salt & Signal", cat: "Brand / Motion", role: "Art Direction, Motion", year: "2025", award: "FWA of the Day", desc: "Identity and motion language for a coastal radio collective.", colors: ["#121212", "#efede8", "#ffb800"], shape: "bars" },
  { name: "Oda <em>Kitchen</em>", plain: "Oda Kitchen", cat: "Commerce / Food", role: "Design, Shopify Build", year: "2024", award: "Awwwards Honorable Mention", desc: "A warm, tactile storefront for a neighbourhood noodle bar.", colors: ["#e8dcc6", "#2f2a24", "#2f5d50"], shape: "disc" },
  { name: "Parallel <em>Films</em>", plain: "Parallel Films", cat: "Editorial / Film", role: "Design, Front-end", year: "2024", award: "Awwwards SOTD", desc: "An archive of independent cinema, catalogued like a boutique shelf.", colors: ["#d6d3d1", "#0e0e0d", "#8c1d18"], shape: "rect" },
  { name: "Kiln <em>Studio</em>", plain: "Kiln Studio", cat: "Portfolio / Ceramics", role: "Creative Direction", year: "2023", award: "Site of the Month Nominee", desc: "Slow scroll, big type, and glazes that shift as you move.", colors: ["#c2462b", "#f4eee6", "#3a2a22"], shape: "arch" },
];

/* ------------------------------------------------------------------
   Odometer — a 0–9 reel per digit, moved with yPercent
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
    value: 0,
    set(value, { duration = 1.1, ease = "expo.out", stagger = 0.06 } = {}) {
      this.value = value;
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
stage.innerHTML = projects.map((p, i) => `
  <article class="poster" data-shape="${p.shape}" style="--p-bg:${p.colors[0]};--p-fg:${p.colors[1]};--p-accent:${p.colors[2]}">
    <div class="poster-art" aria-hidden="true"></div>
    <div class="poster-top"><span>${String(i + 1).padStart(2, "0")} — ${p.cat}</span><span>${p.year}</span></div>
    <h3 class="poster-title">${p.name}</h3>
    <div class="poster-bottom"><span>${p.role}</span><span>${p.award}</span></div>
  </article>`).join("");
list.innerHTML = projects.map((p, i) => `
  <li class="work-item${i === 0 ? " is-active" : ""}" data-index="${i}" tabindex="0" role="button">
    <span class="work-item-cat mono">${p.cat}</span>
    <span class="work-item-name">${p.plain}</span>
    <span class="work-item-desc">${p.desc}</span>
  </li>`).join("");

const posters = $$(".poster");
const items = $$(".work-item");
const swatches = $$(".work-swatches i");
const fields = { role: $('[data-field="role"]'), year: $('[data-field="year"]'), award: $('[data-field="award"]') };
const workOdo = createOdometer($(".work-counter .odo"));
let activeIndex = -1;

function setActive(i, instant = false) {
  if (i === activeIndex) return;
  activeIndex = i;
  const p = projects[i];
  items.forEach((el, n) => el.classList.toggle("is-active", n === i));
  swatches.forEach((el, n) => (el.style.backgroundColor = p.colors[n]));
  workOdo.set(i + 1, { duration: instant ? 0 : 0.9 });
  const vals = Object.values(fields);
  if (instant || reduceMotion) {
    Object.entries(fields).forEach(([k, el]) => (el.textContent = p[k]));
    return;
  }
  // Huy-Phan style: meta blurs out, swaps, blurs back in
  gsap.timeline()
    .to(vals, { filter: "blur(8px)", opacity: 0, duration: 0.2, ease: "power1.in", overwrite: true })
    .add(() => Object.entries(fields).forEach(([k, el]) => (el.textContent = p[k])))
    .to(vals, { filter: "blur(0px)", opacity: 1, duration: 0.45, ease: "power2.out", stagger: 0.05 });
}
setActive(0, true);

/* ------------------------------------------------------------------
   Disc text
------------------------------------------------------------------- */
(() => {
  const el = $(".disc-text");
  const text = el.textContent;
  el.textContent = "";
  const step = 360 / text.length;
  [...text].forEach((ch, i) => {
    const s = document.createElement("span");
    s.textContent = ch;
    s.style.transform = `rotate(${i * step}deg)`;
    el.appendChild(s);
  });
})();

/* ------------------------------------------------------------------
   Smooth scroll (Lenis driven by the GSAP ticker)
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
   HUD: live clock + cursor coordinates + difference cursor
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

/* Email: scramble on hover */
$$(".scramble-hover").forEach((a) => {
  const text = a.textContent;
  a.addEventListener("pointerenter", () => {
    if (reduceMotion) return;
    gsap.to(a, { duration: 0.8, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.6, revealDelay: 0.1 }, overwrite: true });
  });
});

/* ------------------------------------------------------------------
   Split text (autoSplit keeps animations correct on resize/font load)
------------------------------------------------------------------- */
let introDone = false;
let heroAnim;
SplitText.create(".hero-title", {
  type: "lines",
  mask: "lines",
  linesClass: "split-line",
  autoSplit: true,
  onSplit(self) {
    heroAnim = gsap.from(self.lines, { yPercent: 118, duration: 1.4, ease: "expo.out", stagger: 0.09, paused: !introDone && !reduceMotion });
    if (reduceMotion) heroAnim.progress(1);
    return heroAnim;
  },
});

if (!reduceMotion) {
  // Word-by-word highlight, scrubbed (Revelatio cities / Dkton about)
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

  // Footer wordmark rises letter by letter
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
   Responsive / reduced-motion scroll choreography
------------------------------------------------------------------- */
const mm = gsap.matchMedia();

mm.add({ desktop: "(min-width: 900px)", mobile: "(max-width: 899px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
  const { desktop, reduce } = ctx.conditions;

  /* Hero disc: spins with scroll, tilts toward the pointer */
  if (!reduce) {
    gsap.to(".disc", { rotation: 540, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".disc-wrap", { yPercent: 35, scale: 0.8, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    if (finePointer) {
      const rx = gsap.quickTo(".disc", "rotationX", { duration: 0.8, ease: "power3" });
      const ry = gsap.quickTo(".disc", "rotationY", { duration: 0.8, ease: "power3" });
      const onMove = (e) => {
        ry((e.clientX / innerWidth - 0.5) * 30);
        rx(-(e.clientY / innerHeight - 0.5) * 30);
      };
      window.addEventListener("pointermove", onMove);
      ctx.add(() => () => window.removeEventListener("pointermove", onMove));
    }
  }

  /* Work: pinned focus index on desktop */
  if (desktop && !reduce) {
    const n = posters.length;
    const tl = gsap.timeline({
      defaults: { ease: "none", duration: 1 },
      scrollTrigger: {
        trigger: ".work",
        start: "top top",
        end: () => "+=" + (n - 1) * innerHeight * 0.9,
        pin: ".work-inner",
        scrub: 1,
        snap: { snapTo: "labelsDirectional", duration: { min: 0.25, max: 0.7 }, delay: 0.05, ease: "power2.inOut" },
        onUpdate: (self) => setActive(Math.round(self.progress * (n - 1))),
        invalidateOnRefresh: true,
      },
    });
    tl.addLabel("p0");
    for (let i = 1; i < n; i++) {
      tl.fromTo(posters[i], { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" })
        .fromTo(posters[i].querySelector(".poster-title"), { yPercent: 40 }, { yPercent: 0 }, "<")
        .fromTo(posters[i - 1], { scale: 1, yPercent: 0, filter: "brightness(1)" }, { scale: 0.9, yPercent: -4, filter: "brightness(0.7)" }, "<")
        .addLabel("p" + i);
    }
    items.forEach((item, i) => {
      const go = () => scrollToTarget(tl.scrollTrigger.labelToScroll("p" + i));
      item.addEventListener("click", go);
      item.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go()));
    });
  } else if (desktop && reduce) {
    // Reduced motion: no pin — the list simply switches the poster
    const show = (i) => { posters.forEach((p, n) => gsap.set(p, { clipPath: n <= i ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" })); setActive(i, true); };
    items.forEach((item, i) => {
      item.addEventListener("click", () => show(i));
      item.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), show(i)));
    });
  } else if (!reduce) {
    posters.forEach((p) => gsap.from(p, { y: 60, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: p, start: "top 90%" } }));
  }

  /* Services: colour wipe + travelling dB meter (Dkton) */
  if (!reduce) {
    $$(".svc").forEach((svc) => {
      const fill = $(".svc-fill", svc);
      const meter = $(".svc-meter", svc);
      gsap.timeline({
        scrollTrigger: {
          trigger: svc, start: "top 85%", end: "bottom 30%", scrub: 0.6, invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            meter.textContent = p < 0.02 ? "−∞ dB" : `${Math.round((p - 1) * 48)} dB`;
          },
        },
      })
        .fromTo(fill, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none" }, 0)
        .fromTo(meter, { x: 0 }, { x: () => svc.offsetWidth - meter.offsetWidth, ease: "none" }, 0);
    });
  }
});

/* ------------------------------------------------------------------
   About: theme inversion + odometer stats
------------------------------------------------------------------- */
const root = document.documentElement;
const THEMES = { light: { "--paper": "#efede8", "--ink": "#121212" }, dark: { "--paper": "#0e0e0d", "--ink": "#efede8" } };
ScrollTrigger.create({
  trigger: ".about",
  start: "top 55%",
  end: "bottom 45%",
  onToggle: (self) => gsap.to(root, { ...(self.isActive ? THEMES.dark : THEMES.light), duration: reduceMotion ? 0 : 0.8, ease: "osmo", overwrite: true }),
});

$$(".stats .odo").forEach((el) => {
  const odo = createOdometer(el);
  const value = Number(el.dataset.value);
  if (reduceMotion) return odo.set(value, { duration: 0 });
  ScrollTrigger.create({
    trigger: el, start: "top 85%",
    onEnter: () => odo.set(value, { duration: 1.8, stagger: 0.12 }),
    onLeaveBack: () => odo.set(0, { duration: 0.6, ease: "power2.inOut" }),
  });
});

/* Marquee: constant drift, boosted by scroll velocity */
if (!reduceMotion) {
  const marquee = gsap.to(".marquee-track", { xPercent: -50, duration: 32, ease: "none", repeat: -1 });
  ScrollTrigger.create({
    trigger: ".marquee", start: "top bottom", end: "bottom top",
    onUpdate: (self) => {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 5);
      gsap.to(marquee, { timeScale: boost, duration: 0.2, overwrite: true });
      gsap.to(marquee, { timeScale: 1, duration: 1.2, delay: 0.2, ease: "power2.out" });
    },
  });

  gsap.from(".contact-cta", { yPercent: 30, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".contact", start: "top 70%" } });
  gsap.from(".corner-btn", { y: 20, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".corner-btns", start: "top 90%" } });
}

/* ------------------------------------------------------------------
   Nav: active segment + per-section progress bars (Dkton)
   created last so pinned spacing is already measured
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
   Intro: odometer count + scrambled labels → curtain up → hero
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
    .from(".disc", { scale: 0.5, autoAlpha: 0, duration: 1.6, ease: "expo.out" }, 0.1)
    .from(".disc-text", { rotation: -180, duration: 2, ease: "expo.out" }, 0.1)
    .from(".hud > *", { y: -14, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 }, 0.2)
    .from(".hero-meta > *, .scroll-hint", { y: 24, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.08 }, 0.35);
}

function playIntro() {
  if (reduceMotion) { $(".loader")?.remove(); startSite(); return; }

  let seen = false;
  try { seen = sessionStorage.getItem("iv-intro") === "1"; sessionStorage.setItem("iv-intro", "1"); } catch (e) {}
  const countDuration = seen ? 0.9 : 2.4;

  const loaderOdo = createOdometer($(".loader .odo"));
  const counter = { v: 0 };
  const tl = gsap.timeline();

  $$(".loader-label").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    tl.to(el, { duration: countDuration * 0.7, scrambleText: { text, chars: SCRAMBLE_CHARS, speed: 0.4 } }, 0);
  });

  tl.to(counter, {
    v: 100, duration: countDuration, ease: "power2.inOut",
    onUpdate: () => loaderOdo.set(counter.v, { duration: 0.45, ease: "power3.out", stagger: 0 }),
  }, 0)
    .to(".loader-line", { scaleX: 1, duration: countDuration, ease: "power2.inOut" }, 0)
    .to([".loader-count", ".loader-label"], { yPercent: -60, opacity: 0, duration: 0.45, ease: "exit", stagger: 0.04 }, "+=0.25")
    .to(".loader", { yPercent: -100, duration: 1, ease: "osmo" }, "-=0.1")
    .add(startSite, "-=0.55")
    .add(() => $(".loader")?.remove());
}

document.fonts.ready.then(() => {
  ScrollTrigger.refresh();
  playIntro();
});

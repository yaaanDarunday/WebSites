# GSAP Showcase Study: 7 Sites, Dissected

**Source:** [gsap.com/showcase](https://gsap.com/showcase/), using the featured carousel plus two gallery picks
**Studied:** 2026-09-28, in desktop Chromium at a **1440 × 900** viewport, DPR 1
**Method:** Each site was loaded and left through its preloader. I then drove it with real mouse-wheel input: 700–800px per tick, with a frame captured about 250ms after a tick (mid-motion) and another about 1.7s after (settled). At each point I read computed styles from the live DOM: every text node's font, size, weight, line-height, tracking and case, plus colors, radii, borders and blend modes. I also read the `:root` CSS custom properties, CSS transitions and keyframes, loaded scripts, and live GSAP/ScrollTrigger state.

All px values below are **computed values at 1440px wide**. Several sites scale their type fluidly, so the numbers change with viewport. 

| # | Project | Built by | Stack observed | Scroll model |
|---|---|---|---|---|
| 1 | [A24 Films](https://a24.raviklaassens.com/) | Ravi Klaassens | Astro, GSAP 3.15, Lenis, Three.js, Barba | Scroll is hijacked. The page never scrolls; the wheel drives a WebGL carousel |
| 2 | [Illoca](https://illoca.unseen.co/) | Unseen Studio | Nuxt, Lenis (on a wrapper), Three.js, GSAP (bundled) | Scroll-scrubbed 3D camera move, then scrolling sections |
| 3 | [Huy Phan Portfolio](https://huyml.co/) | Huy Phan & Chien Pham | Framer runtime, Three.js/WebGL (GSAP not exposed globally) | Scroll is hijacked. The wheel steps a 3D project "ribbon" |
| 4 | [Revelatio Studio](https://revelatio.studio/) | Revelatio | Webflow, GSAP 3.15 (ScrollTrigger, SplitText, ScrambleText, Observer), Lenis | Native smooth scroll (Lenis) with scroll-triggered theme inversion |
| 5 | [Graffico Office](https://office.graffico.it/) | Graffico Studio | Next.js (Turbopack), React Three Fiber, Blender baked lighting | No scroll. First-person WASD walk-through |
| 6 | [Dkton](https://www.dkton.at/) | Barry Baris Dogan | Webflow, GSAP 3.15 (ScrollTrigger ×14, SplitText, CustomEase), Lenis, Howler.js | Native smooth scroll behind an audio "enter" gate |
| 7 | [Door Dennis](https://www.doordennis.nl/) | Dennis Janssen | WordPress, GSAP 3.11 (ScrollTrigger ×18: 2 pinned, 8 scrubbed), Lenis, Swup, Three.js | Native smooth scroll with pins and scrubs |

---

## 0. The showcase page itself (gsap.com/showcase)

- Near-black background (`#0E100F`-ish) with an off-white UI. The GSAP wordmark is a heavy, slanted, hand-drawn-feeling logotype.
- It opens on a featured carousel (A24, GSAP Showreel 2025, Illoca, Huy Phan, Revelatio, Graffico Office), then an infinite marquee reading **"SUBMIT YOUR SITE TO THE SHOWCASE ✦"**, then a filterable gallery. Filters are Astro, Portfolio, React, Reduced Motion, SVG Animation, Scroll Animation, Svelte, Text Animation, Three.js, UI Interactions, Vue, WebGL and Webflow.
- Every gallery card lists the GSAP plugins used. **ScrollTrigger, SplitText and CustomEase are almost universal.** Observer, Draggable, Inertia, DrawSVG, MorphSVG, Flip and ScrambleText recur.

---

## 1. A24 Films (Ravi Klaassens)

**Vibe:** A curator's archive, like a boutique Criterion shelf. It is quiet, gallery-white and paper-grainy, and it lets the physical object (a DVD) carry all the colour. The tone is reverent and cinephile, restrained almost to silence.


### Layout and composition
- A **full-viewport stage** with `html/body { overflow: hidden }` and a document height of exactly 900px. Nothing ever scrolls; the wheel is captured and fed into the scene.
- A **fixed HUD sits on the four edges** of the viewport:
  - **Top centre:** a floating nav. It has the "A24" mark, then **Films** (active, with a 3px dot beneath it), **Television** (grey) and **Index ▾**. Before the load completes it reads "A24 · Projecting ◌", with a tiny spinner.
  - **Mid-left:** "A24 Films". **Mid-right:** the current film's year. Both sit exactly on the vertical centre line, 6px from the edges.
  - **Top-left:** a **film spec sheet** styled like a DVD back cover. The title is set large (for example "TONY"). Below it are rows split by 1px black rules: DIRECTED BY / YEAR / STARRING. Labels are left-aligned in tiny tracked caps; values are right-aligned.
  - **Bottom centre:** two press quotes. Each is a ★★★★½ rating, the publication name in micro caps, then the quote in large uppercase serif with curly quotes.
- The **centre is a Three.js canvas**: DVD discs printed with the film's key art, laid on a diagonal arc. The active disc is big and nearly frontal; its neighbours recede to the lower-left and upper-right, larger or cropped by the viewport. Each wheel tick advances one film ("Backrooms, 1 of 12" → "The Brutalist, 6 of 12").

### Typography (three fonts, each with one job)
| Role | Font | Size / LH / Tracking | Notes |
|---|---|---|---|
| Display (H1 "Discover the A24 library of Films") | **PP Eiko** 400 | 120px / 1.0 / **−0.04em** (−4.8px) | High-contrast, razor-thin didone-style serif |
| Loader counter digits | PP Eiko 400 | ~72px / 1.0 / −0.04em | Rolling odometer digits (12 → 50 → 79 → done) |
| Film title | PP Eiko 400 uppercase | 30px / 1.1 / −0.04em | |
| Press quote | PP Eiko 400 uppercase | 21px / 1.1 / −0.04em | Curly “ ” quotes |
| UI / values | **PP Neue Montreal** 500 | 13.5px / 1.4 / −0.025em | Nav, cast names |
| Micro labels | **PP Museum** 400 uppercase | **7.5px** / 1.3 / **+0.2em** (1.5px) | "DIRECTED BY", "THE GUARDIAN" |
| Index list | PP Neue Montreal 500 | 7.5px | 182 instances in a hidden index |

- Tokens follow the Webflow/Osmo "Client-First" pattern: `--_headings---heading-xxl: 160px (10em)`, `xl: 128px`, `l: 96px`, `m: 56px`, `s: 40px`, `xs: 28px`. Every heading is at `letter-spacing: -.04em`; every paragraph is at `-.025em` with line-height `1.4em`.
- The key move is the **contrast of scale.** A 120px hairline serif sits next to 7.5px tracked caps, and almost nothing falls in between.

### Colour
- Background `#F2F2F2` (paper), ink `#000000`, one secondary neutral **`#D6D3D1`** (warm stone) for disabled/secondary states.
- There is no brand colour. **All chroma comes from the film artwork on the discs.**
- A **CSS grain overlay** (`@keyframes grain`) gives the grey background its paper texture. Dimmed media uses `filter: contrast(.75) brightness(.7)`.

### Motion and detailing
- **Intro:** the disc enters **edge-on**, as a thin black sliver spinning on its Y axis, then rotates to face the camera while the loader counter rolls up. The counter uses odometer-style digits: numbers slide vertically in and out of a mask, and you can see this in the "2011 → 2024" year at the right edge.
- **Carousel:** each wheel tick tweens the disc path with a strong ease-out. Mid-motion frames show the discs travelling along the arc and rotating in 3D together. Live GSAP state showed `power3.out` at 0.8s and 0.4s, plus a custom `1-(1-t)^n` ease (Lenis's own).
- **CSS eases in the stylesheet:**
  - `cubic-bezier(0.625, 0.05, 0, 1)`: the "Osmo" snappy ease-in-out, used for 0.2–0.35s UI transforms
  - `cubic-bezier(0.509, 0.188, 0.041, 0.989)`: 0.3s
  - named eases: `--elastic-ease-out`, `--smooth-ease`, `--nav-ease`, with separate `--nav-open-duration` and `--nav-close-duration` (closing is faster than opening)
- **Micro-jitter keyframes:** `btn-film-jitter`, `btn-film-wiggle`, `nav-plate-jitter`, `nav-text-jitter`. They make the UI feel like projected film (gate weave).
- `scroll-next-hint`: a nudge animation telling you to scroll. There's also a "TAP FOR SOUND" toggle and a "00:00 / 00:00" timecode.
- Page transitions use **Barba.js**. It respects `prefers-reduced-motion` and uses a `(hover:hover) and (pointer:fine)` query to gate hover effects.

**Takeaway:** a museum-grade system. It uses one hero object, an edge-anchored HUD, three typefaces with strict roles, and colour borrowed entirely from the content.

---

## 2. Illoca (Unseen Studio)

**Vibe:** An architect's drafting desk. It feels like graph paper, blueprint ink and marginal pencil notes, but rendered in 3D. It's warm, tactile and intelligent: an AI product that deliberately avoids feeling like "AI software". The tagline says it outright: *"architectural → NOT SOFTWARE."*


### Layout and composition
- The **whole page background is graph paper**: a fine beige grid over `#EADFC9`.
- **Corners:** top-left shows **live cursor coordinates** ("X 720.00 / Y 450.00") in handwriting, like a CAD readout. Top-right shows "HELLO@ILLOCA.COM", also handwritten.
- **Nav:** a centred **white rectangular box with a 1px border**, like a title block on a drawing sheet. It holds the logo (a 4-tile icon: lines, house, circle and quarter-circle in blue), Features / Pricing / FAQs in mono, and a **navy "Try for free" button** with an orange icon square.
- **Hero:** a giant 2-line headline, "Design at the / speed of thought". **Handwritten annotations** wrap it: "ARCHITECTURAL" with a pencil underline, and "→ NOT SOFTWARE". Below it sits a full-width 3D render framed in a 24px inset.

### Typography (four fonts)
| Role | Font | Size / LH / Tracking |
|---|---|---|
| Display H1 | **F37 Analog** 500 | **111px / 0.9** (99.9px) / normal |
| Section H2 ("Augmented Sketch") | F37 Analog 400–500 | 72–76.5px / 0.9–1.0 |
| Body / UI | **Graphik Web** 400/500 | 12–27px; tracking **−0.02 to −0.03em**; lh 1.2–1.4 |
| Handwritten notes | **Architect Pro** (+ Architect Pro Symbols for circled numerals) | 18px / 0.9 |
| Labels / nav / cookie | **Geist Mono** 400/500 | 12–13.5px; caps labels +0.05em |

- Headlines are rendered as **per-letter spans** (51 and 85 instances of single "A" nodes), which means SplitText-style character splitting. Nav items and H2s are **duplicated** ("Features Features", "Augmented Sketch Augmented Sketch"), the classic **hover text-roll** where a second copy slides up to replace the first.

### Colour
| Token | Value | Use |
|---|---|---|
| Paper | `#EADFC9` / `#E5D6BC` | Page and grid |
| Cream | `#FDF8F0` | Cards, cookie bar |
| Ink | `#373737` (text), `#5B5B5B`, `#8B8B8B` | Type hierarchy |
| **Blueprint blue** | `#3B60C5` (UI), `#283F7D` (deep) | Logo, buttons, the entire 3D scene |
| Signal orange-red | `#EC633D` | Icon squares, accent |

- The 3D scene is **duotone**: warm grey plus International-Klein-style blue, drawn with a **halftone/stipple shader** and ink outlines. It reads like a risograph print or an engraved illustration, not photoreal CGI.

### Detailing
- **Tiny radii everywhere** (1.5px, 3px, max 4px). It's paper and cardboard, not an app.
- **Hard offset shadows** instead of soft blurs: `drop-shadow(6px 6px 0 rgba(0,0,0,.1))` and `drop-shadow(3px 3px 0 rgba(59,96,197,.2))`, which look like cut paper. Borders are `1px #A19D94`.
- The cookie bar has proper **Accept (blue square ✓) / Reject (red square ✕)** icon-tile buttons, the same icon-in-square language as the CTA.

### Scroll and motion
- **Preloader:** the 4-tile logo **morphs**. The tiles slide and merge into a compact block, likely MorphSVG, which the showcase lists.
- **Scroll is scrubbed to a camera path.** Lenis runs on an inner wrapper (the scrolling element is `.lenis`, not `window`). Over roughly 4,000px of scroll:
  1. The headline scrolls away and the framed render grows to fill the viewport, keeping a 24px margin.
  2. The camera **dollies in**: past the woman at the desk, over her shoulder, down onto the floor plan she's sketching.
  3. The frame **slides right to occupy ⅔**, and the left ⅓ reveals feature 1. It shows a circled "①", a handwritten "INTENTS, TRANSLATED!", the H2 "Augmented Sketch", a Graphik paragraph, a "▶ Watch the demo" button, and a handwritten "↖ EXPLORE FEATURES".
  4. The camera keeps moving across the desk (plan → axonometric sketch) as features 2–5 swap in: Adaptive Massing, Prompted Plans, Agentic Refinement, Instant Facades.
- Scrolling is smooth and heavy: Lenis's default lerp gives the camera about 0.5s of inertia.

**Takeaway:** a physical-world metaphor, carried all the way through fonts (handwriting), background (graph paper), shadows (paper cut-outs) and 3D shading (halftone ink). The scroll works as a camera move, not a list of sections.

---

## 3. Huy Phan Portfolio (Huy Phan & Chien Pham)

**Vibe:** Personal, cheeky and editorial. A cartoon self-portrait pushes a wall open to reveal a bright red flared-serif name, then drops you into a high-fashion 3D project index. It's confident and award-hungry: every project lists its Awwwards and FWA wins.


### Intro sequence (about 8s)
1. Pure black.
2. A **cartoon Huy** appears: B/W line art with a halftone-dot floral shirt, cap and Nike Cortez. He is **pushing a black wall to the right**, and the white area grows behind him.
3. The wall slides further, revealing **"HUY / PHAN" in red `#FF4949`**, a flared, Tuscan-ish display serif, with the character walking across it.
4. The character exits and the name holds.
5. The **white panel then wipes downward** like a stage curtain, uncovering the grey work index underneath. The mid-state shows the name cut in half by the panel edge.

### Layout (index)
- Background `#ECECEC`, ink `#1E1E1E`.
- **Top-left:** a vertical **"HUYML©"** logotype (rotated 90°) with a small cartoon-avatar stamp and micro text: "copyright 2026 / hcmc, vn / +84".
- **Menu:** stacked "→ WORK / ABOUT / PLAYGROUND / CONTACT", about 23px, tight leading, with an arrow marking the current item.
- **Top bar micro-UI:** "Menu", "Audio Off —", "Working globally · HCMC, 23:58" (a **live clock**), and "For inquiries hello@huyml.co" (underlined).
- **Centre:** a WebGL **ribbon of project images** that **bends through 3D space**. Cards fan from the top-right, curve through a flat centre where the active card sits, and continue toward the bottom-left in a perspective stack. Think of a deck of cards pouring along an S-curve.
- **Right column:** a centred list of all 19 projects. Each item has a category (small grey), a NAME (display serif caps), a "—", then a two-line description. **Only the active item is at full opacity**; the rest sit at about 25%.
- **Far-right edge:** **three small colour swatches** per project (for example orange / grey / white), showing that project's palette.
- **Left column:** a meta table (Role, Launch, Recognition) that **blurs out (`blur(12px)`) and back in** as the project changes.
- **Bottom-left:** "Selected work" plus a giant **"06" / "13"** counter with a **glass/liquid refraction** effect on the digits, next to "/19". **Bottom-right:** "'25 showreel ▶". **Far-left:** "Scroll".

### Typography
| Role | Font | Size / LH / Tracking |
|---|---|---|
| Name reveal | **BT Glyphius** 400 uppercase | **220px / 0.96 / −0.05em** (−11px) |
| Big counter | **BT Grotesk** 400 | 180px / 0.85 / −0.04em |
| Menu / section heads | BT Glyphius | 19–23px / 1.0 / +0.01em |
| Project names | BT Glyphius | 16px / 1.0 / +0.01em |
| Meta / body | BT Grotesk Medium 500 | **10px** / 1.3 / +0.01em |
| Credits | F37 Bolton | 10px / 1.3 / −0.01em |

### Colour and effects
- Neutrals: `#ECECEC` / `#1E1E1E` / `rgba(31,31,31,.52)` for muted text. Signal red is `#FF4949`, used only for the name. Project colours come from the images and swatches.
- **`mix-blend-mode: difference` on 16 elements**, so fixed nav text inverts over images. `backdrop-filter: blur(17px)` panels. Cards have an **8px radius** (57 instances) and a `1px #1E1E1E` border.
- Media queries are cut at 1100 / 1200 / 1440 / 1800 / 1920 / 2400px, so type is tuned per breakpoint.

### Motion
- The wheel is captured (`scrollY` stays 0) and each tick advances the ribbon. The whole deck **flows along the curve**, and the incoming card rotates flat as it reaches centre.
- The list re-focuses and the meta table blur-crossfades.
- The counter digits roll with a refractive distortion.
- The logo avatar stamp swaps to a hover state.

**Takeaway:** a personality-driven intro (mascot plus wall-push) followed by a **"one thing in focus, everything else dimmed/blurred"** index. The live clock, audio toggle and swatches are the small details that make it feel like an instrument.

---

## 4. Revelatio Studio

**Vibe:** Swiss-minimal and technical: black and white, a single grotesk, hacker texture (ASCII, scrambled glyphs), and very calm confidence. It feels like a design consultancy that also ships code, and the ASCII motifs signal that.


### Stack detail
Webflow, jQuery, GSAP 3.15 (ScrollTrigger, **SplitText, ScrambleTextPlugin, Observer**) and Lenis. There are about 15 hand-written modules, and their names are a feature list: `page-transition.js`, `color-inversion.js`, `circle-cursor.js`, `scramble-cursor.js`, `scramble-text.js`, `brazil-time.js`, `ascii-logo-footer.js`, `preloader.js`, `locations-highlight.js`, `image-trail.js`, `testimonials.js`, `drag-marquee.js`.

### Typography (one font only)
**Neue Haas Grotesk Text Pro 55 Roman, weight 400, nothing else.** Hierarchy comes purely from size, opacity and tracking:

| Role | Size / LH / Tracking |
|---|---|
| Stat counters | **180px / 1.0 / −0.04em** |
| City list | 72px / 1.2 / −0.03em |
| H1 / statements | 36px / 1.1–1.18 / −0.03em |
| Stat labels ("+30") | 27px / 1.5 |
| Capabilities list | 21px / 1.3 / −0.03em |
| Card titles | 15px / 1.3 / −0.02em |
| Meta / nav | 10.5–13.5px / −0.03em |

### Colour: pure B/W with an alpha scale
```
--color--neutral--light: #fff;  --color--neutral--dark: #000;
white alphas: #ffffff0a (4%) · 14 (8%) · 29 (16%) · 52 (32%) · a3 (64%)
black alphas: #0000000a (4%) · 14 (8%) · 29 (16%) · 52 (32%) · a3 (64%)
theme tokens: --tbg / --tfg / --tfg-60 / --tfg-40 / --tline / --tt
```
The only colour on the page comes from project imagery and the red Awwwards SOTD ribbon.

### Layout and motion
- **Preloader:** black. A tiny logo mark sits centre, "Branding, Product Design & Code" sits left and "Recife, Brazil / Working Globally" sits right. Both side texts **scramble in**: random glyphs `!^%=#@$` resolve left to right into the real words (ScrambleText).
- **Hero:** the H1 "Branding, Product Design & Code. One integrated vision." scrambles in at 36px, top-left. Below it, a **team video rendered as coloured ASCII characters** on a canvas. Each "pixel" is a tiny glyph tinted with the video colour, so it looks like a warm-dark mosaic. As you scroll, it expands from inset to full-bleed.
- **Nav:** a small grouped pill top-left (logo + Work / Approach / About / Careers) on `rgba(255,255,255,.16)` with `backdrop-filter: blur(12px)`. Top-right has "EN / PT" and "Get in touch". **Radius is 2.6–4px**: tight, not pill-shaped.
- **Custom cursor:** `cursor: none`, replaced by a **white dot with `mix-blend-mode: difference`** (61 elements use difference). A second **scramble-cursor** label appears over interactive items.
- **Colour inversion on scroll:** sections flip the page from **black→white→black** as they enter (by swapping `--tbg`/`--tfg`). The work grid and capabilities are white; hero, cities and clients are black. The flip is a crossfade tied to a ScrollTrigger.
- **Work grid:** one 2/3-width feature card plus a 1/3 column. Filter chips (Branding / Website / Product / Code) are fully rounded (`1199px` radius) with a 4% fill.
- **Capabilities:** a 3-column typographic list at 21px with 16px small-caps headings. It's pure type, with no icons.
- **Cities:** a 72px paragraph of cities. **One word at a time lights up** (white) while the rest stay at about 10% grey, scrubbed by scroll. Words behind the active one fade back to about 30%.
- **Stats:** "Since 2019", "Projects +30". **Odometer counters at 180px**: the digits 0–9 are stacked in a column and translated vertically, so you see the reel roll ("1617…").
- **Clients:** a 5×4 grid of `#0A0A0A` tiles with white logos.
- **Footer:** a huge **"revelatio studio" wordmark built from random ASCII characters**, with a "Click to interact" hint that re-randomises and scrambles it. Below that sit Location, a sitemap and socials in 12px.
- **Easing vocabulary:**
  - `cubic-bezier(0.65, 0, 0.35, 1)` (easeInOutCubic) at 0.7s for opacity/visibility
  - `cubic-bezier(0.22, 1, 0.36, 1)` (easeOutQuint) at 0.48s for transforms
  - `cubic-bezier(0.625, 0.05, 0, 1)` at 0.4s for UI
  - `cubic-bezier(0.625, 0, 0.875, 0)` at 0.8s: **a dedicated exit ease** (fast accelerate out)

**Takeaway:** discipline. One font at one weight, black and white, and the "code" identity is expressed through **text effects** (scramble, ASCII video, ASCII wordmark) instead of colour.

---

## 5. Graffico Office (Graffico Studio)

**Vibe:** Cozy, retro and playful. It's a warm 1970s office at golden hour that you can literally walk around. It's less a website than a small game and a love letter to the studio.


### What it is
A first-person **WebGL office** (React Three Fiber) modelled in Blender with **baked lighting**. You get soft, pre-computed sunlight through venetian blinds, bookshelves, twin workstations, a radio and a lounge.
- **WASD** to walk (arrow keys work too), **mouse** to look, **Shift** to go faster, **E** to interact with highlighted objects, **Esc** to release the cursor.
- **Interactions:**
  - tune a **radio that streams real stations**
  - **write HTML/CSS on a monitor that renders live**
  - read the project board and the awards shelf
  - sit in the lounge
  - **pull the plug from the wall socket** (a blackout Easter egg)

### Typography
| Role | Font | Size |
|---|---|---|
| Title "Graffico Office" | **Shrikhand** 400 (heavy, bouncy, 70s italic display) | 36px / 1.25 |
| UI | **Work Sans** (variable 100–900) | 15–16px / 1.5–1.6 |
| Section label "CONTROLS" | Work Sans 700 uppercase | 11px / +0.1em |
| CTA "ENTER THE OFFICE →" | Work Sans 700 uppercase | 14px / **+0.1em** |
| Keycaps (W A S D, Shift, E, Esc) | Work Sans 700 | 13.5px / +0.05em |

### Colour
| Token | Value |
|---|---|
| `--color-seppia-black` (background) | `#040F0F` (very dark teal-black) |
| `--color-almond-cream` (foreground) | `#E7D7C1` |
| Gold (the "E" interact key) | `#D4AF37` |
| CTA red | ≈ `#B8412E` at 90% alpha, 1px `#C0392B` border |

- The controls card is almond cream at 5% fill, with a 45% almond border, a **16px radius** and `backdrop-filter: blur(2px)` over the dimmed 3D scene. Keycaps have a **6px radius** and a 1px almond border.

### Motion
- **Loader:** the title plus a thin red progress line and "LOADING THE OFFICE …%" **crossfade** into the controls card. `@keyframes gf-rise-in` handles the staggered rise of the rows. `gf-turn-phone` prompts mobile users to rotate.
- The scene behind the overlay is live, so the dim veil lifts when you enter.
- It respects `prefers-reduced-motion`.

**Takeaway:** when the product is a studio, **let people inhabit it.** The UI is minimal and warm, and the interactivity carries the brand.

---

## 6. Dkton, Dominik Kostolnik (sound designer)

**Vibe:** LOUD. It's a film sound designer's site that behaves like a mixing desk. Black, hot yellow, huge italic condensed caps, and the whole page **dances to audio**. The German/Austrian copy is witty ("Sei kein Ungustl", roughly "don't be a grump"). It's high-energy, bold and fun.


### Flow
1. **Gate:** black screen with "DOMINIK / KOSTOLNIK" in giant yellow italic caps. The two lines **overlap**, and the second carries a black outline stroke to separate them. A yellow "FILMTON & SOUNDDESIGN" sticker sits between the lines. Behind it, **7 dim brown pills** idle, and an **"ENTER THE EXPERIENCE"** button sits in **corner-bracket crop marks** (like a camera viewfinder). The click unlocks audio (Howler.js) and releases Lenis (`lenis-stopped` → running).
2. **Hero:** a radial warm glow (dark brown → black). The **7 pills become a live equalizer**: gradient capsules (`#FFB800` → orange → cream `#FBE3B8` → red-orange `#F04A1A`), each scaling in height to the audio. **Musical notes float up** as particles. H1: "AUS GESCHICHTEN / WERDEN KLANGWELTEN" in white italic 900, overlapping lines, with a yellow sticker subtitle "FÜR FILM, WERBUNG & ANIMATION".
3. **About:** "[ über mich ]" in yellow Geist Mono. Then a 64px centred paragraph whose **letters fill in scroll-scrubbed**: dark grey → yellow gradient → white, sweeping left to right. The first letter of every word goes yellow first, and "GEHÖRT" ends highlighted yellow.
4. **Services:** three full-width rows (ORIGINALTON / SOUNDDESIGN / MISCHUNG), each 190px italic. As you scroll, a **solid colour block (purple `#A67EFF`, red `#FF4337`) wipes across the row**, and the text inside the block turns dark (a clip-path duplicate). A "−∞" **dB-meter** label rides the wipe edge.
5. **Showreel:** a giant yellow "SHOWREEL" with the **pills rising like EQ columns** from the bottom. They then merge into a full-bleed video. A cursor-follow yellow tag reads "SHOWREEL ANSEHEN", and "KLICKEN — MIT TON" sits beneath.
6. **Projects:**
   - A sticky left credits column (Produktion / Regie / DoP / Kunde as small yellow tag chips, with values in 32px condensed).
   - A video card on the right with "Sounddesign · Mischung" mono pills.
   - A **giant yellow italic project title** underneath ("TGW WERX").
   - Then a list of rows: title left (64px italic), client centre, service pills right, 1px 20%-white dividers. Hover shows a "PROJEKT ANSEHEN" yellow tag.

### Nav
- **Centre:** a **segmented control**. A logo tile, then INTRO / LEISTUNGEN / PROJEKTE / FAQ in dark rounded tiles. The **active section gets a solid yellow fill**, and **thin progress bars under each segment** show scroll progress through that section.
- **Left:** a square sound toggle with a mini animated waveform. **Right:** "KONTAKT" in corner brackets.
- **Cursor:** a custom SVG **ring cursor** (white stroke with a 50% black outer stroke).

### Typography
| Role | Font | Size / LH / Tracking |
|---|---|---|
| Mega display | **GT Walsheim Condensed** 900 *italic* uppercase | **228px / 0.8** / −0.017em |
| Section display | same | 190px / 0.7–0.8 / −0.02 to −0.03em |
| H1 | same | 134px / 1.0 / −0.02em |
| Statements | GT Walsheim Condensed 700 | 64px / 0.96–1.0 |
| Credits / values | 700 | 32px / 1.0 / −0.01em |
| Labels "[ über mich ]" | **Geist Mono 300** | 20px / 1.2 |
| Tags / pills | Geist Mono 300 | 14px |
| Buttons | Condensed 700 uppercase | 12–13px / **+0.14em** |

- The token system is **fluid `clamp()` everywhere** (Lumos/Osmo Webflow framework). For example, `--_typography---font-size--display: clamp(4rem, …, 12rem)`, and `--site--margin` runs 1rem→2.5rem. Line heights are `.8 / 1 / 1.2 / 1.4`, and tracking is `-.02em` tight.

### Colour
`#000` bg · `#FFF` text · **brand `#FFB800`** (with 10% and 30% alphas for fills) · purple `#A67EFF` · red `#FF4337` · dark `#2F2B2D` · warm glow `rgba(28,22,10,.82)`.

### Motion vocabulary
- CSS: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) from 340ms to **1.2s** for colour and width changes. `cubic-bezier(0.625, 0.05, 0, 1)` handles grid-row accordions (FAQ).
- GSAP: `elastic.out(1, 0.55)` (bouncy pills) and `sine.inOut` 4s idle loops.
- Keyframes: `dkton-button-sweep`, `dk-eq`, `dkCore`, `dkRing`, `dkShard`, `flareSweep`, `glowNoise`, `lensBreath`, `dkw-drift`. These are **lens-flare and glow atmospherics** layered on top of the content.

**Takeaway:** the subject (sound) *is* the interaction model. The equalizer pills are the logo, loader, hero, section transition and video mask all at once, a single motif re-used five ways.

---

## 7. Door Dennis (Dennis Janssen)

**Vibe:** A friendly, polished Dutch web studio. It pairs airy frosted-glass calm with fashion-mag serif headlines and a visible design grid. It's professional but warm, a "partner" rather than an "agency".


### Layout and detailing
- A **visible 8-column grid** runs the full page length as **1px vertical lines at `rgba(25,25,25,.2)`**. Content snaps to the lines, and images, captions and cards visibly align to them. It's the "blueprint showing" effect.
- **Hero background: reeded / fluted glass.** Vertical strips refract a blurred blue-white gradient, like looking through a shower-glass panel. It recurs at the section breaks and the closing CTA.
- A **3D chrome "DD" monogram** (Three.js) rotates in the hero. Further down it turns **frosted and translucent** and drifts behind the grid as a parallax object.
- **Nav:** individual **pill buttons** (HOME / ABOUT / WERK³⁴ / SERVICES / CONTACT) in Roboto Mono caps, with a 1px `#191919` border, a **9.5px radius** and a **hard offset shadow**. The active item is an orange outline. "WERK" has a superscript project count ("34"). A black square hamburger sits far right.
- **CTA pattern:** a small light square with a ↗ arrow, attached to a solid **orange `#FF5F37`** pill labelled in mono caps ("LATEN WE KENNISMAKEN!", "BEKIJK ALLE PROJECTEN").
- **"Laatste werk" card** (bottom-right of the hero): a photo in a 1px bordered card, with mono captions "SCÉNE14 / AUGUST 2026".
- **Marquee:** a black band of services (Online uitstraling · Shopify webshops · SEO · …) separated by dots, in Inter caps.
- **Scramble line:** "JB_VTH@>-AW BVW,= ^^DMKX,$" decodes into text as it enters.
- **Expertises:** tabs (Development / Ontwerp / Strategie) as bordered pills, with the active tab filled black. Numbered cards read "01. MAATWERK WEBSITES", with the number in orange mono and 1px borders.

### Typography
| Role | Font | Size / LH / Tracking |
|---|---|---|
| H1 / display | **Instrument Serif** 400 uppercase, with *italic* for emphasis ("*CREATIEVE PARTNER*") | 66.7px / 1.2 |
| Statements | Instrument Serif 400 | 38px / 1.3–1.4 / −0.03em |
| Body | **Inter** 400 | 17px / **1.78** (very airy) |
| UI / captions | **Roboto Mono** uppercase | 13.3–15.2px, some at **−4%** tracking |

- Instrument Serif is condensed, so the uppercase H1 reads like a fashion-magazine masthead. Switching single words to italic is the signature move.

### Colour
`#F0F0F0` bg · `#191919` ink · **`#FF5F37` orange** (CTAs, active state, numbering) · `#C7D5EF` pale blue (the glass glow) · white cards `#F9F9F9`.

### Scroll and motion
- **18 ScrollTriggers: 2 pinned, 8 scrubbed** (`scrub: 0.8` and `scrub: 1`, so there's a slight lag).
- Project images arrive with **clip-path reveals** at **1.9s** using `cubic-bezier(0, 0.55, 0.45, 1)` (easeOutCirc). They are staggered across grid columns, with parallax at different speeds.
- Other eases:
  - `cubic-bezier(0.83, 0, 0.17, 1)` (easeInOutQuint) at 0.6s with 0.15s and 0.3s delays: the **menu stagger**
  - `cubic-bezier(0.68, -0.6, 0.32, 1.6)` (back in-out, overshoot) for playful button pops
  - `cubic-bezier(0.22, 1, 0.36, 1)` for text rises
- **Swup** handles page transitions. Hammer.js adds touch gestures. A `blurblink` keyframe runs on loading states.

**Takeaway:** the visible grid, the fluted glass and the chrome 3D mark give an ordinary service site a premium, crafted surface without hurting readability.

---

## 8. Cross-site patterns (what the best GSAP sites have in common)

### Stack
- **Lenis is everywhere** (6 of 7). Smooth, inertial scroll is table stakes, and GSAP's ticker usually drives Lenis's `raf`.
- **GSAP + ScrollTrigger + SplitText + CustomEase** is the default kit. ScrambleText, Observer and MorphSVG add flavour.
- **Webflow** (Revelatio, Dkton, and A24's Client-First-style tokens) is very common. Custom JS is dropped in as small named modules (`color-inversion.js`, `scramble-cursor.js`…).
- **Three.js appears on 5 of 7 sites**, but mostly as a single hero object or scene, not everywhere.
- **Page transitions:** Barba (A24), Swup (Door Dennis), custom (Revelatio).

### Scroll models (pick one deliberately)
1. **Hijacked stage** (A24, Huy Phan): `overflow:hidden`, with the wheel stepping an index. Best for catalogues where the content *is* the object.
2. **Camera-path scrub** (Illoca): scroll = timeline position of a 3D camera.
3. **Native smooth scroll + triggered set-pieces** (Revelatio, Dkton, Door Dennis): normal documents punctuated by pins, scrubs and inversions.
4. **No scroll / game** (Graffico): WASD with pointer lock.

### Typography rules they share
- **Extreme scale contrast.** Display type runs 110–230px; UI type runs 7.5–13px. The middle sizes are almost empty.
- **Tight negative tracking on display** (−0.03 to −0.05em) and **positive tracking on tiny caps** (+0.1 to +0.2em).
- **Display line-height ≤ 1.0** (0.7–1.0); body line-height is 1.4–1.8.
- **Strict role-per-font** (usually 2–3 families):
  - a display face with character (Eiko, Glyphius, F37 Analog, Instrument Serif, GT Walsheim Condensed Italic, Shrikhand)
  - a neutral grotesk (Neue Montreal, Graphik, Neue Haas, Inter, Work Sans)
  - **a mono for labels and meta** (Geist Mono, Roboto Mono)
- **Revelatio proves you can do it all with one font at one weight.**
- Text is almost always split into characters or words (SplitText) for staggered reveals, and nav labels are **duplicated for hover text-rolls**.

### Colour rules
- The palette is mostly **one neutral pair plus one signal colour**: A24 has none, Illoca uses blue, Huy uses red, Dkton yellow, Door Dennis orange, and Graffico gold with red.
- **Colour often comes from content** (A24 disc art, Huy's project swatches, Revelatio's project imagery).
- **Alpha scales instead of grey scales** (Revelatio's 4/8/16/32/64% steps; Dkton's 7%/20% white).
- **`mix-blend-mode: difference`** keeps fixed UI legible over imagery (Huy ×16, Revelatio ×61).

### Motion signatures worth stealing
| Effect | Seen on | How |
|---|---|---|
| Odometer / rolling digits | A24 loader and year, Huy counter, Revelatio stats | A 0–9 column per digit, `yPercent` tween, overflow-hidden mask |
| Scramble / decode text | Revelatio (loader, H1, cursor, footer), Door Dennis | GSAP ScrambleTextPlugin, chars `"!^%=#@$"` |
| Word-by-word scroll highlight | Revelatio cities, Dkton per-letter fill | SplitText words/chars + scrubbed `opacity`/`color` stagger |
| Colour wipe with inverted text | Dkton services | A duplicate text layer inside a clip-path block; scrub `clipPath`/`scaleX` |
| Theme inversion on section enter | Revelatio | ScrollTrigger `onEnter`/`onLeaveBack` swaps CSS vars `--bg`/`--fg` |
| Focus + blur/dim the rest | Huy index | Active item opacity 1, others ~0.25; meta `filter: blur(12px)` crossfade |
| Hover text roll | Illoca, A24 nav, most sites | Two stacked copies; `yPercent: -100` on hover |
| Hard offset shadow / tiny radii | Illoca, Door Dennis | `drop-shadow(6px 6px 0 rgba(0,0,0,.1))`, 1.5–4px radius |
| Corner-bracket (viewfinder) buttons | Dkton | Four L-shaped pseudo-elements |
| Live micro-data in the HUD | Illoca (cursor XY), Huy (local clock), Revelatio (Brazil time), A24 (timecode) | Small text updated per frame or per minute |
| Grain / film jitter | A24 | `@keyframes grain` on a noise overlay; 1–2px jitter keyframes |
| Visible grid lines | Door Dennis | Fixed 1px column rules at 20% ink |

### Easing cheat-sheet (collected from the stylesheets)
```css
--ease-osmo:        cubic-bezier(0.625, 0.05, 0, 1);    /* A24, Revelatio, Dkton: snappy UI in-out */
--ease-out-expo:    cubic-bezier(0.16, 1, 0.3, 1);      /* Dkton: long luxurious settles (340ms-1.2s) */
--ease-out-quint:   cubic-bezier(0.22, 1, 0.36, 1);     /* Revelatio, Door Dennis: text rises */
--ease-in-out-cubic:cubic-bezier(0.65, 0, 0.35, 1);     /* Revelatio: fades 0.7s */
--ease-in-out-quint:cubic-bezier(0.83, 0, 0.17, 1);     /* Door Dennis: menu stagger */
--ease-out-circ:    cubic-bezier(0, 0.55, 0.45, 1);     /* Door Dennis: 1.9s clip-path image reveals */
--ease-exit:        cubic-bezier(0.625, 0, 0.875, 0);   /* Revelatio: fast accelerate-out exits */
--ease-a24:         cubic-bezier(0.509, 0.188, 0.041, 0.989);
--ease-back-pop:    cubic-bezier(0.68, -0.6, 0.32, 1.6);/* Door Dennis: playful overshoot */
/* GSAP: power3.out (0.4-0.8s), expo.out, elastic.out(1, 0.55), sine.inOut (4s idle loops) */
```
Durations cluster at **0.2–0.4s for UI**, **0.6–0.8s for content reveals**, and **1.2–1.9s for hero and image reveals**. Exits are faster than entrances (A24 nav close vs open; Revelatio's dedicated exit curve).

### Tone and vibe matrix
| Site | Temperature | Energy | Personality |
|---|---|---|---|
| A24 | Cool-neutral, paper grey | Very low | Curatorial, reverent |
| Illoca | Warm beige + blueprint blue | Low–medium | Thoughtful, crafted, "human not software" |
| Huy Phan | Neutral grey + red | Medium–high | Cheeky, personal, award-proud |
| Revelatio | Pure B/W | Low (but glitchy) | Swiss, technical, confident |
| Graffico | Warm sepia, dark | Low, cozy | Playful, inviting, game-like |
| Dkton | Black + hot yellow | **Very high** | Loud, fun, musical |
| Door Dennis | Light grey + orange + glass blue | Medium | Friendly, polished, trustworthy |

---

## 9. If you're applying this to a portfolio

1. **Pick one scroll model** (§8) and commit. Don't mix a hijacked stage with long native sections.
2. **Pick one motif and reuse it everywhere.** Dkton's pills and Illoca's handwriting/graph paper are the best examples: one idea as loader, hero, transitions and details.
3. **Use 2 fonts plus a mono.** Set display ≥110px with −0.04em tracking and ≤1.0 line-height; set labels at 10–13px in mono or tracked caps.
4. **Use one signal colour on a neutral pair.** Let the work supply the rest.
5. **Build these micro-details** (cheap, high perceived craft): a live clock or coordinates, odometer counters, hover text-rolls, a scramble on the first headline, a difference-blend cursor, and a project count in superscript on the nav.
6. **Make exits faster than entrances.** Use `0.625,0.05,0,1` for UI and expo-out for big settles.
7. **Always ship `prefers-reduced-motion`.** A24, Graffico and Dkton all do.

---

*Caveats:*
- *GSAP inside bundled apps (Illoca's Nuxt, Huy's Framer, Graffico's Next) isn't exposed on `window`, so its plugin use is taken from the showcase tags rather than confirmed live.*
- *Graffico's pointer-lock walk couldn't fully engage in an automated browser. The overlay and movement were observed; the in-world interactions are described from the site's own copy.*
- *Cookie banners were left unanswered. Sites were observed without accepting tracking.*

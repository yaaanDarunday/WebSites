# Fresh study: fullstack (dark developer portfolio)

**Date:** 2026-10-02 · **Viewport:** 1440×900, DPR 1 · **Source:** gsap.com/showcase (495 cards harvested earlier the same day, 472 after the ledger and that run's screened sites were removed)
**Why these sites:** a seeded random shortlist of 8, 6 carrying non-default plugins. Dropped: Adrien Lamy (timed out), Nature Beyond Technology (never left its WebGL loader headless), Osmo (its arc-fanned card strip was borrowed by the previous build), TheFinch and TKS (a generic agency hero and a video hero). The three kept:
- **Pablo Míguez**: a black developer portfolio with a dithered portrait field, a curved role marquee, a character-fill statement and a pinned horizontal card track.
- **Debabrata Giri**: a pale desktop "OS" with no page scroll, draggable windows and a command bar.
- **Alphane Labs**: a light lab-equipment site with an outlined bubble field and an isometric line drawing that turns as you scroll inside a rounded inset panel.

| # | Site | Built by | Plugins (card) | Stack observed | Scroll model |
|---|---|---|---|---|---|
| 1 | https://www.pablomiguez.dev/ | Pablo Míguez | ScrollTrigger, ScrollSmoother, Observer, SplitText | Next.js (Turbopack chunks), `html.lenis`, 2 canvases, GSAP bundled | Lenis: 250ms after a 750px tick scrollY = 722 (96%), settled 750. One pinned horizontal card track *(inferred from mid/settled frames)* |
| 2 | https://debabratagiri.vercel.app/ | Debabrata Giri | DrawSVG, Draggable, Inertia | Next/Vercel, 1 canvas, 41 SVGs, GSAP bundled | **No page scroll**: docHeight 900, wheel 750 → scrollY 0. Navigation opens windows |
| 3 | https://solutions.alphanelabs.com/ | n/a | ScrollTrigger, DrawSVG, SplitText | `html.lenis lenis-smooth`, 35 circle/path nodes, GSAP bundled | Lenis: 250ms after a tick scrollY = 431 (57%), settled 749. A pinned panel scrubs a turning isometric drawing *(inferred)* |

## 1. Pablo Míguez
**Vibe:** a cold, confident creative-developer portfolio at night. A black-and-white dithered portrait sits under huge letters, then cream and charcoal cards slide sideways like a deck being dealt. Pink appears only as tiny separator dots.

### Layout and composition
- The hero is a full-bleed `#0a0a0a` page with a dithered (ordered-dot) field behind a cut-out portrait. Wordmark top-left at 18px, "Menú ☰" top-right at 28px.
- The bottom of the hero is a **curved role marquee** ("Frontend · Motion · Creative · Developer") at ≈115px, bent around a cylinder: the outer words shrink and skew away *(inferred from the hero frame)*. Separators are `#f880c8` dots.
- The statement section is 6 lines of 68.8px uppercase across the full width.
- The **card track** holds cards of ≈600px wide × full-height minus header, with 16px gaps, **alternating cream `#fefaee` and charcoal `#1f1f1f`**. Each card has an index ("02") at 32px, a title at 72px / −0.06em, body at 22.8px, and a "+" bottom-left.
- An 80px circular "SCROLL" cursor follows the pointer over the track.

### Typography
| Role | Font | Size / LH / tracking | Notes |
|---|---|---|---|
| Display | Science Gothic 700 | 198.7px / 0.8 / −0.04em, uppercase | hero letters |
| Statement | Science Gothic 600 | 68.8px / 1.25 / −0.03em, uppercase | character fill |
| Card title | Inter 600 | 72px / 1.0 / −0.06em | "Desarrollo a medida" |
| Marquee | Inter 500 | 115.2px / 0.85 / −0.05em | role words |
| Body | Inter 400 | 22.8px / 1.4 / −0.042em | card copy |
| Labels | Inter 400–600 | 14–17.6px, uppercase at +0.03em | nav, "Formación" |

### Colour
`--color-bg-dark #0a0a0a`, `--color-neutral-100 #fefaee` (cream), `--color-neutral-800 #131313`, `--color-neutral-700 #1f1f1f`, `--color-primary #818180`, `--color-glass-dark rgba(255,255,255,.08)`, `--color-accent #f880c8` (25 small backgrounds, the dots only). Statement text before it fills is a dim grey (`rgba(50,50,50,.4)` ×22 measured).

### Motion
- Lenis, 96% of a tick covered at 250ms.
- `--cubic-default cubic-bezier(.65,.05,0,1)` ×12 with `--duration-default .735s`, and `--ease-out-expo cubic-bezier(.16,1,.3,1)`. Durations: 0.3s ×24, 0.4s ×13, 0.5s ×5. Keyframe `scroll` runs 40s (the marquee).
- **Character fill:** the 68.8px statement lights up letter by letter from dim grey to white as it scrolls through (set1 caught the front mid-word: "DIFEREN|CIA").
- **Pinned horizontal track:** vertical scroll slides the cards left about 600px per tick (set3 → mid5).
- A `difference` blend appears on the cursor.

### The one thing to steal
**A character-fill statement.** One huge uppercase paragraph sits dim. As it scrolls through the viewport, a lit front sweeps across it letter by letter (dim grey to cream), scrubbed to scroll. Reading position and scroll position become the same thing.

## 2. Debabrata Giri
**Vibe:** a quiet, warm-grey desktop OS ("DEBLUN OS v0.1.0") set entirely in mono. It's playful but restrained, a portfolio you operate rather than scroll.

### Layout and composition
- A 190px left sidebar (projects, terminal, notes, playground, resume, skills, settings) and a top bar with the path "/home" plus a live clock ("2:26:23 PM Fri Oct 02 2026"). A bottom bar holds social icons and a **command field** reading ">> type for search and ENTER...".
- The main pane holds "Hello, I'm Debabrata Giri" (36px) with skill chips and a compass/orbit SVG at the right (N/E/S/W ticks, concentric rings, a moving dot).
- Opening "projects" spawns a ≈670×515 window with macOS traffic lights (`#ff5f57`, `#febc2e`, `#28c840`), a title "/projects", a grid of grayscale project thumbs and a resize grip.

### Typography
Source Code Pro 500 throughout: 36px / 45px (name), 24px (Hello), 16px (nav, wordmark at +0.4px), 14px (body, chips), 12px (meta), 7px (compass letters).

### Colour
`--color-primary #0a0a0a`, `--color-secondary #f4f3ef`, `--color-accent #22c55e`, `--color-line #0a0a0a29`. Glass panels `oklab(0.96 … / 0.8)`.

### Motion
- No scroll. Sidebar clicks open windows that can be dragged and thrown (Draggable + Inertia on the card). The compass SVG strokes are drawn (DrawSVG on the card).

### The one thing to steal
**A command bar.** A persistent input lets you type a destination ("projects", "resume") and press Enter to open it. Navigation works for keyboard-first people.

## 3. Alphane Labs
**Vibe:** clean, bright lab science. White and pale sky blue, vivid cyan line drawings and one lime button. Precise and friendly, like an instrument manual.

### Layout and composition
- A 38px page inset holds a **rounded panel** (≈24px radius, `#f3f8fe`) that carries each set piece. The nav sits above it (Aeonik 23px, a lime "Contact us" pill).
- The hero is outlined circles and metaballs (stroke `#0094d3`, fill white or `#9dd2ff` tints) behind a centred 53px headline.
- Second panel: an **isometric line drawing** of the MGA-1 instrument (all strokes `#0094d3`, blueprint fills) that **turns from front view to three-quarter view** as you scroll (set2 → mid4), while its title fades in above.

### Typography
| Role | Font | Size / LH | Notes |
|---|---|---|---|
| Headline | Aeonik 500 | 53.3px / 1.0 | centred |
| Sub | Aeonik 500 | 37.3px / 1.0 | "Introducing the MGA-1" |
| Numbers | Aeonik Mono 500 | 32px / 40px | `18"`, `12"` dimensions |
| Eyebrow | Aeonik Mono 500 | 18px / +1.8px, uppercase | "OUR SOLUTIONS" in `#0094d3` |
| Body | Aeonik 400–500 | 16–21.9px | |

### Colour
`--color-dark #050505`, `--color-light #fff`, `--color-brand-light-blue #f3f8fe`, `--color-brand-vivid-blue #0094d3`, `--color-brand-line-green #8fd356`, `--color-brand-light-sky-blue #9dd2ff`. Strokes measured: `#050505` ×6, `#0094d3` ×5, `#8fd356` ×2, `#2d2f33`, `#ff7d38` ×1. Each stroke colour labels a part of the drawing.

### Motion
- Lenis with a softer lerp: 57% of a tick covered at 250ms.
- A pinned panel where the line drawing turns with scroll and its heading fades in from 0 *(inferred from mid4)*.

### The one thing to steal
**A scrubbed isometric line drawing in an inset panel.** A product is drawn only in strokes, with colour coding its parts. Pinned inside a rounded panel, it turns and comes apart as you scroll, so the explanation happens in the drawing itself.

## 4. Across these sites
- **Shared, and absent from the ledger:** all three are about *making* things (code, OS, instruments), and they explain by showing the thing working: a lit reading front, a window opening, a drawing turning. Chroma is either absent (Giri), confined to dots (Pablo), or used to code parts of a drawing (Alphane). None uses a signal colour for chrome.
- **Vibe matrix**

| Site | Temperature | Energy | Personality | Signature |
|---|---|---|---|---|
| Pablo Míguez | cold black | high | confident creative dev | character-fill statement, curved marquee, cream/charcoal card track |
| Debabrata Giri | warm grey | low | tinkerer's desktop | windows + command bar, no scroll |
| Alphane Labs | bright white/sky | medium | precise lab manual | colour-coded isometric line drawing turning in a pinned inset panel |

# Ledger

Shared memory for this skill. **Read it before picking sites; append to it after every run.** It is what keeps each new build from repeating a previous one, so commit it with the build.

## Studied sites (never study these again)

| URL | Title | Studied | Study file |
|---|---|---|---|
| https://a24.raviklaassens.com/ | A24 | 2026-09-28 | building-gsap-motion-sites/references/showcase-study.md |
| https://illoca.unseen.co/ | Illoca | 2026-09-28 | building-gsap-motion-sites/references/showcase-study.md |
| https://huyml.co/ | Huy Phan Portfolio | 2026-09-28 | building-gsap-motion-sites/references/showcase-study.md |
| https://revelatio.studio/ | Revelatio Studio | 2026-09-28 | building-gsap-motion-sites/references/showcase-study.md |
| https://office.graffico.it/ | Graffico Office | 2026-09-28 | building-gsap-motion-sites/references/showcase-study.md |
| https://www.dkton.at/ | Dkton | 2026-09-28 | building-gsap-motion-sites/references/showcase-study.md |
| https://www.doordennis.nl/ | Door Dennis | 2026-09-28 | building-gsap-motion-sites/references/showcase-study.md |
| https://sanrita.ca/ | San Rita | 2026-09-28 | studies/2026-09-28-coffee.md |
| https://overflow.sui.io/ | Sui Overflow 2026 | 2026-09-28 | studies/2026-09-28-coffee.md |
| https://www.zeitmedia.vn/ | Zeit Media | 2026-09-28 | studies/2026-09-28-coffee.md |
| https://briganti.works/ | Andres Briganti | 2026-09-28 | studies/2026-09-28-portfolio4.md |
| https://www.sublimio.com/ | Sublimio | 2026-09-28 | studies/2026-09-28-portfolio4.md |
| https://www.oaksun.studio/ | Oaksun Studio | 2026-09-28 | studies/2026-09-28-portfolio4.md |
| https://www.sutera.ch/ | SUTÉRA | 2026-10-02 | studies/2026-10-02-lektura.md |
| https://www.durup.com/ | Durup | 2026-10-02 | studies/2026-10-02-lektura.md |
| https://codapress.co.uk/ | Codapress Publishing | 2026-10-02 | studies/2026-10-02-lektura.md |
| https://www.pablomiguez.dev/ | Pablo Míguez | 2026-10-02 | studies/2026-10-02-fullstack.md |
| https://debabratagiri.vercel.app/ | Debabrata Giri | 2026-10-02 | studies/2026-10-02-fullstack.md |
| https://solutions.alphanelabs.com/ | Alphane Labs | 2026-10-02 | studies/2026-10-02-fullstack.md |

## Builds (the new direction must diverge from these)

| Project | Scroll model | Type families | Palette structure | Signature motion | Composition |
|---|---|---|---|---|---|
| portfolio1 (Iris Vale, designer) | Lenis + scrubs | Instrument Serif / Geist / Geist Mono | paper `#efede8`, ink `#121212`, signal `#ff4d1f` | SplitText reveals, ScrambleText, difference cursor | Editorial grid, big serif display |
| portfolio2 (Juno Raske, director) | Lenis + one pin + scrubs | Archivo (wide) / JetBrains Mono | black `#0b0b0a`, bone `#ece6da`, signal `#ff3a20` | Film-frame reveals, ScrambleText, difference blend | Film frames, letterbox |
| portfolio3 (Aiko Lund, product designer) | Lenis + one pin + scrubs | Inter Tight / DM Mono | off-white `#f3f3f1`, ink `#0c0c0d`, signal `#2b3bff` | SplitText, ScrambleText, pinned case study | Minimal Swiss grid |
| coffee1 (Altura Coffee, café) | Observer-stepped map stage (5 stops) then native scroll, no Lenis | Big Shoulders Display / Fraunces, no mono | 5 earthy map tones (parchment `#e7e2d3`, espresso `#231c15`, sage `#7c826a`, glowing trail `#e6f5b3`, deep green `#1a1f15`) + one fill per section (cherry, bean, roast, crema) | viewBox camera zooms along a MotionPath/DrawSVG trail, bean marker, grid-halo stop nodes, colour-filling bottom tab bar | Cartographic HUD: legend rail, survey ruler with live clock, scale bar, framed contour map |
| portfolio4 (Ossian Hale, identity/type designer) | Page never scrolls: an Observer (wheel, drag with throw, keys) feeds a lerped offset (~0.09/frame, ~700ms settle) that glides an infinite, wrapping tile wall. No Lenis, no ScrollTrigger. Native scroll on phones and reduced motion. | Schibsted Grotesk only (11px / 21px / giant vertical wordmark), no mono | paper `#f3f3f0` and ink `#151413` with alpha steps, **no signal**; all chroma from 8 generated work posters | Infinite wall glide, counter-looping vertical wordmark, Flip from tile to case, rotating bio phrase (from Sublimio), hover label roll | Specimen wall: 4 columns of staggered tiles (odd rows shifted one column) sliding over a fixed 11px label row |
| lektura-welcome (Lektura, AI presentation app landing; lives in C:\Projects\LekturaC at `/welcome`, React) | Lenis (user-required; SUTÉRA also measures `html.lenis`) + one scrubbed timeline rolling a **fixed centre die** face to face across 6 chapters, each tumble straddling the chapter boundary. No pins, no SplitText/ScrambleText. On phones the die docks into the top bar. | Hanken Grotesk only (display 44–92px / 0.9 / −0.045em, 11.5px uppercase captions), no mono | **single-hue ink scale**: blue-black in 7 steps, `#fafbfd` → `#0d1830`, alpha steps of ink, **no signal**; the die's 6 faces each take one step; extra chroma only from the app's real theme cards | CSS-3D die (idle spin in the intro, cursor tilt, click to tumble), leader-line callouts that retract and redraw per chapter (pathLength dashoffset), live local-time HUD, arc-fanned Draggable + Inertia theme strip (from Codapress) | Specimen plate: 4-column hairline grid with "+" crosshairs, die fixed at centre, 4 callout slots right/below, text column in the left 37vw |
| portfolio5 (Ilan Reyes, fullstack developer) | Lenis (user-required; Pablo measures `html.lenis`) + 2 pins: a stack panel (scrubbed draw → explode → per-layer focus) and a horizontal project track. Character-fill statement scrubbed, no SplitText/ScrambleText (hand-split). | Science Gothic (wide 150% stretch, 800, 214px / 0.8 / −0.04em) / Onest, no mono | **layer-coded**: ink `#0a0a0a` and cream `#fefaee` swap per card; the only chroma is 4 stroke colours that each mean a stack layer (UI `#f880c8`, API `#ff7d38`, Data `#8fd356`, Infra `#3fb6ff`), reused as dots and mini stacks on each project; no signal | Bayer-dithered canvas field (cursor blob), 3D cylinder role ring boosted by scroll velocity, letter-by-letter fill, isometric SVG stack drawn by dashoffset then exploded (from Alphane), pinned cream/ink card track with per-project mini stacks | Full-bleed dark, giant wide display top-left, rounded inset panel (38px inset, 24px radius), 600px alternating cards |

**Worn-out defaults across the portfolio builds** (coffee1, lektura-welcome and portfolio5 avoided all four; lektura-welcome and portfolio5 use Lenis because the user asked for it):
- Lenis + SplitText + ScrambleText + scrub, all together
- a neutral pair plus one saturated signal colour
- a sans (or serif) paired with a mono for labels
- a `mix-blend-mode: difference` cursor or overlay

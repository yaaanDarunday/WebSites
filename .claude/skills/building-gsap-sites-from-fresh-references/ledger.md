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

## Builds (the new direction must diverge from these)

| Project | Scroll model | Type families | Palette structure | Signature motion | Composition |
|---|---|---|---|---|---|
| portfolio1 (Iris Vale, designer) | Lenis + scrubs | Instrument Serif / Geist / Geist Mono | paper `#efede8`, ink `#121212`, signal `#ff4d1f` | SplitText reveals, ScrambleText, difference cursor | Editorial grid, big serif display |
| portfolio2 (Juno Raske, director) | Lenis + one pin + scrubs | Archivo (wide) / JetBrains Mono | black `#0b0b0a`, bone `#ece6da`, signal `#ff3a20` | Film-frame reveals, ScrambleText, difference blend | Film frames, letterbox |
| portfolio3 (Aiko Lund, product designer) | Lenis + one pin + scrubs | Inter Tight / DM Mono | off-white `#f3f3f1`, ink `#0c0c0d`, signal `#2b3bff` | SplitText, ScrambleText, pinned case study | Minimal Swiss grid |
| coffee1 (Altura Coffee, café) | Observer-stepped map stage (5 stops) then native scroll, no Lenis | Big Shoulders Display / Fraunces, no mono | 5 earthy map tones (parchment `#e7e2d3`, espresso `#231c15`, sage `#7c826a`, glowing trail `#e6f5b3`, deep green `#1a1f15`) + one fill per section (cherry, bean, roast, crema) | viewBox camera zooms along a MotionPath/DrawSVG trail, bean marker, grid-halo stop nodes, colour-filling bottom tab bar | Cartographic HUD: legend rail, survey ruler with live clock, scale bar, framed contour map |

**Worn-out defaults across the portfolio builds** (coffee1 avoided all four):
- Lenis + SplitText + ScrambleText + scrub, all together
- a neutral pair plus one saturated signal colour
- a sans (or serif) paired with a mono for labels
- a `mix-blend-mode: difference` cursor or overlay

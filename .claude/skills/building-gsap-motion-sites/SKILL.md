---
name: building-gsap-motion-sites
description: Use when building or restyling a portfolio, studio, agency, product landing or other site meant to feel award-level (Awwwards / GSAP showcase / FWA): scroll-driven choreography, GSAP ScrollTrigger, SplitText, ScrambleText, Lenis smooth scroll, pinned sections, preloaders, odometer counters, custom cursors, or "make it feel premium / cinematic / like an award site".
---

# Building GSAP motion sites

## Overview
Award-level motion sites are not "more animation". They are **one committed idea, expressed through a strict system.** That means:
- one scroll model
- one recurring motif
- two typefaces plus a mono
- a neutral pair plus one signal colour
- exits faster than entrances

The rules and patterns here were distilled from measuring 7 GSAP-showcase sites (A24, Illoca, Huy Phan, Revelatio, Graffico, Dkton, Door Dennis). The raw data is in `references/showcase-study.md`.

**Starting point:** `template/` is a working, browser-verified one-page site (`index.html`, `styles.css`, `main.js`) that uses every pattern below. Copy it and adapt it rather than writing from scratch.

## Decide the direction first (before any code)
1. **Scroll model.** Pick exactly one:

   | Model | Use when | Reference |
   |---|---|---|
   | Hijacked stage (`overflow:hidden`, the wheel steps an index) | The content *is* an object or catalogue | A24, Huy Phan |
   | Camera-path scrub | A 3D scene is the product | Illoca |
   | Native smooth scroll + set pieces (pins, scrubs, inversions) | Most portfolios and studios (default) | Revelatio, Dkton, Door Dennis |
   | No scroll / game | An explorable space | Graffico |
2. **Motif.** One idea reused as the loader, hero, transitions and details. Examples: Dkton's EQ pills, Illoca's graph paper and handwriting, A24's disc.
3. **Vibe.** Choose its temperature, energy and personality. Use the vibe matrix in `references/showcase-study.md` §8.

## System rules
- **Type:**
  - display face at 110–230px, `line-height ≤ 1.0`, tracking −0.03 to −0.05em
  - UI and labels at 10–13px, in mono or tracked caps (+0.08 to +0.2em)
  - leave the middle sizes almost empty
  - each font has one strict job
- **Colour:** a neutral pair plus one signal colour. Use alpha steps (4/8/16/32/64%) instead of a grey scale. Let the content supply extra chroma.
- **Timing:** 0.2–0.4s for UI, 0.6–0.8s for reveals, 1.2–1.9s for hero moments. Exits are faster than entrances.
- **Always:** `prefers-reduced-motion` (no loader, no Lenis, no pins, final states shown), a mobile layout without pins, keyboard-reachable interactions, and visible focus.

## Easing quick reference
| Name | Curve | Use |
|---|---|---|
| osmo | `0.625, 0.05, 0, 1` | UI transforms, nav, hover rolls |
| expo.out | `0.16, 1, 0.3, 1` | Big settles, line reveals |
| out-quint | `0.22, 1, 0.36, 1` | Text rises |
| out-circ | `0, 0.55, 0.45, 1` | Long clip-path image reveals |
| exit | `0.625, 0, 0.875, 0` | Anything leaving |

## Pattern menu
Pick 4–6 of these. Code for each is in `references/patterns.md`.
- odometer counter
- scramble text
- masked line reveal
- word-by-word scroll highlight
- pinned focus index
- colour wipe with inverted text
- theme inversion
- velocity marquee
- hover text roll
- nav with section progress bars
- difference cursor with live HUD
- grain, visible grid and viewfinder buttons

## Common mistakes (all hit in practice)
| Symptom | Cause | Fix |
|---|---|---|
| Element renders black at scrub start | Tweening `filter` from `none` | Use `fromTo` with `filter:"brightness(1)"` |
| Centred element jumps when GSAP animates it | CSS `translateX(-50%)` gets baked into GSAP's px `x` | Centre with `left:0; right:0; margin-inline:auto; width:max-content` |
| Headline drops below other content | Grid auto-placement collides with an explicitly placed sibling | Give every hero child an explicit `grid-row` |
| Odometer overshoots | Used `yPercent:-100` per digit | A 10-item reel needs `-10` per digit |
| Scramble does nothing | Scrambling to the text it already has | Clear `textContent` first |
| Split text breaks on resize or font load | Manual split with no re-split | `autoSplit:true` and return the tween from `onSplit`; init after `document.fonts.ready` |
| Nav progress is wrong after the pinned section | Triggers created before the pin | Create nav triggers last, or set `refreshPriority` |
| Footer or last content hidden under a fixed HUD | No bottom clearance | Pad the footer by the HUD height |
| Screenshots show frozen WebGL/GSAP | The browser tab is hidden, so rAF is paused | Verify in a visible Playwright page, not a background tab |

## Verify before claiming done
Serve the site locally, e.g. `python -m http.server`, then drive it in Playwright:
- screenshot mid-motion (about 250ms after a wheel tick) and settled
- check a 390px mobile viewport, with no horizontal scroll
- check `reducedMotion: 'reduce'`
- confirm there are zero `pageerror`s

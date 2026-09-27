---
name: building-gsap-sites-from-fresh-references
description: Use when building an award-level GSAP / motion site (portfolio, studio, agency, product landing) that must look different from earlier builds: "fresh references", "new style", "something unique", "not like the last one", "study new sites from the GSAP showcase", or when previous motion sites in the project have started to look alike.
---

# Building GSAP sites from fresh references

## Overview
`building-gsap-motion-sites` distils **7 fixed sites**. Every build made from it converges on one look: Lenis + SplitText + ScrambleText, a neutral pair plus one hot signal colour, a sans plus a mono, and a difference cursor. This skill breaks that loop. **Each run studies sites from gsap.com/showcase that nobody here has studied before.** The design direction then comes from that new study, and it must diverge from every build in `ledger.md`.

**Division of labour:**
- **This skill** owns discovery, the study and the direction (the look).
- **REQUIRED SUB-SKILL:** `building-gsap-motion-sites` owns the engineering: GSAP/Lenis boot, reduced-motion branching, the pattern code, its common-mistakes table and its verification. Do **not** take its template's styling, fonts, palette or vibe matrix. Those are exactly what this skill replaces.

**Needs:** Playwright MCP (`browser_navigate`, `browser_evaluate`, `browser_take_screenshot`).

## Workflow

### 1. Read the ledger
Read `ledger.md`. Its studied URLs are excluded from this run. Its builds table is what the new direction must diverge from (step 5).

### 2. Harvest the showcase
Navigate to `https://gsap.com/showcase/`. Run `scripts/harvest-showcase.js` as the `browser_evaluate` function, saving to `.shots/showcase-index.json`. It clicks "Load More" until the gallery ends; expect roughly 500 cards with `{title, url, creator, plugins}`. Remove every ledger URL.

### 3. Pick 3–4 sites for spread, not fame
- Shortlist **8 candidates, sampled at random** across the whole list. The top of the gallery is the same featured work everyone has already copied.
- At least **half** must carry a plugin outside the usual set (ScrollTrigger, SplitText, CustomEase, ScrollTo, useGSAP): Draggable, Inertia, Flip, Observer, MorphSVG, DrawSVG, MotionPath, Physics2D, ScrambleText-only, and so on.
- Open each candidate and take one settled screenshot. **Drop** any that are dead, parked, stuck behind a cookie or login wall, or visually close to a ledger build or to another pick.
- Keep the 3–4 that differ most **from each other** in scroll model, colour and type.

### 4. Dissect each pick
For each site:
1. Load it and wait out the preloader. Screenshot the settled hero.
2. Run `scripts/dissect-site.js` via `browser_evaluate`. It measures typography, palette, `:root` tokens, eases, durations, keyframes, live GSAP state and libraries.
3. Drive it with real wheel input (`page.mouse.wheel`, 700–800px per tick). Screenshot about 250ms after a tick (mid-motion) and about 1.7s after (settled). Run `dissect-site.js` again on the most distinctive section.
4. Hover the nav, links and cards, and move the cursor. Write down what reacts.

Write it all up in `study-format.md` format as `studies/YYYY-MM-DD-<slug>.md`. Screenshots go in `.shots/` at the project root, which must be gitignored because they are other people's work. The text study is committed.

### 5. Commit to a direction that diverges
Pick **one lead site** from the study for the vibe and scroll model, and **borrow exactly one idea** from another pick. Then fill in this card:

| Axis | This build | Closest ledger build | Different? |
|---|---|---|---|
| Scroll model | | | |
| Type families (none reused) | | | |
| Palette structure | | | |
| Signature motion | | | |
| Composition / grid | | | |

**Pass rule:** at least **4 of 5 axes differ** from *every* ledger build, and no type family already in the ledger is reused. Also avoid the ledger's "worn-out defaults" unless the lead site measurably uses one. If it does, cite the measurement from the study. If the card fails, change the direction, not the card.

Show the user the card and the lead/borrow sites **before building**.

### 6. Build
Build with `building-gsap-motion-sites`, taking its engineering and verification steps and pulling patterns from its `references/patterns.md` only where the study calls for them. If the lead site's motion has no pattern there (drag, Flip layouts, SVG morph, physics), write it fresh from the measured behaviour. Keep its always-rules: reduced motion, a mobile layout without pins, keyboard access and visible focus.

### 7. Update the ledger
Append the studied sites and the new build row, including its palette structure and signature motion. Commit `ledger.md` and the study file together with the build.

## Common mistakes
| Symptom | Cause | Fix |
|---|---|---|
| New build looks like the last one | Direction taken from the old skill's vibe matrix or template CSS | Direction comes only from the new study; the divergence card must pass |
| All picks share one look | Took the top of the gallery, or picked by fame | Random 8-card shortlist; half with unusual plugins; compare the screenshots side by side |
| `gsap: "not global"`, 0 triggers | GSAP is bundled (common with Vite, Next and Nuxt) | Record the plugins from the showcase card, infer motion from the mid/settled screenshots, mark it *(inferred)* |
| Typography list has only the nav | Measured during the preloader, or the content is on a canvas | Wait for the settled hero; for WebGL text, describe it from screenshots |
| Screenshots frozen or blank | Hidden tab, so rAF is paused | Use a visible Playwright page |
| Study wanders off into vague adjectives | No numbers | Every section needs px, hex and ease values from the dissect output |
| Next run repeats these sites | Ledger not updated or not committed | Step 7 is part of the run |

# WebSites

Motion-heavy website experiments built with GSAP, studied from the [GSAP showcase](https://gsap.com/showcase/).

| Folder | What it is |
|---|---|
| [`portfolio1/`](portfolio1) | A one-page portfolio: odometer preloader, masked line reveals, pinned work index, colour-wipe services, theme inversion and a live HUD. |
| [`portfolio2/`](portfolio2) | A director/cinematographer portfolio built on a film-frame motif: timecode slate loader, letterbox hero that opens to full-bleed, pinned horizontal film reel, shot list with a rolling preview, and an edit-timeline HUD. |
| [`gsap-showcase-study/`](gsap-showcase-study) | A measured breakdown of 7 GSAP-showcase sites covering type, colour, easing, scroll models and motion patterns. |
| [`.claude/skills/building-gsap-motion-sites/`](.claude/skills/building-gsap-motion-sites) | A Claude Code skill that packages the study into rules, a pattern catalog and a starter template. |

## Run a portfolio locally

```bash
cd portfolio1   # or portfolio2
python -m http.server 5173
# open http://localhost:5173
```

It needs no build step. GSAP 3.13 (ScrollTrigger, SplitText, ScrambleText, CustomEase) and Lenis load from jsDelivr.

## Using the skill

Open this repo in [Claude Code](https://claude.com/claude-code) and the `building-gsap-motion-sites` skill loads automatically. It triggers when you ask for an award-style or motion-heavy site. To use it in other projects, copy the folder into `~/.claude/skills/`.

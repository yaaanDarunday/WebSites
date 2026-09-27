# Study file format

Save one file per run as `studies/YYYY-MM-DD-<short-slug>.md`. Record **measured values only**: computed px, hex/rgb values and eases copied from the dissect output. Mark anything you inferred rather than measured with *(inferred)*.

```markdown
# Fresh study: <run slug>

**Date:** YYYY-MM-DD · **Viewport:** 1440×900, DPR 1 · **Source:** gsap.com/showcase (N cards harvested)
**Why these sites:** one line each on what made them different from the ledger.

| # | Site | Built by | Plugins (card) | Stack observed | Scroll model |
|---|---|---|---|---|---|

## 1. <Site>
**Vibe:** 2–3 sentences: temperature, energy, personality, what it reminds you of.
### Layout and composition   (grid, HUD placement, what sits where, how dense)
### Typography               (table: role | font | size / LH / tracking | notes)
### Colour                   (tokens and hex values, where chroma comes from)
### Motion                   (scroll model, pins/scrubs counts, eases, durations, what moves on hover/click)
### The one thing to steal   (a single idea, stated so it could be built without seeing the site)

## N+1. Across these sites
- What they share that the ledger's builds do NOT do.
- Vibe matrix row per site: temperature / energy / personality / signature.
```

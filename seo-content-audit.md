# SEO content-depth audit — play.poki2.online

> Generated 2026-09-27. Targets GSC "crawled/discovered - not indexed" + soft-404 root cause.

## Why this matters

Google indexes the `<noscript>` block (the rest of the page is JS-rendered). Historically that block
was templated AND self-duplicating: `howToPlay` was auto-derived from `description` by
`scripts/generate-how-to-play.cjs`, so the "How to play" section repeated the description verbatim on
218/219 pages — a textbook thin/duplicate signal. **Fixed 2026-09-27**: `generate-game-pages.cjs` now
skips the section (and its FAQPage question) whenever howToPlay ⊆ description. This audit verifies the
fix stays at 0 and tracks the remaining problem: pages whose unique indexable text is still too thin.

## Summary

| metric | value |
|---|---|
| games audited | 219 |
| generated dist HTML missing | 0 |
| games with howToPlay field | 219 |
| pages emitting an "How to play" block | 1 |
| …of which block text ⊂ description (duplicated, must be 0) | 0 |
| games with NO howToPlay | 0 |
| descriptions < 120 chars (thin) | 0 |
| boilerplate (category nav, identical every page) | 200 chars |
| pages with hand-authored "About" content (batch 1) | 67 |
| pages noindexed (batch 1, out of sitemap) | 140 |
| pages in the index | 79 |
| remaining noindex/consolidate candidates (indexed, score<200) | 8 |

## Distribution — noscript body length (what Google sees, INDEXED pages only)

| noscript chars | indexed pages |
|---|---|
| 0–300 | 0 |
| 300–400 | 0 |
| 400–500 | 79 |
| 500–700 | 0 |
| ≥700 | 0 |

> After subtracting the 200-char boilerplate nav, indexed pages average
> ~252 chars of genuinely unique body text.

## Top 30 thinnest pages — noindex / consolidate candidates

These have the least unique indexable text. Options per page:
  (a) **noindex** it temporarily so Google focuses crawl budget on quality pages,
  (b) **beef up** with real gameplay tips / mechanics / screenshots, or
  (c) **remove** from sitemap if the game has no real content potential.

| # | score | desc | dup? | genres | noscript | unique | url |
|---|---|---|---|---|---|---|---|
| 1 | 171 | 141 | · | 2 | 452 | 252 | [ninjablade](https://play.poki2.online/game/n/ninjablade/) |
| 2 | 171 | 141 | · | 2 | 452 | 252 | [foofoo](https://play.poki2.online/game/f/foofoo/) |
| 3 | 172 | 157 | · | 1 | 452 | 252 | [om-bounce](https://play.poki2.online/game/o/om-bounce/) |
| 4 | 173 | 158 | · | 1 | 452 | 252 | [bubblefish](https://play.poki2.online/game/b/bubblefish/) |
| 5 | 174 | 159 | · | 1 | 452 | 252 | [skywire](https://play.poki2.online/game/s/skywire/) |
| 6 | 175 | 160 | · | 1 | 452 | 252 | [springninja](https://play.poki2.online/game/s/springninja/) |
| 7 | 181 | 151 | · | 2 | 452 | 252 | [mathgame](https://play.poki2.online/game/m/mathgame/) |
| 8 | 189 | 159 | · | 2 | 452 | 252 | [jellyslice](https://play.poki2.online/game/j/jellyslice/) |
| 9 | 201 | 156 | · | 3 | 452 | 252 | [papery-planes](https://play.poki2.online/game/p/papery-planes/) |
| 10 | 201 | 141 | · | 4 | 452 | 252 | [snowbattle](https://play.poki2.online/game/s/snowbattle/) |
| 11 | 203 | 158 | · | 3 | 452 | 252 | [edgenotfound](https://play.poki2.online/game/e/edgenotfound/) |
| 12 | 305 | 158 | · | 2 | 452 | 252 | [craftmine](https://play.poki2.online/game/c/craftmine/) |
| 13 | 398 | 142 | · | 1 | 452 | 252 | [meme2048](https://play.poki2.online/game/m/meme2048/) |
| 14 | 415 | 141 | · | 2 | 452 | 252 | [trollboxing](https://play.poki2.online/game/t/trollboxing/) |
| 15 | 416 | 143 | · | 2 | 452 | 252 | [vex6](https://play.poki2.online/game/v/vex6/) |
| 16 | 419 | 158 | · | 0 | 452 | 252 | [papaspizzaria](https://play.poki2.online/game/p/papaspizzaria/) |
| 17 | 420 | 154 | · | 1 | 452 | 252 | [endlesswar3](https://play.poki2.online/game/e/endlesswar3/) |
| 18 | 422 | 156 | · | 1 | 452 | 252 | [hexgl](https://play.poki2.online/game/h/hexgl/) |
| 19 | 426 | 144 | · | 1 | 452 | 252 | [n-gon](https://play.poki2.online/game/n/n-gon/) |
| 20 | 427 | 145 | · | 3 | 452 | 252 | [death-run-3d](https://play.poki2.online/game/d/death-run-3d/) |
| 21 | 428 | 140 | · | 2 | 452 | 252 | [miniputt](https://play.poki2.online/game/m/miniputt/) |
| 22 | 428 | 144 | · | 2 | 452 | 252 | [paperio2](https://play.poki2.online/game/p/paperio2/) |
| 23 | 429 | 153 | · | 3 | 452 | 252 | [zcj2](https://play.poki2.online/game/z/zcj2/) |
| 24 | 429 | 141 | · | 2 | 452 | 252 | [rolly-vortex](https://play.poki2.online/game/r/rolly-vortex/) |
| 25 | 430 | 144 | · | 2 | 452 | 252 | [minesweeper](https://play.poki2.online/game/m/minesweeper/) |
| 26 | 431 | 154 | · | 1 | 452 | 252 | [ctr-holiday](https://play.poki2.online/game/c/ctr-holiday/) |
| 27 | 431 | 157 | · | 1 | 452 | 252 | [just-one-boss](https://play.poki2.online/game/j/just-one-boss/) |
| 28 | 433 | 140 | · | 3 | 452 | 252 | [zombiescantjump](https://play.poki2.online/game/z/zombiescantjump/) |
| 29 | 434 | 149 | · | 2 | 452 | 252 | [tube-jumpers](https://play.poki2.online/game/t/tube-jumpers/) |
| 30 | 435 | 155 | · | 1 | 452 | 252 | [getaway-shootout](https://play.poki2.online/game/g/getaway-shootout/) |

## Recommended actions (priority order)

1. **Stop generating howToPlay from description.** `generate-how-to-play.cjs` creates intra-page
   duplication. Either drop the `<h2>How to play</h2>` block when howToPlay ⊂ description, or
   author real, distinct gameplay tips per game (controls, objective, scoring, difficulty).
2. **noindex the thinnest ~30 pages** (list above) — add `<meta name="robots" content="noindex,follow">`
   and drop them from sitemap.xml. Re-enable once each has ≥400 chars of unique body text.
3. **Add a unique "About this game" paragraph** per page (objective + mechanics + what makes it
   distinct) into the noscript block + VideoGame JSON-LD `description`. Even 2–3 sentences × 219
   pages materially raises the content floor.
4. **Thin the boilerplate**: the 12-link category nav appears on every game page identically —
   consider moving it out of `<noscript>` (JS-only) so it stops diluting each page's unique ratio.
5. **Automate lastmod** (P6 #17) — see `generate-sitemap.cjs` companion change.

---
_Full ranked table of all 219 games is in the console output._

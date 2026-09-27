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
| noindex candidates (score<200 or no file) | 182 |

## Distribution — noscript body length (what Google sees)

| noscript chars | pages |
|---|---|
| 0–300 | 0 |
| 300–400 | 0 |
| 400–500 | 219 |
| 500–700 | 0 |
| ≥700 | 0 |

> After subtracting the 200-char boilerplate nav, most pages have only
> ~252 chars of genuinely unique body text.

## Top 30 thinnest pages — noindex / consolidate candidates

These have the least unique indexable text. Options per page:
  (a) **noindex** it temporarily so Google focuses crawl budget on quality pages,
  (b) **beef up** with real gameplay tips / mechanics / screenshots, or
  (c) **remove** from sitemap if the game has no real content potential.

| # | score | desc | dup? | genres | noscript | unique | url |
|---|---|---|---|---|---|---|---|
| 1 | 155 | 140 | · | 1 | 452 | 252 | [bottomtight](https://play.poki2.online/game/b/bottomtight/) |
| 2 | 155 | 140 | · | 1 | 452 | 252 | [piratekid](https://play.poki2.online/game/p/piratekid/) |
| 3 | 157 | 142 | · | 1 | 452 | 252 | [circlo](https://play.poki2.online/game/c/circlo/) |
| 4 | 157 | 142 | · | 1 | 452 | 252 | [meme2048](https://play.poki2.online/game/m/meme2048/) |
| 5 | 157 | 142 | · | 1 | 452 | 252 | [cheeselab](https://play.poki2.online/game/c/cheeselab/) |
| 6 | 158 | 143 | · | 1 | 452 | 252 | [interactivebuddy](https://play.poki2.online/game/i/interactivebuddy/) |
| 7 | 158 | 158 | · | 0 | 452 | 252 | [papaspizzaria](https://play.poki2.online/game/p/papaspizzaria/) |
| 8 | 159 | 144 | · | 1 | 452 | 252 | [ctr-tr](https://play.poki2.online/game/c/ctr-tr/) |
| 9 | 159 | 144 | · | 1 | 452 | 252 | [n-gon](https://play.poki2.online/game/n/n-gon/) |
| 10 | 159 | 144 | · | 1 | 452 | 252 | [circletris](https://play.poki2.online/game/c/circletris/) |
| 11 | 161 | 146 | · | 1 | 452 | 252 | [pebbleboy](https://play.poki2.online/game/p/pebbleboy/) |
| 12 | 163 | 148 | · | 1 | 452 | 252 | [cupcake2048](https://play.poki2.online/game/c/cupcake2048/) |
| 13 | 164 | 149 | · | 1 | 452 | 252 | [helicopter](https://play.poki2.online/game/h/helicopter/) |
| 14 | 169 | 154 | · | 1 | 452 | 252 | [ctr](https://play.poki2.online/game/c/ctr/) |
| 15 | 169 | 154 | · | 1 | 452 | 252 | [ctr-holiday](https://play.poki2.online/game/c/ctr-holiday/) |
| 16 | 169 | 154 | · | 1 | 452 | 252 | [endlesswar3](https://play.poki2.online/game/e/endlesswar3/) |
| 17 | 169 | 154 | · | 1 | 452 | 252 | [penguin](https://play.poki2.online/game/p/penguin/) |
| 18 | 170 | 155 | · | 1 | 452 | 252 | [getaway-shootout](https://play.poki2.online/game/g/getaway-shootout/) |
| 19 | 170 | 140 | · | 2 | 452 | 252 | [miniputt](https://play.poki2.online/game/m/miniputt/) |
| 20 | 170 | 140 | · | 2 | 452 | 252 | [alienattack](https://play.poki2.online/game/a/alienattack/) |
| 21 | 170 | 155 | · | 1 | 452 | 252 | [cboxes](https://play.poki2.online/game/c/cboxes/) |
| 22 | 170 | 155 | · | 1 | 452 | 252 | [chipman](https://play.poki2.online/game/c/chipman/) |
| 23 | 170 | 140 | · | 2 | 452 | 252 | [deathsoul](https://play.poki2.online/game/d/deathsoul/) |
| 24 | 170 | 155 | · | 1 | 452 | 252 | [dropcircle](https://play.poki2.online/game/d/dropcircle/) |
| 25 | 170 | 140 | · | 2 | 452 | 252 | [duckwater](https://play.poki2.online/game/d/duckwater/) |
| 26 | 170 | 155 | · | 1 | 452 | 252 | [jomjom](https://play.poki2.online/game/j/jomjom/) |
| 27 | 170 | 140 | · | 2 | 452 | 252 | [monstercandy](https://play.poki2.online/game/m/monstercandy/) |
| 28 | 170 | 155 | · | 1 | 452 | 252 | [ropeninja](https://play.poki2.online/game/r/ropeninja/) |
| 29 | 171 | 141 | · | 2 | 452 | 252 | [ninjablade](https://play.poki2.online/game/n/ninjablade/) |
| 30 | 171 | 156 | · | 1 | 452 | 252 | [hexgl](https://play.poki2.online/game/h/hexgl/) |

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

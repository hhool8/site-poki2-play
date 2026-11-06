#!/usr/bin/env node
/**
 * tools/content/apply-content-depth-2.cjs
 *
 * Depth treatment for basketball-stars only. Not a batch.
 *
 * Why this single page, now:
 *   1. GSC baseline (2026-11-04 snapshot): "Crawled - currently not indexed",
 *      last crawl 2026-06-17, canonical self-referencing, robots allowed. It is
 *      the exact profile the depth fix targets - not a canonical or noindex
 *      problem, just no rendered body copy.
 *   2. It is the landing page used in the link-outreach campaign
 *      (07-links/game-basketball-stars-2026-11-06.md on the sidecar). Editors
 *      land here. A page with 143 words inside <noscript> is a weak pitch.
 *   3. It sat outside scripts/sitemap-scope.json, so the strongest candidate for
 *      inbound links was also the hardest page to discover. Fixed alongside.
 *
 * Deliberately NOT a batch: batch-4 (18 games) stays held behind the G1 gate on
 * 2026-11-27. This is one page with a non-SEO justification, so it is recorded
 * as an outreach asset rather than as evidence for the depth gate.
 *
 * Controls are described by function, not by key names - the site's existing
 * copy makes no key claims for this game and neither does this one.
 *
 * Usage:
 *   node tools/content/apply-content-depth-2.cjs           # dry run
 *   node tools/content/apply-content-depth-2.cjs --apply
 */

'use strict';

const fs = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', '..', 'games.json');
const APPLY = process.argv.includes('--apply');

const DEPTH = {
  'basketball-stars': {
    // Meta description replaced too: the old one ended on "Best experienced on
    // desktop browsers.", one of the site-wide boilerplate tails, and it
    // contradicted the touch support the same page advertises.
    description:
      '1v1 and 2v2 half-court basketball in the browser. Charge your shot, dash into space, and finish at the rim instead of settling for a jumper.',
    about: [
      'Basketball Stars compresses basketball into a half court and two to four players. There is no referee, no clock management and no season: you pick a character, the ball is checked, and the possession ends in either a bucket or a turnover. That compression is the entire design, and it is why a match lasts about as long as a coffee break.',
      'Offence is built on one idea: you cannot shoot over a defender who is set, so you have to move him first. A charged shot is accurate but slow to release, which makes the release a commitment - start it with a hand in your face and the block arrives before the ball leaves your hands. Dribbling and the dash exist to break that symmetry. Carry the ball into open space and shoot before the defender recovers, or attack the rim, where a dunk converts at a far higher rate than a mid-range jumper and pulls the defence inward for the next possession.',
      'Defence is the same toolkit read the other way. Standing between your opponent and the rim is worth more than chasing the ball, because a contest that arrives on time beats a steal attempt that does not. The steal is a gamble with a visible cost: miss it and you are a step behind with the ball already moving. Blocks are the reliable play, since they only ask for the timing of the jump rather than a read of the dribble.',
      'The half-court format is what keeps this readable as a browser game. With a single hoop in play, every possession ends in the same place, so a newcomer can follow the ball instead of the whole floor. Two players can share one keyboard for a local match, which makes it a better fit for a shared laptop than most competitive browser games, and the version here needs no install, no account and no download.',
    ].join('\n\n'),
    howToPlay:
      'Pick a character and start a match, one-on-one or two-on-two, on a single half court. Move with the keyboard and use the action control for everything else: it charges a shot while you hold it with the ball, jumps to block on defence, and reaches in for a steal when you are close to the dribbler. Because one control covers shooting, blocking and stealing, the game asks you to decide before you press rather than after - an early steal is a free lane for your opponent and an early release is a blocked shot. On offence, create separation first and shoot second. On defence, stay between your man and the hoop, then jump when the shot starts instead of when the ball is already in the air.',
    tips: [
      'Start the charge before you are open and release when you are. Standing still with a full charge is the most predictable thing you can do on a half court.',
      'Take the rim when the lane opens. A dunk is worth more than a jumper, and it pulls a defender inward for the possession after it.',
      'Do not reach for a steal unless you are already between your man and the basket. A missed steal is a two-point gift in the other direction.',
      'In two-on-two, switch to the player nearest the ball before the pass leaves the handler. The switch is free; the recovery is not.',
    ],
  },
};

function slugOf(link) {
  try {
    const u = new URL(link);
    const p = u.pathname.replace(/\/+$/, '');
    return p.split('/').pop() || u.hostname.split('.')[0];
  } catch {
    return link;
  }
}

const words = (s) => (String(s || '').match(/[A-Za-z0-9'\u2019-]+/g) || []).length;

const games = JSON.parse(fs.readFileSync(GAMES, 'utf8'));
const bySlug = new Map(games.map((g) => [slugOf(g.link), g]));

let applied = 0;
let missing = 0;

for (const [slug, data] of Object.entries(DEPTH)) {
  const game = bySlug.get(slug);
  if (!game) {
    console.error(`MISSING  ${slug}`);
    missing++;
    continue;
  }
  const total = words(data.about) + words(data.howToPlay) + data.tips.reduce((n, t) => n + words(t), 0);
  console.log(
    `${APPLY ? 'APPLY ' : 'would '} ${slug.padEnd(18)} about=${String(words(data.about)).padStart(3)}w ` +
    `htp=${String(words(data.howToPlay)).padStart(3)}w tips=${data.tips.length} total=${total}w ` +
    `desc=${String((data.description || game.description || '').length).padStart(3)}ch ` +
    `noindex=${game.noindex === true} depth=${game.depth === true}`
  );
  if (APPLY) {
    if (data.description) game.description = data.description;
    game.about = data.about;
    game.howToPlay = data.howToPlay;
    game.tips = data.tips;
    game.depth = true;
    if (game.noindex === true) game.noindex = false;
  }
  applied++;
}

if (APPLY && applied) fs.writeFileSync(GAMES, JSON.stringify(games, null, 2) + '\n');

console.log(`\n${APPLY ? 'applied' : 'would apply'}: ${applied}  missing: ${missing}`);
if (!APPLY) console.log('dry run - pass --apply to write games.json');

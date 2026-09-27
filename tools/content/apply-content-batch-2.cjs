#!/usr/bin/env node
/**
 * tools/content/apply-content-batch-2.cjs
 *
 * Content-depth batch 2 (see seo-content-audit.md). Closes the remaining
 * batch-2 queue: the 12 indexed pages that were still below the thinness
 * threshold after batch 1. All 12 get hand-authored `about` content based
 * on their described mechanics — no new noindexes needed.
 *
 * Usage:
 *   node tools/content/apply-content-batch-2.cjs            # dry-run
 *   node tools/content/apply-content-batch-2.cjs --apply    # write games.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const GAMES_PATH = path.join(__dirname, '../../games.json');
const APPLY = process.argv.includes('--apply');

function normalizeHref(link) {
  try {
    const u = new URL(link);
    let p = u.pathname.replace(/\/+$/, '');
    if (!p) p = u.hostname.split('.')[0];
    return p.split('/').pop() || link;
  } catch { return link; }
}

const ABOUT = {
  'ninjablade': 'Attacks fly at you and your katana answers them: slice each incoming threat in half at exactly the right moment. Precision beats speed — a late slash still hits, a sloppy one whiffs and costs a life. Watch the wind-up animation of every attacker, and commit to the cut only when the blade is committed to you.',
  'craftmine': 'A browser-based survival sandbox in the Minecraft mold: punch trees, mine stone and ores, then turn raw blocks into better tools at the crafting bench. Follow the classic progression — wooden pick, stone pick, then shelter before your first night — and never dig straight down; gravity and lava are both patient.',
  'edgenotfound': 'The Chrome dinosaur leaves its offline page for a web-themed adventure: run through a landscape of missing pages, 404 errors and browser quirks, jumping hazards the same one-button way. The theme changes the scenery, not the physics — small early jumps, read the terrain a beat ahead, and let the constant speed do the steering.',
  'om-bounce': 'Om Nom bounces between trampolines to reach candy floating high out of reach. Each trampoline stretches under him and springs him higher the deeper it compresses, so timing the bounce — not tapping faster — is the whole game. Line up the next jump while mid-air, and let big drops build the height you need.',
  'papery-planes': 'Fold a paper plane and glide it through tricky courses, adjusting lift, weight and angle as you fly. Nose up to climb and bleed speed, nose down to dive and trade height for distance — the best runs ride that trade deliberately instead of fighting it. Watch for updrafts on the course line and use them to recover altitude for free.',
  'snowbattle': 'A winter multiplayer brawl: lob snowballs at rivals while stacking snow into cover between volleys. Peeking costs nothing, standing in the open costs everything — build first, throw second. Leading your target matters at range, and reloading behind cover beats winning a race you started a hit behind.',
  'bubblefish': 'A classic bubble shooter underwater: shoot colored bubbles upward, and when three or more of a kind connect they pop and drop everything hanging beneath them. Bank shots off the side walls reach clusters you cannot hit straight, and popping a large overhanging group clears more board per shot than picking off singles.',
  'foofoo': 'Little Foo Foo hops through the forest in an endless hopper: time each jump over snakes and steer mid-air to land on mushrooms, which score and often mark the safe path. Rhythm beats reaction — the spawn patterns repeat, and the players who get far are the ones who commit to the next platform early instead of hesitating at the apex.',
  'jellyslice': 'Slice wobbling jelly blocks into exactly the number of equal portions the critters below are waiting for. The jelly jiggles after every cut, so plan the whole cut sequence before the first slice — a sloppy early cut leaves pieces too uneven to correct. Fewer, cleaner cuts score higher.',
  'mathgame': 'Arithmetic questions pop up and you click the correct answer as fast as possible — the clock is the real opponent. Work in the order multiplication tables reward: memorized facts beat mental column math every time, and skipping a question you cannot see instantly is faster than fighting for it.',
  'skywire': 'The Nitrome classic: ride a cable car along sky-high wires, dodging birds, power lines and whatever else the mountain throws at the track. Two passengers ride on top, and every hit knocks one off — protect them by hugging the inside of every curve and easing through obstacle gaps rather than rushing them.',
  'springninja': 'A ninja with a spring for a launch: compress, aim, and release to bounce between platforms that climb ever further apart. The release timing sets both distance and landing angle, so the perfect jump is about letting the spring go at the same point every time. Land on platform centers — edges slide.',
};

const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
const bySlug = new Map(games.map(g => [normalizeHref(g.link), g]));

let applied = 0, skipped = 0;
const missing = [];

for (const [slug, text] of Object.entries(ABOUT)) {
  const g = bySlug.get(slug);
  if (!g) { missing.push(slug); continue; }
  if (g.about) { skipped++; continue; }
  g.about = text;
  applied++;
}

const shown = games.filter(g => g.show);
const withAbout = shown.filter(g => g.about).length;
const indexedThin = shown.filter(g => !g.noindex && !g.about).length;

console.log(`ABOUT:   ${applied} applied, ${skipped} already had content${missing.length ? `, MISSING SLUGS: ${missing.join(', ')}` : ''}`);
console.log(`COVERAGE: ${withAbout}/${shown.length} show games with real content | indexed thin remaining: ${indexedThin}`);

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to update games.json.');
} else {
  fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');
  console.log(`\n✅  games.json updated. Next: npm run generate:gamepages && npm run generate:sitemap`);
}

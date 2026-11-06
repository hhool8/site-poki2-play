#!/usr/bin/env node
/**
 * tools/content/apply-content-batch-3.cjs
 *
 * Content-depth batch 3 (pilot). Hand-authors UNIQUE `about` text for a pilot
 * set of 18 games that are currently noindex + lacking substantial about
 * content, then FLIPS noindex -> false so they can enter the sitemap and be
 * considered for indexing. This validates the "enrich -> de-noindex" path for
 * the 140 noindex games.
 *
 * Unlike tools/content/enrich-descriptions.cjs this does NOT append templated
 * boilerplate suffixes — every entry below is written per-game from its actual
 * mechanics, so the text stays unique across the set.
 *
 * Usage:
 *   node tools/content/apply-content-batch-3.cjs          # dry-run
 *   node tools/content/apply-content-batch-3.cjs --apply  # write games.json
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
  'bubblecn': 'Line up your shots and fire colored bubbles into the cluster above — when three or more of the same hue touch they pop, and everything hanging beneath them drops away. Bank shots off the side walls to reach pockets you cannot hit head-on, and clear the whole board before the bubbles creep down to the launcher.',
  'candyfusion': 'Slide matching candy tiles together to fuse them into richer, higher-value sweets, chaining merges to build a combo before the board fills. Every fusion scores, but the smart plays come from setting up a cascade that keeps feeding itself. Watch the grid edges — a cleared lane opens room for the next big combination.',
  'gettwelve': 'Merge numbered tiles by sliding equal values together, doubling them each time as you push toward the magic number twelve. The board tightens with every move, so plan merges two steps ahead instead of grabbing the obvious pair. A wrong slide strands a tile you cannot pair — and the game ends when no move remains.',
  'silverarrow': 'Draw your bow and loose arrows at targets scattered across each timed stage — speed matters, but a clean hit beats a rushed one. Read the wind and the target\'s drift, then release at the moment the aim settles. Missed shots cost seconds you cannot win back, so pace your volleys and let the clock work for you.',
  'dotgame': 'The classic dots-and-boxes duel: take turns drawing a line between two adjacent dots, and claim a square the moment you complete its fourth side. Trap your opponent into handing you box after box by leaving open thirds they cannot avoid closing. The player who fences off the most territory wins.',
  'woodblock': 'Drag wooden blocks from the tray and drop them onto the grid to fill complete rows and columns, which then clear and free up space. Plan where each piece lands before you commit — a stray gap strands a block you cannot place later. The run ends when the board has no room left for the next piece.',
  'jomjom': 'Connect groups of identical Jomjom creatures by dragging a path through them, then pop the whole cluster for points before the board reshuffles. Longer chains score exponentially more, so look for the biggest same-color blob rather than the nearest pair. Clear the objective in each level before moves or time run out.',
  'funnysoccer': 'Ragdoll physics turn every match into glorious chaos: wobbling players bounce off the ball and each other as you scramble to score before the whistle. Timing your kick matters more than aiming, since the silly physics decides where the ball actually goes. Score the most goals before the clock runs down.',
  'ojelloonline': 'Stretch and squish the jelly Ojello blob to squeeze it through narrow gaps and past spikes in each physics puzzle. The blob deforms to fit, but over-stretch and it snaps back or tears — find the exact shape the opening demands. Each level is a new constraint on how far one patient pull can take you.',
  'dronewars': 'Pilot a combat drone through enemy formations, weaving between missiles while returning fire in tight aerial dogfights. Keep your speed up so you stay a hard target, and use terrain and wreckage as cover when the screen fills with tracers. Survive each wave to face faster, meaner squadrons.',
  'monstercandy': 'Each little monster craves a specific candy — draw a line to route the right colored sweet into its waiting mouth without crossing wires. The puzzles layer in more monsters and tighter paths, so you must plan the whole feeding order before the first candy drops. Satisfy every creature to clear the board.',
  'piratekid': 'A pint-sized pirate swings from island to island, slashing sea monsters and scooping up buried treasure across side-scrolling platforming runs. Time your jumps between decks and cannons, and grab the loot before the tide pulls you onward. Every island ends with a stash worth the risky leap.',
  'greedygnomes': 'Garden tower defense: place towers along the gnomes\' path to stop them stealing your vegetables, then upgrade what works as the raids get bolder. Position for overlapping range rather than lining the first opening, and spend early gold on a strong core. Hold the garden through every wave.',
  'captainroger': 'Take Captain Roger\'s ship through asteroid fields and alien swarms in a top-down space shooter. Strafe to dodge incoming fire while keeping your guns on the nearest threat, and grab power-ups that drift past to upgrade your loadout. Clear each sector before the screen overwhelms you.',
  'jellydoods': 'Help the wobbly Jelly Doods creatures reach their goal across a slippery world of physics puzzles, stretching and bouncing them past hazards. Each squish changes how they move, so read the surface before you fling — a careless launch slides them into the pit. Patience beats force on every level.',
  'matchtime': 'Flip cards two at a time to uncover matching pairs before the timer drains — memory is the only weapon. Build a mental map of where each symbol hid after a failed flip, and chase the pairs you already half-remember. Clear the deck before the clock beats you.',
  'stickpanda': 'Guide a stick-figure panda across bamboo bridges and ledges in a precision platformer where one mistimed step means a fall. Judge each gap by feel rather than sight, and keep a steady rhythm through the trickier stretches. Reach the far side without tumbling into the ravine.',
  'zapaliens': 'Zap descending alien invaders before they land in this neon arcade shooter with a difficulty curve that never lets up. Move to keep a lane open, and prioritize the formations that drop fastest. Chain quick kills to build a score that climbs as fast as the invasion.',
};

const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
const bySlug = new Map(games.map(g => [normalizeHref(g.link), g]));

let aboutApplied = 0, noindexFlipped = 0, alreadyHad = 0, missing = [];

for (const [slug, text] of Object.entries(ABOUT)) {
  const g = bySlug.get(slug);
  if (!g) { missing.push(slug); continue; }
  if (!g.about) { g.about = text; aboutApplied++; }
  else alreadyHad++;
  if (g.noindex) { g.noindex = false; noindexFlipped++; }
}

const shown = games.filter(g => g.show);
const withAbout = shown.filter(g => g.about && g.about.length > 40).length;
const noindexLeft = shown.filter(g => g.noindex).length;

console.log(`ABOUT:       ${aboutApplied} applied, ${alreadyHad} already had content${missing.length ? `, MISSING SLUGS: ${missing.join(', ')}` : ''}`);
console.log(`NOINDEX:     ${noindexFlipped} flipped false (was noindex)`);
console.log(`COVERAGE:    ${withAbout}/${shown.length} show games with real content | noindex remaining: ${noindexLeft}`);

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to update games.json.');
} else {
  fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2) + '\n', 'utf8');
  console.log('\n✅  games.json updated. Next: npm run build (regenerates game pages + sitemap).');
}

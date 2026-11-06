#!/usr/bin/env node
/**
 * tools/content/apply-content-batch-4.cjs
 *
 * Content-depth batch 4. Same shape as batch 3, different intent: batch 3 was
 * the pilot and is still under observation (ops gate G1, verdict 2026-11-27).
 * Batch 4 is PREPARED NOW, APPLIED LATER — this file exists so that the gate
 * result can be acted on with one command instead of a fresh authoring pass.
 *
 * HOLD CONDITION (rules/03-ops-cadence-rules.md §3, gate G1): do not run
 * `--apply`, rebuild or deploy before the 2026-11-27 verdict, and do not run it
 * at all if the verdict is "0 of 18 indexed" — in that case the constraint is
 * authority, and the effort belongs in 07-links instead.
 *
 * Copy rule: every `about` below is written from that game's own description
 * and mechanics. No shared sentence, no boilerplate suffix, no "free to play"
 * filler — tools/content/enrich-descriptions.cjs is the counter-example.
 *
 * Usage:
 *   node tools/content/apply-content-batch-4.cjs          # dry-run (safe)
 *   node tools/content/apply-content-batch-4.cjs --apply  # write games.json
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
  'bigredbutton': 'One red button, one warning telling you to leave it alone, and one obvious decision. Press it and the game answers with exactly the escalation the warning implied, then keeps going. Nothing here lets you lose — the only thing that grows is your suspicion that the instructions were the whole point.',
  'bloxslider': 'Every colored block on the grid belongs on a marked square, and a move only counts when the whole set sits on its targets. Sliding is one-way against walls, so a block shoved into a corner may already be lost. Count the moves before you push; the level rarely gives you a second chance.',
  'balanceball': 'Arrow keys or a tilt of the device roll the ball, and the platform is narrower than your correction. Speed makes the edge arrive faster than the input does, so small taps beat held keys. One slip past the rim ends the run, and the banded pixel scenery offers no net.',
  'bdot': 'A dot is always moving and the barriers never stop sliding, so survival is a question of reading the gap one beat before it opens. Hitting a wall costs the run, not a life. Short sessions, because your timing degrades before the game does.',
  'blackbats': 'Bats come down in waves and drift sideways as they fall, so the shot that would have hit a second ago now misses. Track the leading edge of the flock rather than the closest wing, and keep a lane clear for the stragglers. The screen fills faster than the waves suggest.',
  'circlepong': 'The paddles travel around the inside of a ring instead of up and down a court, which removes every corner you would normally hide in. Each bounce arrives at a new angle from a new direction. Reading the approach early matters more than reacting quickly.',
  'circletris': 'Blocks fall toward a ring you rotate, and each one only counts if it lands in the colour zone that matches it. Turning the board to meet a piece also turns the piece you were about to receive, so order the rotation rather than chasing it. Full zones clear and reopen space at the top.',
  'dropcircle': 'Gravity does the only thing it can and you decide when, dropping a circle through layer after layer of spinning rings. Each opening is a moving target and the fall is permanent, so the whole game is spent waiting for the right half-second. Later layers rotate out of phase with each other.',
  'cheeselab': 'A laboratory maze stands between a mouse and the cheese at the far end, with dead ends arranged to look like corridors. The route is fixed but the camera is not generous, so most of the work is remembering which branch already failed. Reach the plate at the end of each level to open the next experiment.',
  'duckwater': 'Water carries the rubber duck whether or not you steer, and the drain at the bottom of each level is the only exit. Currents push toward the obstacles you were avoiding, so aim upstream of where you want to end up. Tap to swim against the flow and let it carry you the rest of the way.',
  'icecream': 'Scoops arrive one at a time and the tower has to stay standing, which makes every placement a question about weight rather than height. Off-centre scoops lean, lean compounds, and the collapse is always sudden. Chase height only while the base still looks honest.',
  'sortbird': 'Birds arrive in mixed colours and the perches are limited, so no two of the same kind may end up sharing one. That single rule turns a calm sorting game into a sequencing problem: the bird you park early decides which birds become impossible later. Fewer free perches means fewer legal moves.',
  'squarecrush': 'Falling squares only disappear when same-coloured ones are crushed together, so the grid rewards patience and punishes tidiness. Merge early to keep the floor clear, or stack deliberately and collapse a large group for the bigger score. The stack rises whether or not you have decided.',
  'frog': 'Flies cross the frog\'s field of view on their own schedule, and the tongue reaches only as far as it reaches. Flick at the wrong moment and the fly is already gone; wait for the right one and another lands behind you. Reflexes decide the score, not planning.',
  'pieattack': 'Pies arrive from the front and there is nowhere to go but left or right, so the game becomes a reading test: which arc is already covered, which side is about to open. Stand still and one finds your face. The barrage does not pause for a breath.',
  'rainbox': 'Rain falls on its own and the buckets below are colour-coded, so the only decision is where each drop should land before it reaches the rim. Small corrections early beat large ones late. A quiet, precise game that punishes inattention rather than speed.',
  'targetap': 'Bullseyes appear and expire on a timer that shortens as the run continues, and a few misses end it outright. Accuracy keeps the run alive; hesitation does not. Best played in short bursts, because the pattern rewards a warm hand and punishes a tired one.',
  'slotchicken': 'A chicken operates the lever and the reels decide everything, which is the joke and also the mechanic. Matching symbols pay out, near-misses pay nothing, and the bird keeps pulling regardless. Pure chance, presented with the sincerity of a casino floor.',
};

const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
const bySlug = new Map(games.map(g => [normalizeHref(g.link), g]));

let aboutApplied = 0, noindexFlipped = 0, alreadyHad = 0, missing = [];
const applied = [];

for (const [slug, text] of Object.entries(ABOUT)) {
  const g = bySlug.get(slug);
  if (!g) { missing.push(slug); continue; }
  if (!g.about) { g.about = text; aboutApplied++; applied.push(slug); }
  else alreadyHad++;
  if (g.noindex) { g.noindex = false; noindexFlipped++; }
}

const shown = games.filter(g => g.show);
const withAbout = shown.filter(g => g.about && g.about.length > 40).length;
const noindexLeft = shown.filter(g => g.noindex).length;

console.log(`ABOUT:       ${aboutApplied} applied, ${alreadyHad} already had content${missing.length ? `, MISSING SLUGS: ${missing.join(', ')}` : ''}`);
console.log(`NOINDEX:     ${noindexFlipped} flipped false (was noindex)`);
console.log(`COVERAGE:    ${withAbout}/${shown.length} show games with real content | noindex remaining: ${noindexLeft}`);
console.log(`SCOPE:       at apply time also add these ${applied.length} slugs to scripts/sitemap-scope.json (gate G2):\n  ${applied.join(', ')}`);

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Gate G1 verdict is 2026-11-27; do not --apply before it.');
} else {
  fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2) + '\n', 'utf8');
  console.log('\n✅  games.json updated. Next: add the slugs to sitemap scope, then npm run build (needs CODEBUDDY_SAFE_DELETE_ENABLED=0).');
}

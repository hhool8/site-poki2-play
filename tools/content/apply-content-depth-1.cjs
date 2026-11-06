#!/usr/bin/env node
/**
 * tools/content/apply-content-depth-1.cjs
 *
 * Depth experiment, sample 1 (4 games).
 *
 * Context: the 2026-11-06 audit found every indexable page carries ~47 words of
 * editorial copy, and a structural fact that matters more - that copy only ever
 * existed inside <noscript>, which js/app.js deletes on load, and the SPA
 * renders neither an h1 nor the about text. A JS-rendering crawler therefore saw
 * a game page with no unique body text at all.
 *
 * This batch does both halves of the fix on a small sample:
 *   1. data: a long multi-paragraph `about`, a hand-written `howToPlay` and a
 *      `tips` list, all unique to the game (no template sentences);
 *   2. flag: `depth: true`, which makes scripts/generate-game-pages.cjs render
 *      the copy into the real DOM as <section class="game-article">.
 *
 * Sample choice: indexable (not noindex - so the noindex flag is not a
 * confound), currently "Crawled - currently not indexed", recently crawled, and
 * deliberately disjoint from batch-3 and batch-4 so the two experiments cannot
 * contaminate each other.
 *
 * Usage:
 *   node tools/content/apply-content-depth-1.cjs           # dry run
 *   node tools/content/apply-content-depth-1.cjs --apply
 */

'use strict';

const fs = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', '..', 'games.json');
const APPLY = process.argv.includes('--apply');

const DEPTH = {
  miniputt: {
    about: [
      'Mini-putt is miniature golf with honest physics: every hole is a short course of slopes, walls and obstacles, and the entire game is one decision - how hard to hit the ball and in which direction. There are no power-ups, no timers and no opponents, so a hole is either solved or it is not.',
      'The courses read like putting greens rather than obstacle courses. Slopes curve the ball after it lands, walls turn a straight shot into a rebound, and an overhit ball can wander back past your feet. The further you go, the more the holes ask for a bank shot instead of a direct line.',
      'Progress is scored the way golf is scored: every hole has a par, and finishing under it matters more than finishing quickly. Because the ball keeps its momentum, the skill is not aiming at the hole - it is aiming at the point where the slope will carry the ball the rest of the way.',
    ].join('\n\n'),
    howToPlay:
      'Choose a direction, set the strength of the putt, then send the ball away and let the course do the rest. Read the slope before committing: a putt that arrives at the cup with speed left will roll past it, so aim to arrive slow. When a wall sits between you and the hole, play the rebound instead of trying to curve around it, and treat every bounce as an extra shot you can plan for. Each hole resets the ball, so a ruined hole costs strokes but never progress.',
    tips: [
      'On a downhill green, hit roughly half the power you think you need. The slope supplies the rest, and an overhit putt usually ends further from the cup than it started.',
      'Walls are more predictable than they look: the angle you arrive at is the angle you leave at, so line up a bank shot before attempting a narrow gap.',
      'Play for par rather than for the highlight. Two safe putts beat one hero shot that rebounds off three walls.',
      'Look at where the hole sits relative to the slope, not relative to the ball. The last third of the putt is what decides where it stops.',
    ],
  },

  ctr: {
    about: [
      'Cut the Rope is a physics puzzle with one verb: cut. A piece of candy hangs from ropes above Om Nom, and the job is to sever them in an order that swings the sweet into his mouth instead of past it, into spikes, or off the edge of the screen.',
      'The first levels need a single cut. Then the game adds bubbles that lift the candy, air cushions that puff it sideways, and spikes that punish a careless arc. Stars hang along the route, and the three-star solution is almost always a different cut order than the one that merely feeds him.',
      'The tension is that every cut is permanent. There is no undo, so a level is really a short plan: which rope holds the candy, which one builds the swing, and which one releases it at the moment the arc passes the mouth.',
    ].join('\n\n'),
    howToPlay:
      'Swipe across a rope, or click and drag through it, to cut it. The candy keeps whatever momentum it already has, so cutting the rope that holds it still drops it straight down, while cutting one side of a two-rope hold starts a swing. Time each cut to the swing rather than to your nerves: release too early and the candy falls short, too late and it sails past Om Nom. Pass through stars to collect them, and restart the level if a cut leaves you with no rope left to work with.',
    tips: [
      'Cut the rope that holds the candy last when you can. The swing you build with the other ropes is what carries it across a gap.',
      'A bubble is a pause button, not a lift: let it carry the candy up, then burst it at the top of the arc so the fall lands in the mouth.',
      'Chase stars on a second attempt. Going for all three on the first run usually means a cut order that cannot reach the mouth at all.',
      'When a level looks impossible, the answer is usually the rope you have been ignoring, not the one you keep cutting.',
    ],
  },

  babaisyou: {
    about: [
      'Baba Is You turns the rules into physical objects. Every level is a grid of words, and any sentence you can form from three blocks - NOUN IS PROPERTY - becomes true for as long as the sentence stands. Push the blocks around with your character and the world rewrites itself mid-move.',
      'The sentence BABA IS YOU is what makes you the small white creature. Break it and you stop being that thing; assemble WALL IS YOU and you become the wall. FLAG IS WIN is the goal, but the flag is only the goal while that sentence is intact - scatter it and the level has no win condition until you build a new one.',
      'Levels are built around the sentence you assume is fixed. The solution is usually to notice that one word in it is reachable, and that moving it is a legal move you have been treating as scenery.',
    ].join('\n\n'),
    howToPlay:
      'Move with the arrow keys or WASD, or swipe on a touch screen, and use the same input to push word blocks one tile at a time. You cannot pull, so a block pushed into a corner is stuck there. Read the sentences on the grid before moving: they tell you which noun is YOU, which object is WIN, and which nouns are STOP (they block you) or PUSH (they shift when you walk into them). If a level seems unwinnable, break a rule rather than solving it - pushing a word out of a sentence is often the entire puzzle.',
    tips: [
      'Find BABA IS YOU first. If you are not controlling Baba, another NOUN IS YOU sentence is running, and that noun is what you actually move.',
      'Words are the only objects that matter. Before planning a route, count which words you can reach without crossing something that is STOP.',
      'Breaking a sentence is a move. Removing WIN from the flag does not lose the level - it clears the old goal so you can build a new one.',
      'If a push traps a word in a corner and the level becomes unsolvable, restart instead of hunting for a workaround. The puzzle is the sentence, not the maze.',
    ],
  },

  'chrome-dino': {
    about: [
      'Chrome Dino is the runner that lives in Chrome\u2019s offline page, and it has stayed popular because it asks for exactly one skill: timing. A small dinosaur runs to the right through an empty desert, cacti and pterodactyls arrive from the right, and the only two things you can do are jump and duck.',
      'The difficulty is not in the obstacles but in the acceleration. The scroll speed climbs the longer you survive, so a gap cleared at 200 points becomes a reflex problem at 800, and the same cactus pattern that felt generous starts arriving with no time to think. The palette inverts as the score climbs, which is the game\u2019s only way of saying it has got faster.',
      'There is no final level and no ending screen. A run lasts until one mistimed jump, which makes this a game about attention rather than strategy: most long runs end because the player stopped watching the ground.',
    ].join('\n\n'),
    howToPlay:
      'Jump with space or the up arrow and duck with the down arrow; on a touch screen the same two actions are available on tap. Running into a cactus ends the run, so duck under a pterodactyl that flies high and jump over one that flies low. Do not hold the jump: a short tap clears a low obstacle and lands you in time for the next one, while a long press leaves you in the air with nothing left to give. The score counts up in the corner and the speed rises with it, so the objective is not to win but to keep the run alive.',
    tips: [
      'Duck instead of jumping when a bird is high. Jumping into a high pterodactyl is the most common way a good run ends.',
      'Tap jump, never hold it. A short press lands you before the next cactus; a held press strands you above it with no second jump.',
      'Watch the space between obstacles, not the dinosaur. Your eyes should sit a screen ahead of the sprite you control.',
      'The game speeds up without announcing it. When the pattern starts feeling fast, that is the game and not your nerves - shorten the jump, not the reaction.',
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
    `${APPLY ? 'APPLY ' : 'would '} ${slug.padEnd(13)} about=${String(words(data.about)).padStart(3)}w ` +
    `htp=${String(words(data.howToPlay)).padStart(3)}w tips=${data.tips.length} total=${total}w ` +
    `noindex=${game.noindex === true}`
  );
  if (APPLY) {
    game.about = data.about;
    game.howToPlay = data.howToPlay;
    game.tips = data.tips;
    game.depth = true;
    if (game.noindex === true) game.noindex = false;
  }
  applied++;
}

if (APPLY && applied) fs.writeFileSync(GAMES, JSON.stringify(games, null, 2) + '\n');

console.log(
  `\n${APPLY ? 'applied' : 'would apply'}: ${applied}  missing: ${missing}` +
  `\nremaining noindex: ${games.filter((g) => g.show && g.noindex).length}`
);
if (!APPLY) console.log('dry run - pass --apply to write games.json');

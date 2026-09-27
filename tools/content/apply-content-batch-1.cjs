#!/usr/bin/env node
/**
 * tools/content/apply-content-batch-1.cjs
 *
 * Content-depth batch 1 for GSC indexing health (see seo-content-audit.md).
 *
 * Two actions, merged into games.json (never overwrites existing values):
 *   1. ABOUT  — hand-authored, game-specific body content (2-4 sentences of
 *      real gameplay mechanics + a concrete tip). Emitted by
 *      generate-game-pages.cjs into the noscript fallback, i.e. the text
 *      Google actually indexes. Written only for games where the content is
 *      verifiably accurate.
 *   2. NOINDEX — obscure derivative micro-games with no search demand and no
 *      realistic path to unique content. Pages get <meta robots noindex,
 *      follow> and are dropped from sitemap.xml. Reversible: remove the slug
 *      from this list (or add an `about`) and the page returns to the index.
 *
 * Usage:
 *   node tools/content/apply-content-batch-1.cjs            # dry-run
 *   node tools/content/apply-content-batch-1.cjs --apply    # write games.json
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

// ── Hand-authored content (batch 1: 67 games) ────────────────────────────────
const ABOUT = {
  '2048': 'Slide tiles with the arrow keys — identical numbers merge into their sum. The board fills up fast, so the classic strategy is to keep your highest tile locked in one corner and build a descending chain around it. Never swipe toward the corner where your big tile sits, and think one merge ahead before each move.',
  'among-us': 'A social deduction game for 4-15 players: crewmates run around the ship completing tasks while hidden impostors sabotage systems and pick them off one by one. As a crewmate, finish tasks and vote out the impostor; as an impostor, lie your way through emergency meetings. Watching who was alone near a body — and whose task bar never moved — wins games.',
  'basketball-stars': '1v1 or 2v2 basketball duels where you steal, dribble and shoot with simple controls. Timing beats spamming: fake a shot to send the defender jumping past you, then take the easy bucket. On defense, hold your position rather than lunging — a mistimed steal leaves you flat-footed.',
  'babaisyou': 'Every rule on the level grid is made of movable word tiles: push "BABA IS YOU", "WALL IS STOP" or "FLAG IS WIN" to rewrite how the world works. There is often more than one winning rule set — if the obvious solution is blocked, try making a different object "IS YOU", or push "WIN" somewhere new.',
  'breakingthebank': 'A short choose-your-path comedy from the Henry Stickmin collection: you are trying to break into a bank vault, and every option is either genius or disastrous. Only one plan per scene works — the rest end in instant failure screens. The fun is in watching the wrong choices explode, so try everything.',
  'btts': 'A brutally precise platformer where a tiny square climbs one enormous tower, one checkpoint at a time. Spikes, swinging hammers and teleporting hazards are tuned to punish even a pixel of sloppy movement. Learn each section\'s rhythm instead of rushing — deaths are instant, checkpoints are generous, and the tower never changes.',
  'cannon-basketball-4': 'Puzzle levels where you fire basketballs from a cannon and must land a set number of balls in the hoop. Angles matter more than power: bank shots off walls are often the intended solution, and most levels hide a trick — teleporters, moving platforms, or blocks to break first.',
  'cell-machine': 'Build contraptions out of cells that spawn, move and replicate themselves to complete each level\'s goal. It is a friendly intro to cellular automata — start by copying the demo machines, then experiment: a single extra destroyer cell can unravel your whole build. There is no time pressure, so iterate freely.',
  'chrome-dino': 'The offline dinosaur runner from Chrome, playable full-screen: press space to jump cacti, duck under pterodactyls, and survive as the world speeds up. The trick to long runs is rhythm — jump on the beat of the cacti pattern rather than when panic says so, and duck-jump late birds.',
  'circlo': 'Tap to flip the rotation of a small circle orbiting the screen, threading gaps between obstacles to collect what they drop. It is pure reflex timing: short taps make micro-adjustments, and staying near the center of a gap beats hugging its edge. Mistakes compound fast, so reset your rhythm after any hit.',
  'connect3': 'A sped-up take on Connect Four — drop tokens into the grid and be the first to line up three in a row. With the shorter win condition, the center column is even more valuable, and most games are decided by the classic double-threat: build two lines that share one empty spot.',
  'csgo-clicker': 'An idle clicker with Counter-Strike flavor: click to fire, earn kills, and buy increasingly powerful guns that raise your damage per click. The progression loop is buy, outgrow the current round, repeat — prioritize upgrades that add passive income so kills keep flowing while you read the shop.',
  'ctr': 'Cut the Rope: cut ropes in the right order to swing a piece of candy into Om Nom\'s mouth, collecting stars along the way. Physics is everything — momentum from one swing should feed the next cut, and bubbles, spikes and air cushions turn later levels into little Rube Goldberg puzzles.',
  'ctr-holiday': 'Cut the Rope\'s Christmas edition: the same rope-cutting physics wrapped in festive levels with new gadgets — rockets and Christmas stockings that store and launch candy. Plan the whole candy route before the first cut; rushing usually wastes your one good swing.',
  'ctr-tr': 'Cut the Rope Time Travel sends Om Nom and his ancestors through history, from the Stone Age to the future. Each era adds a second mouth to feed, which means one candy must do double duty. Watch how chains and rockets interact before cutting; most levels hinge on one perfectly timed slash.',
  'cupcake2048': 'The bakery-themed 2048: slide cupcakes, and matching kinds merge into the next size up. Strategy is identical to the classic — pin your biggest cupcake in a corner and never build toward it — but the ladder of pastry tiers makes chains much easier to read than raw numbers.',
  'deal-or-no-deal': 'Pick one of 26 briefcases, then open the rest while the banker calls in lowball offers. The math is simple expected value: compare each offer to the average of the remaining case values, and never swap at the end unless you enjoy coin flips. The drama is pretending the decision is harder than it is.',
  'death-run-3d': 'A first-person take on the endless runner: sprint down a neon corridor, dodge blocks, and survive as the speed climbs. Look two obstacles ahead rather than at your feet, and use small strafes — wide swings at this speed are how runs end.',
  'defend-the-tank': 'Place troops around your tank and hold off waves of attackers coming from every direction. Positioning wins: put cheap blockers where the enemy funnels in and your damage dealers behind them, and save your special abilities for the waves that actually leak through.',
  'doge2048': '2048 with Shiba Inu meme tiers instead of numbers — every merge evolves the doge toward its legendary final form. Because the tiles read as faces rather than values, trust position over intuition: corner-lock the biggest doge and run a snake pattern with the smaller ones.',
  'doodle-jump': 'Bounce a four-legged doodle ever upward, steering between platforms while dodging monsters, UFOs and black holes. Springs and propellers buy big altitude — the key skill is reading platform types ahead: brown platforms break, blue ones move, white ones crumble after one bounce.',
  'draw-the-hill': 'Draw a road with your finger or mouse and the car drives across whatever line you made. The trick is smooth gradients: steep lines stall the engine, while long descending curves build speed for jumps. Coins reward routes that use momentum instead of scribbled bridges.',
  'endlesswar3': 'A top-down WWII shooter with destructible cover, drivable vehicles and dozens of missions. Keep moving between sandbag positions — standing still invites grenades — and capture enemy machine guns whenever the map offers one; they shred incoming waves.',
  'evil-glitch': 'A retro platformer where the game itself glitches against you: tiles vanish, colors invert mid-jump, and the rules break on purpose. Treat every failed run as data — the glitches follow patterns, and surviving means learning them rather than reacting. Precision beats speed.',
  'flappy-bird': 'Tap to flap between green pipe gaps in the notoriously unforgiving one-button classic. The bird\'s physics are floaty, so small, early taps beat big corrections — aim for the middle of each gap and keep your tap rhythm steady instead of chasing the exact center.',
  'geodash': 'A Scratch-built version of Geometry Dash: one button controls everything as an auto-running cube leaps spikes, flies through portals, and dies instantly on any mistake. Memorization is the mechanic — learn the level in chunks, and do not change your timing between attempts.',
  'getaway-shootout': 'Two criminals race to the getaway vehicle using only jump and shoot — no walking. The weapon pickups are deliberately absurd, and the trick to most maps is controlling the high ground; shooting the obstacle blocking the shortcut you cannot reach yet often opens it.',
  'grindcraft': 'A Minecraft-themed idle game where you grind resources and follow the crafting tree from wooden picks to nether gear. Keep every worker slot busy — villagers mine while you click — and prioritize food and tool upgrades in that order; the wood-to-iron bottleneck is where most players stall.',
  'helicopter': 'The classic cave-flyer: hold to rise, release to fall, and thread the helicopter through an ever-narrowing cave. Gravity is constant and jerkiness is death — the winning style is long, gentle hover adjustments, planning your line two obstacles ahead instead of dodging each one.',
  'hexgl': 'A WebGL futuristic racer in the spirit of F-Zero: airbrake through banked corners, ride the boost strips, and keep your ship off the walls. Airbraking before the turn apex — not during — is the difference between a clean line and scraping the barrier.',
  'interactivebuddy': 'A physics sandbox starring a ragdoll you can pummel with baseball bats, grenades, fire hoses and rockets. Cash earned from each hit unlocks new weapons and skins. There is no fail state — the fun is chaining explosions and watching the indestructible buddy ragdoll across the room.',
  'just-one-boss': 'A minimalist bullet-hell boss rush: one screen, one boss, dozens of attack phases, and instant death on contact. Every phase teaches a dodge pattern — learn the tells, then re-run with confidence. It is short but punishing; the final phase is fair, just fast.',
  'krunker': 'A fast browser FPS with Counter-Strike-style movement: bunny-hop, slide and flick with low input latency across classic modes and custom maps. Movement is the skill ceiling — slide-hopping makes you nearly unhittable, and learning one map\'s sightlines beats changing loadouts.',
  'meme2048': '2048 reskinned with internet meme faces as tiles — merge tiers until you assemble the final meme. The strategy is the same corner-lock approach as the original; the joke tiles actually help you spot merge chains faster than plain numbers do.',
  'minecraft': 'Eaglercraft: the full Minecraft experience running in a browser — mine, craft, build and survive creepers in a procedurally generated world, single player or on servers. It is a faithful 1.5.2 build, so the classic opening holds: punch wood, craft tools, light your base before nightfall.',
  'minesweeper': 'The classic logic puzzle: numbers tell you how many of the eight surrounding cells hide mines, and deduction — not luck — clears the board. Look for the 1-2-1 and 1-2-2-1 patterns, flag only when certain, and guess only when the math leaves no alternative.',
  'miniputt': 'Miniature golf with clean physics: read the slope, set the power, and sink putts under par. Bank shots off walls are more reliable than straight lines on most holes, and gentle taps on downhill greens beat firm ones — the ball breaks more than your eye says.',
  'missiles': 'Pilot an aircraft while a storm of homing missiles chases you: lure them into each other, dodge terrain, and grab pickups to turn defense into offense. The core skill is herding — fly wide circles so missile clusters bunch up, then break the pattern at the last second.',
  'n-gon': 'A minimalist but punishing arena survival: steer an n-sided polygon through waves of spinning blades, homing shapes and bullets while collecting upgrades. Movement is inertia-based, so small corrections early prevent oversteering; prioritize shields before firepower.',
  'pacman': 'The arcade original: eat pellets while four ghosts hunt you, each with a distinct personality — Blinky chases, Pinky ambushes, Inky flanks, Clyde wanders. Power pellets flip the hunt for a few seconds, and the tunnel\'s safety is real but the fruit score is rarely worth the crossing.',
  'papaspizzaria': 'Papa\'s Pizzeria: take orders, top pizzas, bake and slice to order while customers wait. The station-hopping time pressure is the game — start baking as soon as toppings are on, and cut into the exact portions ordered; sloppy slices cost as much as burnt crusts.',
  'paperio2': 'Claim territory in Paper.io 2: loop out of your color, enclose land, and return before anyone cuts your tail. Small loops beat greedy ones early — the players who die are the ones circling for one more chunk. Turning inside your own color is always safe.',
  'push-the-square': 'A grid puzzle about steering a square with placed arrow tiles: the square follows your arrows to the goal, but the grid fills up and careless placements block later paths. Work backwards from the goal — the last two moves constrain everything before them.',
  'rolly-vortex': 'Rotate a ring around a falling ball, dodging spikes and gaps in an endless descending vortex. The screen scrolls at a fixed pace, so panic-rotations overshoot — short, rhythmic flicks keep the gap aligned, and gems are only worth grabbing on clear stretches.',
  'snakebird': 'A delightfully cruel puzzle game: snake-birds eat fruit to grow one segment, then must reach an exit — while gravity drags every ungrounded segment down. Long snakes become bridges and ladders; before each move, check which segment is supported, because falling is permanent.',
  'soldier-legend': 'A side-scrolling military platformer: run through war zones, upgrade weapons between missions and clear out enemy camps. Crouch-fire behind cover conserves health, and grenades are better spent on clusters than single enemies — ammo pickups appear after most waves.',
  'solitaire': 'Klondike Solitaire: build the four foundation piles ace-to-king by suit while rearranging the tableau in descending, alternating colors. Always unlock face-down cards first, keep at least one empty column as working space, and avoid sending cards to the foundation too early — they can still be useful.',
  'stack': 'Stack blocks one on top of another; overhanging slices are shaved off, so precision decides how long the tower lasts. The blocks drift at a steady tempo — tap on rhythm, and after losing width, aim blocks back to center rather than chasing the widest edge.',
  'stealingthediamond': 'The Henry Stickmin heist: infiltrate a museum and steal a giant diamond by picking between absurd tools at each decision point. Only one choice per scene succeeds — the wrong ones are instant (and funny) game overs, so the game is really about seeing every ending.',
  'stickwar': 'Stick War: command an army of stick figures — miners gather gold, swordwrath rush, archidons rain arrows — while defending your statue and destroying the enemy\'s. Economy first: a second miner early outperforms almost any unit rush, and controlling units directly lets you micro the melee.',
  'stormthehouse2': 'Defend your house from waves of stick figures by shooting them down, then spend the earnings between waves on guns, turrets and walls. Save for the turret early — it keeps firing while you reload — and always repair the wall before buying toys you do not need.',
  'swerve': 'Steer a ball along a narrowing winding track, tilting through curves that tighten as speed builds. The trick is looking far up the track and pre-tilting into the curve\'s direction — small constant inputs stay on the line while late jerks fly off it.',
  'temple-run-2': 'The endless runner that defined the genre: sprint through cliffside temples, tilt to collect coins, jump gaps and slide under fire. The mine-cart and zip-line diversions reset the difficulty curve, and corners — not obstacles — are where most runs end. Turn early.',
  'the-final-earth': 'Build a vertical city on a floating island in space: place homes, workplaces and food buildings while keeping citizens happy and resources flowing. Cluster service buildings within walking range — citizens only reach nearby jobs, so a well-placed market beats three new houses.',
  'there-is-no-game': 'A comedy meta-adventure where the narrator insists there is nothing to play — and punishes you for proving otherwise. Click, drag and misuse everything: the "wrong" interactions are the intended path. It is short, genuinely funny, and the puzzles are fair despite the misdirection.',
  'thisistheonlylevel': 'One level, dozens of variations: the goal (guide a blue elephant to the exit pipe) never changes, but the physics do — gravity flips, controls reverse, walls vanish. Read the level\'s title each run; it usually hints the gimmick. The failures are the tutorial.',
  'tosstheturtle': 'Toss the Turtle: load a turtle into a cannon and launch it across a minefield of spikes, chainsaws and bombs, each hit extending the flight. Earnings buy bigger cannons, jetpacks and better ammo — prioritize multipliers early, and aim your trajectory at clouds of hazards, not clear sky.',
  'tube-jumpers': 'Up to four players bounce on floating tubes above water, timing jumps to avoid waves and knock rivals off. It is a last-one-standing party game — safe play stays near the tube centers, but the winner is whoever balances greedy hops with the next big wave.',
  'vex3': 'Vex 3: a stickman platformer across acts of spikes, saws, moving blocks and wall-jumps, with checkpoints and speedrun timers. Wall-jumping is the core skill — slide down a wall and jump at the moment you start sliding. The challenge mode\'s hazards are all things you have already survived once.',
  'vex4': 'Vex 4 pushes the stickman platformer further: new acts built around zip lines, water sections and tighter wall-jump chains. Deaths are instant and checkpoints frequent, so experiment with routes — the fast lines usually involve jumping before the safe-looking platform.',
  'vex6': 'Vex 6 adds fire and ice hazards, collapsing platforms and a fresh set of nine acts to the stickman series. Collect stars on alternate routes after your first clean pass — the star lines demand the trickiest wall-jumps the series has asked for.',
  'wordle': 'Guess the five-letter word in six tries: green means right letter, right spot; yellow means right letter, wrong spot. Open with vowel-rich starters like AUDIO or CRANE, and on the third guess hunt for consonant clusters rather than new vowels — eliminating common letters matters more than guessing the word.',
  'crossyroad': 'An endless take on Frogger: hop forward across roads, rivers and rail tracks, where cars, logs and trains punish hesitation and greed alike. Move in bursts when a lane clears, hug the far side of logs, and listen — the train warning sound buys you the time hesitation would waste.',
  'trollboxing': 'A silly boxing brawler between two trolls: punch, duck and uppercut with timing-based controls. The AI telegraphs its swings — duck the hook, answer with a body shot, and save uppercuts for the moment an opponent finishes a whiffed heavy punch.',
  'zombiescantjump': 'Hold the wall against waves of zombies: aim, shoot and repair barricades while managing limited ammo. Headshots save bullets, and the reload rhythm matters more than raw firepower — keep one clip in reserve for the stragglers that always come last.',
  'zcj2': 'The sequel to Zombies Can\'t Jump: more weapons, more zombies and tougher barricade-defense waves. Upgrade damage before fire rate, keep repairing during lulls, and save grenades for the armored zombies that shrug off pistol rounds.',
  'blackknight': 'Swing a sword as the Black Knight defending the keep: time swings against waves of invaders climbing the walls. Upgrades between waves matter more than raw clicking — armor keeps you alive to swing, and the sword\'s arc hits multiple climbers, so wait for them to bunch.',
};

// ── noindex list (batch 1) ───────────────────────────────────────────────────
// Obscure derivative micro-games: no search demand, no realistic path to
// unique content right now. noindex,follow + removed from sitemap.
// Reversible — remove a slug here (or write it an `about`) to re-index it.
const NOINDEX = [
  'battleforgondor','bigredbutton','blockclaimio','runneryodas','cubeninja',
  'battleday','crkarmax','dronewars','luxahoy','sambogart','ninjakidvszb',
  'spacecowboy','silverarrow','gimme-the-airpod','thebattle','theheist',
  'alienattack','balanceball','bdot','blackbats','bloxslider','bottomtight',
  'bravebird','brokenhorn','bubblecn','candyfusion','captainroger','captainwar',
  'catonfire','cavejumper','cboxes','cheeselab','chipman','christmasballs',
  'circleball','circlepong','circletris','cninjas','cowboyrun','cowboyshot',
  'craigenstone','dangerous','darkninja','deathsoul','donteattrash','dotgame',
  'dropcircle','duckwater','elmore','escape','evilrobot','evilwyrm','fastgame',
  'firebrigade','fishingfrenzy','flapcatcopters','flapcatxmas','flappydog',
  'flyingschool','foxfury','freedomroad','frog','fullimmersion','funnysoccer',
  'gettwelve','goblinmachine','gofishing','goingnuts','greedygnomes',
  'greenwings','groovyski','grubhub','gumballrace','hanselandgretel','hidden',
  'hungrybob','icecream','jellydoods','jomjom','jumpkitty',
  'jumpman','jumppydragon','knightnday','lizardrocket','looneyroonks','manic',
  'matchtime','monstercandy','monstereater','mousejump','nest','ninjarun',
  'ninjaway','ojelloonline' /* Nitrome-era puzzle, keep indexed */,'pancakeboss','pandaflash','pebbleboy','penguin',
  'pieattack','pigeon','piggyroll','piratekid','pitana','popup','portalrunner',
  'pyramidjump','raccoonrun','rainbox','rapunzel','rectangzings','robotion',
  'rocketpop','ropeninja','runpixierun','sallybbq','skylands','skyrace',
  'slotchicken','sortbird','squarecrush','stevenkash',
  'stickpanda','stickpandaxmas','sticksamurai','stickygoo','strangespace',
  'taptapsubmarine','targetap','titanrunner','tooncup','trailblazer',
  'trashndash','uforun','veggirabbit','woodblock','xtypesky','zapaliens',
  'zombienight','zombieworld','zoostuner',
];

// Featured games must never be noindexed.
const PROTECTED = new Set(['bubblefish','foofoo','mathgame','ninjablade']);

const games = JSON.parse(fs.readFileSync(GAMES_PATH, 'utf8'));
const bySlug = new Map(games.map(g => [normalizeHref(g.link), g]));

let aboutApplied = 0, aboutSkipped = 0, noindexApplied = 0, noindexProtected = 0;
const missingAbout = [], missingNoindex = [];

for (const [slug, text] of Object.entries(ABOUT)) {
  const g = bySlug.get(slug);
  if (!g) { missingAbout.push(slug); continue; }
  if (g.about) { aboutSkipped++; continue; }
  g.about = text;
  aboutApplied++;
}

for (const slug of NOINDEX) {
  if (PROTECTED.has(slug)) continue;
  const g = bySlug.get(slug);
  if (!g) { missingNoindex.push(slug); continue; }
  if (g.noindex) continue;
  g.noindex = true;
  noindexApplied++;
}

// Coverage snapshot
const shown = games.filter(g => g.show);
const withAbout = shown.filter(g => g.about).length;
const noindexed = shown.filter(g => g.noindex).length;
const indexed = shown.length - noindexed;
const stillThin = shown.filter(g => !g.noindex && !g.about).length;

console.log(`ABOUT:      ${aboutApplied} applied, ${aboutSkipped} already had content${missingAbout.length ? `, MISSING SLUGS: ${missingAbout.join(', ')}` : ''}`);
console.log(`NOINDEX:    ${noindexApplied} applied${PROTECTED.size ? `, ${noindexProtected} protected (featured) skipped` : ''}${missingNoindex.length ? `, MISSING SLUGS: ${missingNoindex.join(', ')}` : ''}`);
console.log(`COVERAGE:   ${shown.length} show games -> ${withAbout} with real content | ${indexed} indexed | ${noindexed} noindexed | ${stillThin} indexed but still thin (batch 2 queue)`);

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to update games.json.');
} else {
  fs.writeFileSync(GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');
  console.log(`\n✅  games.json updated. Next: npm run generate:gamepages && npm run generate:sitemap`);
}

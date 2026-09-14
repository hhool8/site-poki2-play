#!/usr/bin/env node
/**
 * scripts/generate-home-static.cjs
 *
 * Prerenders the homepage category sections (server-side style) into
 * dist/index.html between the <!--HOME-STATIC:START--> and
 * <!--HOME-STATIC:END--> markers, so crawlers and no-JS users see real
 * content (fixes "Server Side Rendering" and "Missing H3" SEO checks).
 *
 * The SPA (js/app.js) clears #game-sections on init and re-renders the
 * same sections client-side, so JS users are unaffected.
 *
 * Run AFTER generate:gamepages / generate:tagpages (they extract the
 * body from dist/index.html and must NOT embed the prerendered home
 * content — they strip the markers defensively anyway).
 *
 * Usage: node scripts/generate-home-static.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIST  = path.join(__dirname, '..', 'dist');
const GAMES = path.join(__dirname, '..', 'games.json');
const INDEX = path.join(DIST, 'index.html');

const START = '<!--HOME-STATIC:START-->';
const END   = '<!--HOME-STATIC:END-->';

// Keep in sync with TAG_META / TAG_ORDER / SECTION_LIMIT in js/app.js
const TAG_META = {
  action:      { emoji: '\u{1F4A5}', label: 'Action' },
  adventure:   { emoji: '\u{1F5FA}\uFE0F', label: 'Adventure' },
  arcade:      { emoji: '\u{1F47E}', label: 'Arcade' },
  competitive: { emoji: '\u{1F3C6}', label: 'Competitive' },
  idle:        { emoji: '\u{1F579}\uFE0F', label: 'Idle' },
  multiplayer: { emoji: '\u{1F465}', label: 'Multiplayer' },
  platformer:  { emoji: '\u{1F3C3}', label: 'Platformer' },
  puzzle:      { emoji: '\u{1F9E9}', label: 'Puzzle' },
  racing:      { emoji: '\u{1F3CE}\uFE0F', label: 'Racing' },
  shooting:    { emoji: '\u{1F52B}', label: 'Shooting' },
  sports:      { emoji: '\u26BD', label: 'Sports' },
  strategy:    { emoji: '\u265F\uFE0F', label: 'Strategy' },
};
const TAG_ORDER = [
  'action', 'puzzle', 'adventure', 'racing', 'shooting', 'multiplayer',
  'competitive', 'strategy', 'idle', 'arcade', 'sports', 'platformer',
];
const SECTION_LIMIT = 12;

function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeHref(link) {
  try {
    const u = new URL(link);
    let p = u.pathname.replace(/\/+$/, '');
    if (!p) p = u.hostname.split('.')[0];
    return p.split('/').pop() || link;
  } catch {
    return link;
  }
}

// Mirror the SPA visibility rules (strict opt-in for show / avalid-desktop)
function canShowDesktop(game) {
  if (game.show === undefined || game.show === null || game.show === false) return false;
  if (game.avalid === undefined || game.avalid === null) return false;
  if (Array.isArray(game.avalid)) return game.avalid.includes('desktop');
  return true;
}

function cardHtml(game) {
  const slug = normalizeHref(game.link);
  const char = slug[0].toLowerCase();
  const href = `/game/${char}/${slug}/`;
  const img  = game.imgSrc || `/icons/${char}/${slug}/icon-192.png`;
  const title = esc(game.title || slug);
  return `            <a class="game-card" href="${esc(href)}" aria-label="Play ${title}">
              <img class="game-card-img" src="${esc(img)}" alt="${title}" width="200" height="200" loading="lazy">
              <span class="game-card-info"><h3 class="game-card-title">${title}</h3></span>
            </a>`;
}

function sectionHtml(tag, games) {
  const meta = TAG_META[tag] || { emoji: '\u{1F3B2}', label: tag };
  const cards = games.slice(0, SECTION_LIMIT).map(cardHtml).join('\n');
  return `        <section class="category-section" id="section-${tag}">
          <div class="section-header">
            <h2 class="section-title"><span class="emoji">${meta.emoji}</span> ${esc(meta.label)} Games</h2>
            <a class="see-all" href="/tag/${tag}/">See all</a>
          </div>
          <div class="game-grid">
${cards}
          </div>
        </section>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (!fs.existsSync(INDEX)) {
  console.error('dist/index.html not found — run build:copy first');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(GAMES, 'utf8'));
const seen = new Set();
const games = raw.filter(g => {
  const key = ((g.link || g.title || '') + '').toString().toLowerCase().trim();
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
}).filter(canShowDesktop);

const tagMap = {};
for (const g of games) {
  const tags = Array.isArray(g.tags) && g.tags.length ? g.tags : ['other'];
  for (const t of tags) (tagMap[t] = tagMap[t] || []).push(g);
}

const sections = [];
for (const tag of TAG_ORDER) {
  const list = tagMap[tag] || [];
  if (list.length) sections.push(sectionHtml(tag, list));
}

const html = fs.readFileSync(INDEX, 'utf8');
const re = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!re.test(html)) {
  console.error('HOME-STATIC markers not found in dist/index.html');
  process.exit(1);
}
const out = html.replace(re, `${START}\n${sections.join('\n')}\n        ${END}`);
fs.writeFileSync(INDEX, out, 'utf8');
console.log(`\u2705  Prerendered ${sections.length} home sections into dist/index.html`);

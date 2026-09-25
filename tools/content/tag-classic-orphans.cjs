#!/usr/bin/env node
/* Add "classic" tag to games whose pages are not internally linked (orphans). Idempotent. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist');
const games = require(path.join(ROOT, 'games.json'));

const slugOf = link => {
  const m = String(link).replace(/\/+$/, '').match(/\/([^/]+)$/);
  return m ? m[1].toLowerCase() : '';
};
const pageUrlOf = g => {
  const s = slugOf(g.link);
  return s ? `/game/${s[0]}/${s}/` : null;
};

// collect all internal /game/ links from home + tag pages
const linked = new Set();
const addLinks = (html) => {
  for (const m of html.matchAll(/href="(\/game\/[a-z0-9-]+\/[a-z0-9-]+\/)"/g)) linked.add(m[1]);
};
addLinks(fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'));
const tagDir = path.join(DIST, 'tag');
for (const t of fs.readdirSync(tagDir)) {
  const f = path.join(tagDir, t, 'index.html');
  if (fs.existsSync(f)) addLinks(fs.readFileSync(f, 'utf8'));
}

let added = 0;
const touched = [];
for (const g of games) {
  if (g.show === false) continue;
  const u = pageUrlOf(g);
  if (!u || linked.has(u)) continue;
  if (!Array.isArray(g.tags)) g.tags = [];
  if (!g.tags.includes('classic')) { g.tags.push('classic'); added++; touched.push(u); }
}

fs.writeFileSync(path.join(ROOT, 'games.json'), JSON.stringify(games, null, 2) + '\n');
console.log(`Added "classic" tag to ${added} games`);
console.log(touched.join('\n'));

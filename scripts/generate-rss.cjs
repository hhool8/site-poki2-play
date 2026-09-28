'use strict';
/**
 * generate-rss.cjs — RSS 2.0 feed of quality pages (featured + about-content games).
 *
 * Google treats feeds as a freshness/crawl-discovery signal ( submitted via
 * robots.txt / pushed to aggregators). pubDate reuses the real per-URL lastmod
 * from the sitemap sidecar so feed items only "change" when content changed.
 *
 * Output: dist/rss.xml + root rss.xml (same dual-write convention as sitemap).
 */
const fs   = require('fs');
const path = require('path');

const BASE     = 'https://play.poki2.online';
const DIST     = path.join(__dirname, '..', 'dist');
const GAMES    = path.join(__dirname, '..', 'games.json');
const SIDECAR  = path.join(__dirname, 'sitemap-lastmod.json');
const OUT      = path.join(DIST, 'rss.xml');
const SRC_OUT  = path.join(__dirname, '..', 'rss.xml');
const MAX_ITEMS = 50;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const games = JSON.parse(fs.readFileSync(GAMES, 'utf8')).filter(g => g.show);
let sidecar = {};
try { sidecar = JSON.parse(fs.readFileSync(SIDECAR, 'utf8')); } catch {}

function slugOf(game) {
  try {
    const p = new URL(game.link).pathname.replace(/\/+$/, '');
    return p ? p.split('/').pop() : '';
  } catch { return ''; }
}
function pageUrl(slug) {
  return `${BASE}/game/${slug[0].toLowerCase()}/${slug}/`;
}
function lastmodFor(url) {
  const e = sidecar[`page ${url}`];
  return e ? e.lastmod : new Date().toISOString().slice(0, 10);
}
function rfc822(d) {
  return new Date(d + 'T12:00:00Z').toUTCString();
}

// Quality pages only: featured games, then games with hand-authored about
// content (batch 1/2). Skip noindex entries defensively.
const featured = games.filter(g => g.featured && !g.noindex);
const authored = games.filter(g => !g.featured && g.about && !g.noindex);
const picked = [...featured, ...authored].slice(0, MAX_ITEMS);

const now = new Date().toUTCString();
const items = picked.map(g => {
  const slug = slugOf(g);
  if (!slug) return '';
  const url   = pageUrl(slug);
  const desc  = (g.about || g.description || '').trim().slice(0, 300);
  const img   = g.imgSrc ? (g.imgSrc.startsWith('http') ? g.imgSrc : BASE + g.imgSrc) : '';
  const lines = [
    '    <item>',
    `      <title>${esc(g.title)} — Play Free Online</title>`,
    `      <link>${url}</link>`,
    `      <guid isPermaLink="true">${url}</guid>`,
    `      <pubDate>${rfc822(lastmodFor(url))}</pubDate>`,
  ];
  if (img) lines.push(`      <enclosure url="${esc(img)}" type="image/webp" length="0"/>`);
  lines.push(`      <description>${esc(desc)}</description>`);
  lines.push('    </item>');
  return lines.join('\n');
}).filter(Boolean).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Poki2 — Free Online Games</title>
    <link>${BASE}/</link>
    <description>New and featured free browser games on Poki2: action, puzzle, classic and more. No downloads, instant play.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

fs.writeFileSync(OUT, xml, 'utf8');
fs.writeFileSync(SRC_OUT, xml, 'utf8');
console.log(`RSS: ${picked.length} items (featured ${featured.length} + about ${authored.length}) -> dist/rss.xml`);

#!/usr/bin/env node
/* Audit dist game pages for GSC indexing blockers. Read-only. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist');
const GAME_DIR = path.join(DIST, 'game');

// collect game pages
const pages = [];
for (const l1 of fs.readdirSync(GAME_DIR)) {
  const d1 = path.join(GAME_DIR, l1);
  if (!fs.statSync(d1).isDirectory()) continue;
  for (const l2 of fs.readdirSync(d1)) {
    const f = path.join(d1, l2, 'index.html');
    if (fs.existsSync(f)) pages.push({ url: `/game/${l1}/${l2}/`, file: f });
  }
}

function field(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const issues = { noCanonical: [], noindex: [], noH1: [], thin: [], dupTitle: {}, dupDesc: {} };
const titleMap = new Map(), descMap = new Map();
let canonicalOk = 0, wordCounts = [];

for (const p of pages) {
  const html = fs.readFileSync(p.file, 'utf8');
  const expect = 'https://play.poki2.online' + p.url;
  const canon = field(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/) || field(html, /<link[^>]+href="([^"]+)"[^>]+rel="canonical"/);
  const robots = field(html, /<meta[^>]+name="robots"[^>]+content="([^"]+)"/i);
  const title = field(html, /<title>([^<]*)<\/title>/);
  const desc = field(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  const hasH1 = /<h1[\s>]/i.test(html);
  const words = visibleText(html).split(' ').filter(w => w.length > 1).length;
  wordCounts.push(words);

  if (!canon) issues.noCanonical.push(p.url);
  else if (canon !== expect) issues.noCanonical.push(`${p.url} -> ${canon}`);
  else canonicalOk++;
  if (robots && /noindex/i.test(robots)) issues.noindex.push(p.url);
  if (!hasH1) issues.noH1.push(p.url);
  if (words < 150) issues.thin.push(`${p.url} (${words}w)`);
  if (title) {
    const t = title.toLowerCase();
    if (!titleMap.has(t)) titleMap.set(t, []); titleMap.get(t).push(p.url);
  }
  if (desc) {
    const d = desc.toLowerCase();
    if (!descMap.has(d)) descMap.set(d, []); descMap.get(d).push(p.url);
  }
}
for (const [t, urls] of titleMap) if (urls.length > 1) issues.dupTitle[t] = urls;
for (const [d, urls] of descMap) if (urls.length > 1) issues.dupDesc[d] = urls;

// sitemap coverage
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace('https://play.poki2.online', '')));
const notInSitemap = pages.filter(p => !sitemapUrls.has(p.url)).map(p => p.url);
const sitemapOnly = [...sitemapUrls].filter(u => u.startsWith('/game/')).filter(u => !fs.existsSync(path.join(DIST, u, 'index.html')));

// internal link coverage: does each game URL appear in home or any tag page?
const homeHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const linkSources = new Map();
const addLinks = (html, src) => {
  for (const m of html.matchAll(/href="(\/game\/[a-z0-9-]+\/[a-z0-9-]+\/)"/g)) {
    const u = m[1];
    if (!linkSources.has(u)) linkSources.set(u, []);
    linkSources.get(u).push(src);
  }
};
addLinks(homeHtml, '/');
const tagDir = path.join(DIST, 'tag');
for (const t of fs.readdirSync(tagDir)) {
  const f = path.join(tagDir, t, 'index.html');
  if (fs.existsSync(f)) addLinks(fs.readFileSync(f, 'utf8'), `/tag/${t.replace('.html','')}/`);
}
const orphans = pages.filter(p => !linkSources.has(p.url)).map(p => p.url);

// report
const avg = (wordCounts.reduce((a,b)=>a+b,0)/wordCounts.length).toFixed(0);
const min = Math.min(...wordCounts);
console.log(`=== GAME PAGE INDEX AUDIT (${pages.length} pages) ===`);
console.log(`canonical ok: ${canonicalOk}/${pages.length}  | noindex: ${issues.noindex.length} | missing H1: ${issues.noH1.length}`);
console.log(`text length: avg ${avg} words, min ${min}; thin(<150w): ${issues.thin.length}`);
console.log(`duplicate titles: ${Object.keys(issues.dupTitle).length} groups; duplicate descriptions: ${Object.keys(issues.dupDesc).length} groups`);
console.log(`sitemap: ${sitemapUrls.size} urls; game pages not in sitemap: ${notInSitemap.length}; sitemap entries without page: ${sitemapOnly.length}`);
if (notInSitemap.length) console.log('  not in sitemap:', notInSitemap.join(', '));
if (sitemapOnly.length) console.log('  sitemap-only:', sitemapOnly.join(', '));
console.log(`internal-link orphans (not linked from home/tag): ${orphans.length}`);
if (orphans.length) console.log('  orphans:', orphans.slice(0, 30).join(', '));
for (const [k, list] of Object.entries({noCanonical: issues.noCanonical, noindex: issues.noindex, noH1: issues.noH1})) {
  if (list.length) console.log(`${k}:`, list.slice(0, 20).join(', '));
}
if (Object.keys(issues.dupTitle).length) {
  console.log('dup title groups (first 10):');
  for (const [t, urls] of Object.entries(issues.dupTitle).slice(0, 10)) console.log(`  "${t.slice(0,60)}" x${urls.length}: ${urls.slice(0,5).join(', ')}${urls.length>5?' ...':''}`);
}
if (Object.keys(issues.dupDesc).length) {
  console.log('dup desc groups (first 10):');
  for (const [d, urls] of Object.entries(issues.dupDesc).slice(0, 10)) console.log(`  "${d.slice(0,60)}" x${urls.length}: ${urls.slice(0,5).join(', ')}${urls.length>5?' ...':''}`);
}
if (issues.thin.length) console.log('thin pages (first 30):', issues.thin.slice(0, 30).join(', '));

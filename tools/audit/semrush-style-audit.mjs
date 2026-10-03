#!/usr/bin/env node
/**
 * tools/audit/semrush-style-audit.cjs
 *
 * Semrush Site Audit replica for play.poki2.online.
 * Crawls every URL in the live sitemap.xml and checks the same issue
 * categories Semrush groups its audit into, each mapped to
 * Errors / Warnings / Notices:
 *
 *   Crawlability   : robots.txt, sitemap validity, 4xx/5xx, redirect chains,
 *                    noindex-in-sitemap, broken internal links
 *   HTTPS          : cert redirect http->https, mixed content, HSTS
 *   HTML & markup  : duplicate/missing/short/long titles & descriptions,
 *                    multiple/missing H1, missing img alt, canonical,
 *                    Open Graph, JSON-LD validity + required properties
 *   Content        : text-to-HTML ratio, low word count, cross-page
 *                    duplicate / near-duplicate content
 *   Internal linking: orphan pages, crawl depth from home, unreachable pages
 *   Performance    : TTFB, page size, compression, cache headers
 *
 * Usage:  node tools/audit/semrush-style-audit.mjs   (npm run audit:semrush)
 * Output: console summary + tools/audit/semrush-style-audit-report.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://play.poki2.online';
const OUT = path.join(__dirname, 'semrush-style-audit-report.md');
const CONCURRENCY = 8;
const TIMEOUT_MS = 15000;

// ── helpers ──────────────────────────────────────────────────────────────────
const issues = []; // {severity: 'error'|'warning'|'notice', category, title, pages: [...], detail}

function add(severity, category, title, pages, detail) {
  const key = `${severity}|${category}|${title}`;
  const found = issues.find(i => `${i.severity}|${i.category}|${i.title}` === key);
  if (found) found.pages.push(...pages);
  else issues.push({ severity, category, title, pages, detail });
}

function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return fetch(url, { ...opts, signal: ctrl.signal, redirect: opts.redirect || 'follow' })
    .finally(() => clearTimeout(t));
}

function absUrl(href, base) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

// ── 0. prerequisites: robots.txt, sitemap, root behavior ─────────────────────
const robots = await fetchWithTimeout(`${BASE}/robots.txt`).then(r => r.text()).catch(() => '');
const sitemapUrlInRobots = /sitemap:\s*(\S+)/i.exec(robots)?.[1];
if (!/user-agent:/i.test(robots)) add('error', 'Crawlability', 'robots.txt missing or invalid', [], `${BASE}/robots.txt returned no User-agent directive`);
if (!sitemapUrlInRobots) add('warning', 'Crawlability', 'Sitemap not declared in robots.txt', [], 'no "Sitemap:" line found');
else if (!sitemapUrlInRobots.startsWith('https://')) add('notice', 'HTTPS', 'Sitemap declared over non-HTTPS', [sitemapUrlInRobots]);

// http + www variants should redirect to canonical https origin
for (const variant of ['http://play.poki2.online/', 'https://www.play.poki2.online/', 'http://www.play.poki2.online/']) {
  try {
    const r = await fetchWithTimeout(variant, { redirect: 'follow' });
    if (r.url !== `${BASE}/`) add('error', 'HTTPS', 'Variant URL does not land on canonical HTTPS origin', [variant], `final url: ${r.url}`);
  } catch (e) { add('error', 'HTTPS', 'Variant URL unreachable', [variant],
      `${e.message || e} — requires an infra change, not a repo change: add a Cloudflare DNS record (CNAME www.play → play.poki2.online, proxied) + redirect rule to ${BASE}/`); }
}

// root sitemap must parse and be HTTPS
const sitemapXml = await fetchWithTimeout(`${BASE}/sitemap.xml`).then(r => r.text()).catch(() => '');
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urls.length) add('error', 'Crawlability', 'Sitemap unparsable or empty', [], `${BASE}/sitemap.xml`);
const nonHttps = urls.filter(u => !u.startsWith('https://'));
if (nonHttps.length) add('error', 'HTTPS', 'Sitemap contains non-HTTPS URLs', nonHttps);
const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
if (dupes.length) add('error', 'Crawlability', 'Duplicate URLs in sitemap', dupes);

// 404 behavior: a random non-existent path must return real 404
const nf = await fetchWithTimeout(`${BASE}/game/z/this-page-should-not-exist-9x7/`, { redirect: 'manual' });
if (nf.status !== 404) add('error', 'Crawlability', 'Soft 404: non-existent path does not return HTTP 404', [`${BASE}/game/z/this-page-should-not-exist-9x7/`], `status ${nf.status}`);

// ── 1. crawl every sitemap URL ───────────────────────────────────────────────
const pages = [];
async function crawl(url) {
  const t0 = Date.now();
  let res, body = '';
  try {
    res = await fetchWithTimeout(url);
    body = await res.text();
  } catch (e) {
    add('error', 'Crawlability', 'Sitemap URL unreachable (timeout/network)', [url], String(e.message || e));
    return;
  }
  const ttfb = Date.now() - t0;

  // Strip comments before parsing: "<h1>" inside a comment is not a heading.
  body = body.replace(/<!--[\s\S]*?-->/g, '');

  // redirect chain check (fetch follows; detect cross-host)
  if (new URL(res.url).pathname.replace(/\/+$/, '') !== new URL(url).pathname.replace(/\/+$/, ''))
    add('error', 'Crawlability', 'Sitemap URL redirects elsewhere', [url], `→ ${res.url}`);

  const lower = body.toLowerCase();
  const title = (/<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1] || '').trim();
  const desc = (/<meta\s+name="description"\s+content="([^"]*)"/i.exec(body)?.[1] || '').trim();
  const canonical = (/<link\s+rel="canonical"\s+href="([^"]*)"/i.exec(body)?.[1] || '').trim();
  const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(body);
  const h1s = [...body.matchAll(/<h1(\s[^>]*)?>/gi)].length;
  const h2s = [...body.matchAll(/<h2(\s[^>]*)?>/gi)].length;
  const ogTitle = /property="og:title"/i.test(body);
  const ogImage = /property="og:image"/i.test(body);
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  const imgsNoAlt = imgs.filter(t => !/\balt=/i.test(t));
  const imgsNoDims = imgs.filter(t => !/\bwidth=/i.test(t) || !/\bheight=/i.test(t));
  const jsonLds = [...body.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  let jsonLdBad = 0;
  for (const ld of jsonLds) { try { JSON.parse(ld); } catch { jsonLdBad++; } }
  const mixedContent = (body.match(/(?:src|href)="http:\/\/(?!play\.poki2\.online)[^"]*"/gi) || []);
  const htmlBytes = Buffer.byteLength(body);
  const textLen = body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  const textRatio = htmlBytes ? textLen / htmlBytes : 0;
  const enc = res.headers.get('content-encoding');
  const cache = res.headers.get('cache-control') || '';

  // links
  const links = [...body.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>/gi)].map(m => absUrl(m[1], url)).filter(u => u && u.startsWith('http'));
  // /cdn-cgi/ = Cloudflare email-protection rewrites, not real pages
  const internal = links.filter(u => new URL(u).hostname === 'play.poki2.online' && !u.includes('/cdn-cgi/'));
  const external = links.filter(u => new URL(u).hostname !== 'play.poki2.online');

  pages.push({ url, status: res.status, ttfb, title, desc, canonical, noindex, h1s, h2s, ogTitle, ogImage,
    imgsNoAlt: imgsNoAlt.length, imgsNoDims: imgsNoDims.length, jsonLds: jsonLds.length, jsonLdBad,
    mixedContent: mixedContent.length, htmlBytes, textRatio, enc, cache, internal, external, body });
}

const queue = [...urls];
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) { const u = queue.shift(); if (u) await crawl(u); }
});
await Promise.all(workers);

// ── 2. per-page checks (Semrush categories) ──────────────────────────────────
// Crawlability
add(pages.filter(p => p.status !== 200).length ? 'error' : 'notice', 'Crawlability',
  `Sitemap URLs returning non-200 (${pages.filter(p => p.status !== 200).length})`,
  pages.filter(p => p.status !== 200).map(p => `${p.status} ${p.url}`));
add(pages.filter(p => p.noindex).length ? 'error' : 'notice', 'Crawlability',
  `noindex on sitemap pages (${pages.filter(p => p.noindex).length})`,
  pages.filter(p => p.noindex).map(p => p.url), 'noindex + sitemap = contradictory signals');

// HTTPS
const mixed = pages.filter(p => p.mixedContent > 0);
if (mixed.length) add('error', 'HTTPS', 'Mixed content (http:// assets on https page)', mixed.map(p => `${p.url} (${p.mixedContent})`));

// Titles
const noTitle = pages.filter(p => !p.title);
if (noTitle.length) add('error', 'HTML & markup', 'Pages without <title>', noTitle.map(p => p.url));
const shortT = pages.filter(p => p.title && p.title.length < 30);
const longT = pages.filter(p => p.title.length > 65);
if (shortT.length) add('warning', 'HTML & markup', `Titles shorter than 30 chars (${shortT.length})`, shortT.map(p => `${p.title.length} "${p.title}" ${p.url}`));
if (longT.length) add('warning', 'HTML & markup', `Titles longer than 65 chars (${longT.length})`, longT.map(p => `${p.title.length} "${p.title}" ${p.url}`));
{
  const byT = new Map();
  for (const p of pages) { if (!p.title) continue; (byT.get(p.title) || byT.set(p.title, []).get(p.title)).push(p); }
  const dups = [...byT.entries()].filter(([, v]) => v.length > 1);
  if (dups.length) add('error', 'HTML & markup', `Duplicate titles (${dups.length})`, dups.map(([t, v]) => `${v.length}x "${t}" → ${v.map(x => x.url).join(', ')}`));
}

// Descriptions
const noDesc = pages.filter(p => !p.desc);
if (noDesc.length) add('error', 'HTML & markup', 'Pages without meta description', noDesc.map(p => p.url));
const shortD = pages.filter(p => p.desc && p.desc.length < 70);
const longD = pages.filter(p => p.desc.length > 165);
if (shortD.length) add('warning', 'HTML & markup', `Descriptions shorter than 70 chars (${shortD.length})`, shortD.map(p => `${p.desc.length} ${p.url}`));
if (longD.length) add('warning', 'HTML & markup', `Descriptions longer than 165 chars (${longD.length})`, longD.map(p => `${p.desc.length} ${p.url}`));
{
  const byD = new Map();
  for (const p of pages) { if (!p.desc) continue; (byD.get(p.desc) || byD.set(p.desc, []).get(p.desc)).push(p); }
  const dups = [...byD.entries()].filter(([, v]) => v.length > 1);
  if (dups.length) add('error', 'HTML & markup', `Duplicate meta descriptions (${dups.length})`, dups.slice(0, 10).map(([d, v]) => `${v.length}x "${d.slice(0, 60)}…" → ${v.map(x => x.url).join(', ')}`));
}

// H1 / headings
const noH1 = pages.filter(p => p.h1s === 0);
if (noH1.length) add('error', 'HTML & markup', `Pages without H1 (${noH1.length})`, noH1.map(p => p.url));
const multiH1 = pages.filter(p => p.h1s > 1);
if (multiH1.length) add('warning', 'HTML & markup', `Pages with multiple H1 (${multiH1.length})`, multiH1.map(p => `${p.h1s}x ${p.url}`));

// Images
const imgAlt = pages.filter(p => p.imgsNoAlt > 0);
if (imgAlt.length) add('warning', 'HTML & markup', `Images without alt attribute (${imgAlt.reduce((s, p) => s + p.imgsNoAlt, 0)} images on ${imgAlt.length} pages)`, imgAlt.map(p => `${p.imgsNoAlt} imgs ${p.url}`).slice(0, 30));
const imgDims = pages.filter(p => p.imgsNoDims > 0);
if (imgDims.length) add('notice', 'Performance', `Images without width/height (CLS risk) on ${imgDims.length} pages`, imgDims.map(p => `${p.imgsNoDims} imgs ${p.url}`).slice(0, 20));

// Canonical
const noCanonical = pages.filter(p => !p.canonical);
if (noCanonical.length) add('warning', 'HTML & markup', `Pages without canonical (${noCanonical.length})`, noCanonical.map(p => p.url));
const canonMismatch = pages.filter(p => p.canonical && p.canonical.replace(/\/+$/, '') !== p.url.replace(/\/+$/, ''));
if (canonMismatch.length) add('warning', 'HTML & markup', `Canonical differs from page URL (${canonMismatch.length})`, canonMismatch.map(p => `${p.url} → ${p.canonical}`));

// Open Graph
const noOg = pages.filter(p => !p.ogTitle || !p.ogImage);
if (noOg.length) add('warning', 'HTML & markup', `Pages with incomplete Open Graph (${noOg.length})`, noOg.map(p => p.url));

// JSON-LD
const badLd = pages.filter(p => p.jsonLdBad > 0);
if (badLd.length) add('error', 'HTML & markup', `Invalid JSON-LD (parse errors) on ${badLd.length} pages`, badLd.map(p => `${p.jsonLdBad} bad of ${p.jsonLds} ${p.url}`));
const noLd = pages.filter(p => p.jsonLds === 0);
if (noLd.length) add('warning', 'HTML & markup', `Pages without structured data (${noLd.length})`, noLd.map(p => p.url));

// Content: text-to-HTML ratio (Semrush flags < 10%)
const lowRatio = pages.filter(p => p.textRatio < 0.10);
if (lowRatio.length) add('warning', 'Content', `Low text-to-HTML ratio (<10%) on ${lowRatio.length} pages`, lowRatio.map(p => `${Math.round(p.textRatio * 100)}% ${p.url}`).slice(0, 30));

// Performance
// Performance: TTFB. A single sample is dominated by network/proxy jitter, so
// any slow page is re-tested once and only reported if it is slow again.
const slowCand = pages.filter(p => p.ttfb > 1200).sort((a, b) => b.ttfb - a.ttfb).slice(0, 25);
const slowConfirmed = [];
for (const p of slowCand) {
  const t = Date.now();
  try { await fetchWithTimeout(p.url); } catch { /* ignore */ }
  const second = Date.now() - t;
  if (second > 1200) slowConfirmed.push(`${p.ttfb}ms then ${second}ms ${p.url}`);
}
if (slowConfirmed.length) add('warning', 'Performance', `TTFB over 1200ms on re-test (${slowConfirmed.length} of ${slowCand.length} re-tested)`, slowConfirmed.slice(0, 15));
else if (slowCand.length) add('notice', 'Performance', `Transient TTFB spikes, not reproduced on re-test (${slowCand.length} pages)`,
  slowCand.slice(0, 5).map(p => `${p.ttfb}ms (single sample) ${p.url}`), 'network/proxy jitter on the auditing host; no server-side action');
const big = pages.filter(p => p.htmlBytes > 100 * 1024);
if (big.length) add('notice', 'Performance', `HTML over 100KB on ${big.length} pages`, big.map(p => `${Math.round(p.htmlBytes / 1024)}KB ${p.url}`));
const noEnc = pages.filter(p => !p.enc && p.htmlBytes > 2048);
if (noEnc.length) add('warning', 'Performance', `HTML not compressed on ${noEnc.length} pages`, noEnc.map(p => p.url));

// Cache headers on static assets
const assetResp = await fetchWithTimeout(`${BASE}/css/style.css`).catch(() => null);
if (assetResp) {
  const ac = assetResp.headers.get('cache-control') || '';
  if (!/max-age/i.test(ac)) add('warning', 'Performance', 'Static assets missing Cache-Control max-age', [`/css/style.css → "${ac}"`]);
  else if (!/immutable/i.test(ac)) add('notice', 'Performance', 'Static assets could use immutable caching', [`/css/style.css → "${ac}"`]);
}

// ── 3. broken internal links: verify targets are known-good ──────────────────
const known = new Set(urls.map(u => u.replace(/\/+$/, '')));
const sitePages = new Set(['/'].map(u => u)); // sitemap covers everything we publish
const linkTargets = new Map();
for (const p of pages) {
  for (const u of p.internal) {
    const clean = u.replace(/#.*$/, '').replace(/\/+$/, '');
    if (!clean) continue;
    if (!linkTargets.has(clean)) linkTargets.set(clean, []);
    linkTargets.get(clean).push(p.url);
  }
}
// Spot-check up to 60 unique internal targets not in the sitemap (assumed real pages)
const notInSitemap = [...linkTargets.keys()].filter(u => !known.has(u)).slice(0, 60);
const badTargets = [];
const checkQueue = [...notInSitemap];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (checkQueue.length) {
    const u = checkQueue.shift();
    if (!u) continue;
    try {
      const r = await fetchWithTimeout(u, { redirect: 'follow' });
      if (r.status >= 400) badTargets.push(`${r.status} ${u} (linked from ${linkTargets.get(u).slice(0, 3).join(', ')})`);
    } catch (e) { badTargets.push(`ERR ${u} (${String(e.message || e)})`); }
  }
}));
if (badTargets.length) add('error', 'Crawlability', `Broken internal links (${badTargets.length} of ${notInSitemap.length} spot-checked off-sitemap targets)`, badTargets);

// ── 3.5 extended Semrush-parity checks ───────────────────────────────────────
function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function words(text) { return text ? text.split(/\s+/).length : 0; }
function shingles(text, n = 5) {
  const w = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(' '));
  return set;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
const norm = u => u.replace(/#.*$/, '').replace(/\/+$/, '') || BASE;
const BASE_N = norm(BASE + '/');

for (const p of pages) {
  p.text = visibleText(p.body);
  p.wordCount = words(p.text);
}

// Content: low word count (Semrush "Low word count")
const thin = pages.filter(p => p.wordCount < 200);
if (thin.length) add('warning', 'Content', `Low word count (<200 words) on ${thin.length} pages`,
  thin.map(p => `${p.wordCount} words ${p.url}`).sort((a, b) => parseInt(a) - parseInt(b)).slice(0, 20));

// Content: cross-page duplicate / near-duplicate content
const sigs = pages.map(p => ({ url: p.url, sig: shingles(p.text) })).filter(s => s.sig.size > 0);
const dupPairs = [], nearPairs = [];
for (let i = 0; i < sigs.length; i++) {
  for (let j = i + 1; j < sigs.length; j++) {
    const s = jaccard(sigs[i].sig, sigs[j].sig);
    if (s >= 0.9) dupPairs.push([s, sigs[i].url, sigs[j].url]);
    else if (s >= 0.8) nearPairs.push([s, sigs[i].url, sigs[j].url]);
  }
}
if (dupPairs.length) add('error', 'Content', `Duplicate content (>90% similarity) — ${dupPairs.length} page pairs`,
  dupPairs.sort((a, b) => b[0] - a[0]).slice(0, 10).map(([s, a, b]) => `${Math.round(s * 100)}% ${a} ≈ ${b}`));
if (nearPairs.length) add('warning', 'Content', `Near-duplicate content (80-90% similarity) — ${nearPairs.length} page pairs`,
  nearPairs.sort((a, b) => b[0] - a[0]).slice(0, 10).map(([s, a, b]) => `${Math.round(s * 100)}% ${a} ≈ ${b}`));

// Internal linking: orphan pages + crawl depth from the home page
const outEdges = new Map();
const inbound = new Map();
for (const p of pages) {
  const src = norm(p.url);
  const targets = new Set(p.internal.map(norm));
  outEdges.set(src, targets);
  for (const t of targets) {
    if (!inbound.has(t)) inbound.set(t, new Set());
    inbound.get(t).add(src);
  }
}
const depth = new Map([[BASE_N, 0]]);
const bfs = [BASE_N];
while (bfs.length) {
  const cur = bfs.shift();
  for (const t of (outEdges.get(cur) || [])) {
    if (depth.has(t)) continue;
    depth.set(t, depth.get(cur) + 1);
    if (outEdges.has(t)) bfs.push(t);
  }
}
const orphans = pages.filter(p => norm(p.url) !== BASE_N && !(inbound.get(norm(p.url))?.size));
if (orphans.length) add('warning', 'Internal linking', `Orphan pages (no inbound internal links) — ${orphans.length}`,
  orphans.map(p => p.url).slice(0, 20));
const deep = pages.filter(p => { const d = depth.get(norm(p.url)); return d !== undefined && d > 3; });
if (deep.length) add('notice', 'Internal linking', `Pages deeper than 3 clicks from home — ${deep.length}`,
  deep.map(p => `depth ${depth.get(norm(p.url))} ${p.url}`).slice(0, 20));
const unreach = pages.filter(p => !depth.has(norm(p.url)));
if (unreach.length) add('warning', 'Internal linking', `Pages unreachable from home by internal links — ${unreach.length}`,
  unreach.map(p => p.url).slice(0, 20));

// Internal links pointing at redirects (not final URLs)
const linkRedirects = [];
for (const p of pages) {
  for (const u of p.internal) {
    const target = norm(u);
    if (target === norm(p.url) || !known.has(target)) continue;
    if (u.replace(/\/+$/, '') !== u && !u.endsWith('/')) linkRedirects.push(`${p.url} → ${u}`);
  }
}
if (linkRedirects.length) add('notice', 'Internal linking', `Internal links using a non-canonical form — ${linkRedirects.length}`,
  [...new Set(linkRedirects)].slice(0, 10));

// Structured data: required properties per schema.org type
const LD_REQUIRED = {
  VideoGame: ['name'],
  BreadcrumbList: ['itemListElement'],
  FAQPage: ['mainEntity'],
  WebSite: ['name', 'url'],
  Organization: ['name'],
  WebPage: ['name'],
  ImageObject: ['url'],
  Offer: ['price', 'priceCurrency'],
};
const ldViolations = [];
for (const p of pages) {
  const blocks = [...p.body.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  for (const raw of blocks) {
    let obj;
    try { obj = JSON.parse(raw); } catch { continue; }
    const nodes = Array.isArray(obj) ? obj : (obj['@graph'] || [obj]);
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      for (const t of types) {
        const req = LD_REQUIRED[t];
        if (!req) continue;
        const missing = req.filter(k => n[k] === undefined || n[k] === null || (Array.isArray(n[k]) && !n[k].length));
        if (missing.length) ldViolations.push(`${p.url} — ${t} missing: ${missing.join(', ')}`);
      }
    }
  }
}
if (ldViolations.length) add('error', 'HTML & markup', `Structured data missing required properties — ${ldViolations.length}`,
  [...new Set(ldViolations)].slice(0, 15));

// HTTPS: HSTS header presence
{
  const rootResp = await fetchWithTimeout(`${BASE}/`).catch(() => null);
  const hsts = rootResp?.headers.get('strict-transport-security');
  if (!hsts) add('notice', 'HTTPS', 'Missing HSTS header (strict-transport-security)', [`${BASE}/`], 'enables HTTPS downgrade protection; Cloudflare: SSL/TLS → Edge Certificates → HSTS');
}

// ── 4. report ────────────────────────────────────────────────────────────────
const sev = s => issues.filter(i => i.severity === s);
const E = sev('error'), W = sev('warning'), N = sev('notice');
const order = { error: 0, warning: 1, notice: 2 };
issues.sort((a, b) => order[a.severity] - order[b.severity]);

const md = [];
md.push(`# Semrush-style Site Audit — ${BASE}`);
md.push('');
md.push(`> Live crawl of all ${urls.length} sitemap URLs, ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Issue categories mirror Semrush Site Audit, graded Errors / Warnings / Notices.`);
md.push('');
md.push(`## Scorecard`);
md.push('');
md.push(`| | issues |`);
md.push(`|---|---|`);
md.push(`| 🔴 Errors | ${E.length} |`);
md.push(`| 🟡 Warnings | ${W.length} |`);
md.push(`| 🔵 Notices | ${N.length} |`);
md.push(`| Pages crawled | ${pages.length} |`);
md.push(`| Avg TTFB | ${Math.round(pages.reduce((s, p) => s + p.ttfb, 0) / Math.max(1, pages.length))}ms |`);
{
  const sorted = pages.map(p => p.ttfb).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  md.push(`| Median TTFB | ${median}ms (single sample; network jitter on the auditing host dominates outliers) |`);
}
md.push(`| Compressed pages | ${pages.filter(p => p.enc).length}/${pages.length} |`);
md.push('');
for (const s of ['error', 'warning', 'notice']) {
  const icon = s === 'error' ? '🔴' : s === 'warning' ? '🟡' : '🔵';
  md.push(`## ${icon} ${s === 'error' ? 'Errors' : s === 'warning' ? 'Warnings' : 'Notices'}`);
  md.push('');
  const list = sev(s);
  if (!list.length) md.push('_none ✓_');
  for (const i of list) {
    md.push(`### ${i.category}: ${i.title}`);
    md.push('');
    if (i.detail) md.push(`> ${i.detail}`);
    md.push('');
    const shown = i.pages.slice(0, 15);
    for (const pg of shown) md.push(`- ${pg}`);
    if (i.pages.length > shown.length) md.push(`- …and ${i.pages.length - shown.length} more`);
    md.push('');
  }
}
fs.writeFileSync(OUT, md.join('\n'), 'utf8');

console.log(`\n=== Semrush-style audit — ${BASE} ===`);
console.log(`Errors: ${E.length} | Warnings: ${W.length} | Notices: ${N.length}`);
for (const i of issues) console.log(`  [${i.severity.toUpperCase().padEnd(7)}] ${i.category}: ${i.title}`);
console.log(`\n✅ Report → ${OUT}`);

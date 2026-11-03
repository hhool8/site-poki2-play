#!/usr/bin/env node
/**
 * generate-sitemap.cjs
 *
 * Sitemap with content-fingerprint lastmod automation (roadmap P6 #17).
 *
 * Every URL gets a content hash stored in scripts/sitemap-lastmod.json:
 *   - hash unchanged since last run  -> keep the previous <lastmod>
 *   - hash changed (or first run)    -> lastmod = today
 *
 * This makes lastmod truthful: Google only sees freshness signals for URLs
 * whose content actually changed, instead of a site-wide hardcoded date
 * reset on every deploy.
 *
 * Fingerprint sources:
 *   - game pages : game fields in games.json (title/desc/howToPlay/tags/...)
 *   - tag pages  : the rendered tag page (dist/tag/<t>/index.html), i.e. copy
 *                  AND game list. The sitemap step runs after generate:tagpages,
 *                  so the file is always present.
 *   - site pages : the source HTML file content
 */
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { tagUrlPath } = require('./tag-slugs.cjs');

// Sitemap scope (2026-11-04). Google crawled 70 of these 98 URLs and indexed
// none of them; the list was not buying attention, it was buying a verdict.
// Advertise the pages we stand behind. This is scope only — nothing is deleted,
// nothing is noindexed, and every page stays reachable from /game/ and the tag
// hubs. Reversible: drop an entry, rebuild.
const SCOPE = JSON.parse(fs.readFileSync(path.join(__dirname, 'sitemap-scope.json'), 'utf8'));

const BASE     = 'https://play.poki2.online';
const DIST     = path.join(__dirname, '..', 'dist');
const GAMES    = path.join(__dirname, '..', 'games.json');
const SIDECAR  = path.join(__dirname, 'sitemap-lastmod.json');
const OUT      = path.join(DIST, 'sitemap.xml');
const SRC_OUT  = path.join(__dirname, '..', 'sitemap.xml');
const TODAY    = new Date().toISOString().slice(0,10);
const CHECK    = process.argv.includes('--check');

// No trailing slash on the static pages: /about/ answers 308 -> /about, so listing
// the slashed form made the sitemap advertise a redirect as the canonical URL
// (and contradict each page's own <link rel="canonical">). Game pages are the
// opposite -- /game/<c>/<slug>/ is the URL that returns 200, so they keep the slash.
// Institutional pages (/about /privacy /terms /contact /dmca) are deliberately
// out of the advertised set — they are not search targets, and on a site with
// one indexed page every non-target URL in the list dilutes the signal.
const STATIC_PAGES = [
  ['/',            'index.html'],
];

const TAG_PAGES = ['puzzle','adventure','shooting','action','racing','sports','strategy','multiplayer','idle','arcade','platformer','competitive','classic']
	.filter(t => SCOPE.tags.includes(t));

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sha(s){ return crypto.createHash('sha1').update(s).digest('hex'); }
function normalizeHref(link){ try{ const u=new URL(link); let p=u.pathname.replace(/\/+$/,''); if(!p)p=u.hostname.split('.')[0]; return p.split('/').pop()||link;}catch{return link;} }

function absoluteImageUrl(imgSrc){
	if(!imgSrc) return null;
	const src = String(imgSrc).trim();
	if(!src) return null;
	if(/^https?:\/\//i.test(src)) return src;
	return src.startsWith('/') ? `${BASE}${src}` : `${BASE}/${src}`;
}

// --- lastmod store ---------------------------------------------------------

let store = {};
try { store = JSON.parse(fs.readFileSync(SIDECAR, 'utf8')); } catch { store = {}; }

let bumped = 0, kept = 0;
const stale = [];
function lastmodFor(key, contentHash){
	const prev = store[key];
	if(prev && prev.hash === contentHash && prev.lastmod){ kept++; return prev.lastmod; }
	bumped++;
	if(CHECK){ stale.push({ key, prev: prev ? prev.lastmod : null }); return prev ? prev.lastmod : TODAY; }
	store[key] = { hash: contentHash, lastmod: TODAY };
	return TODAY;
}

function url(loc, changefreq, priority, lastmod, imgSrc, imgTitle){
	const imageUrl = absoluteImageUrl(imgSrc);
	const imageBlock = (imageUrl && imgTitle) ? ['    <image:image>', `      <image:loc>${esc(imageUrl)}</image:loc>`, `      <image:title>${esc(imgTitle)}</image:title>`, '    </image:image>'].join('\n') : null;
	return ['  <url>', `    <loc>${esc(loc)}</loc>`, `    <lastmod>${esc(lastmod)}</lastmod>`, `    <changefreq>${esc(changefreq)}</changefreq>`, `    <priority>${esc(priority)}</priority>`, ...(imageBlock ? [imageBlock] : []), '  </url>'].join('\n');
}

if(!fs.existsSync(GAMES)){ console.error('games.json not found'); process.exit(1); }

const games = JSON.parse(fs.readFileSync(GAMES,'utf8'));
// noindex pages must not be in the sitemap (contradictory signals for Google)
const shown = games.filter(g => g.show && !g.noindex);
// Advertised games = the short list in sitemap-scope.json. `shown` is left
// intact above so tag membership / fingerprints keep describing the real
// catalogue; only the <url> entries are scoped.
const inScope = (slug) => SCOPE.games.includes(slug);

const lines = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"','        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">','','  <!-- Site pages -->'];
for(const [locPath, srcFile] of STATIC_PAGES){
	const file = path.join(__dirname, '..', srcFile);
	const hash = sha(fs.existsSync(file) ? fs.readFileSync(file,'utf8') : '');
	lines.push(url(`${BASE}${locPath}`,'daily','1.0', lastmodFor(`page ${locPath}`, hash), null, null));
}

lines.push('','  <!-- Tag / category pages -->');
const tagMembers = {};
for(const t of TAG_PAGES){
	tagMembers[t] = shown.filter(g => (g.tags||[]).includes(t)).map(g => normalizeHref(g.link)).sort();
}

// Fingerprint the rendered page, not just its membership list. The previous
// fingerprint was sha(JSON.stringify(tagMembers[t])) — which meant rewriting a
// tag page's title/H1/FAQ reported "no change", and the sitemap went on
// advertising a month-old lastmod for a page that had just been rewritten.
// `dateModified` is masked because the tag generator stamps today's UTC date
// into the JSON-LD on every build, which would otherwise bump all 13 tags daily.
function tagPageFingerprint(t){
	const file = path.join(DIST, ...tagUrlPath(t).split('/'), 'index.html');
	if(!fs.existsSync(file)) return sha(`missing:${t}:${JSON.stringify(tagMembers[t])}`);
	const html = fs.readFileSync(file, 'utf8').replace(/"dateModified":"[^"]*"/g, '"dateModified":""');
	return sha(html);
}
for(const t of TAG_PAGES){
	// Sidecar key stays `tag <internal key>` on purpose: the public slug can
	// change without losing the accumulated lastmod history behind it.
	lines.push(url(`${BASE}/${tagUrlPath(t)}/`,'weekly','0.8', lastmodFor(`tag ${t}`, tagPageFingerprint(t))));
}

lines.push('','  <!-- Per-game pages (static, with full OG + VideoGame JSON-LD) -->');
const seen = new Set(); let count = 0;
for(const game of shown){
	const slug = normalizeHref(game.link);
	if(!slug || seen.has(slug)) continue;
	seen.add(slug);
	if(!inScope(slug)) continue;
	const char = slug[0].toLowerCase();
	const loc = `${BASE}/game/${char}/${slug}/`;
	const priority = game.featured ? '0.9' : '0.7';
	const fingerprint = JSON.stringify([game.title, game.description, game.howToPlay, game.about, game.noindex, game.tags, game.input, game.featured, game.imgSrc, game.avalid, game.blog]);
	lines.push(url(loc,'monthly',priority, lastmodFor(`game ${slug}`, sha(fingerprint)), game.imgSrc||null, game.title||null));
	count++;
}
lines.push('','</urlset>','');

// --check: report drift without writing anything (exit 1 if the sidecar is behind).
if(CHECK){
	if(stale.length){
		console.log(`\u26a0\ufe0f  lastmod sidecar is STALE for ${stale.length} URL(s) \u2014 the next build would bump their lastmod:`);
		for(const s of stale.slice(0, 60)) console.log(`   - ${s.key} (was ${s.prev || 'new'})`);
		if(stale.length > 60) console.log(`   ... and ${stale.length - 60} more`);
		console.log('   Fix: run `npm run generate:sitemap` and commit scripts/sitemap-lastmod.json + sitemap.xml.');
		process.exitCode = 1;
	} else {
		console.log(`\u2705 lastmod sidecar in sync: ${kept} URL(s) unchanged, no drift.`);
	}
	return;
}

fs.writeFileSync(OUT, lines.join('\n'), 'utf8'); fs.writeFileSync(SRC_OUT, lines.join('\n'), 'utf8');
fs.writeFileSync(SIDECAR, JSON.stringify(store, null, 2) + '\n', 'utf8');
console.log(`\u2705  Wrote sitemap.xml with ${count} game URLs + ${TAG_PAGES.length} tag URLs \u2192 dist/ + source`);
console.log(`   lastmod: ${bumped} updated (content changed / first run), ${kept} kept (unchanged)`);

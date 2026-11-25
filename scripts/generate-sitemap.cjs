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
 *   - game pages : game fields in games.json (title/desc/howToPlay/about/tips/
 *                  depth/tags/...). Must list every field the page renderer
 *                  reads, or a change made only through an unlisted field
 *                  reports "no change" and the lastmod understates the edit.
 *   - tag pages  : the rendered tag page (dist/tag/<t>/index.html), i.e. copy
 *                  AND game list. The sitemap step runs after generate:tagpages,
 *                  so the file is always present.
 *   - site pages : the rendered homepage (dist/index.html), NOT the source
 *                  template — generate:home-static builds the served file, and
 *                  the source template is a different document entirely.
 */
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { tagUrlPath } = require('./tag-slugs.cjs');
const renderContract = require('./render-contract.cjs');

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

const TAG_PAGES = ['puzzle','adventure','shooting','action','racing','sports','strategy','multiplayer','idle','arcade','platformer','competitive']
	.filter(t => SCOPE.tags.includes(t));

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sha(s){ return crypto.createHash('sha1').update(s).digest('hex'); }
function normalizeHref(link){ try{ const u=new URL(link); let p=u.pathname.replace(/\/+$/,''); if(!p)p=u.hostname.split('.')[0]; return p.split('/').pop()||link;}catch{return link;} }

// --- volatile-token canonicalisation ---------------------------------------
// The sitemap step runs mid-pipeline, but `--check` runs against a FINISHED
// build. Later stages rewrite the HTML in ways that carry no editorial
// meaning, so hashing raw bytes made every URL look modified to the checker
// while the build itself correctly kept them unchanged. Canonicalise first,
// then hash; both states reduce to the same string.
//   - inject:version      __CACHE_VER__           -> ?v=<hex>
//   - hash:assets         ?v=<hex>                -> ?v=<hex>
//   - minify:html         collapses inter-tag whitespace and indentation
//   - dateModified (JSON-LD) is stamped with today's date on every build
function canonicalize(html){
	return String(html)
		.replace(/"dateModified":"[^"]*"/g, '"dateModified":""')
		.replace(/__CACHE_VER__/g, '__V__')
		.replace(/([?&]v=)[0-9a-f]{6,}/g, '$1__V__')
		.replace(/>\s+</g, '><')
		.replace(/\s+/g, ' ')
		.trim();
}

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

// Bumped whenever the fingerprint formula changes. A formula change must not be
// mistaken for a content change: that would stamp today's date on pages whose
// last real edit was weeks ago, which is the "advertise freshness we do not have"
// failure this file exists to prevent.
const FORMULA_VERSION = 3;

let bumped = 0, kept = 0, migrated = 0;
const stale = [];
function lastmodFor(key, contentHash, legacyHash){
	const prev = store[key];
	// Two ways to be unchanged:
	//   1. same formula, same hash            -> ordinary case
	//   2. legacy entry, old formula reproduces -> the formula moved, the bytes did not
	const sameFormula = prev && prev.v === FORMULA_VERSION && prev.hash === contentHash;
	const provablyUnchanged = prev && prev.v !== FORMULA_VERSION && legacyHash !== undefined && prev.hash === legacyHash;
	if(prev && prev.lastmod && (sameFormula || provablyUnchanged)){
		if(provablyUnchanged) migrated++; else kept++;
		if(!CHECK) store[key] = { hash: contentHash, lastmod: prev.lastmod, v: FORMULA_VERSION };
		return prev.lastmod;
	}
	// A legacy entry that neither matches nor can be proven unchanged: we cannot
	// tell "content edited" from "formula changed", and inventing a date is worse
	// than keeping a stale one, so keep the last known date and say so.
	if(prev && prev.lastmod && prev.v !== FORMULA_VERSION){
		migrated++;
		console.log(`   ~ ${key}: legacy fingerprint, content change not provable — kept ${prev.lastmod}`);
		if(!CHECK) store[key] = { hash: contentHash, lastmod: prev.lastmod, v: FORMULA_VERSION };
		return prev.lastmod;
	}
	bumped++;
	if(CHECK){ stale.push({ key, prev: prev ? prev.lastmod : null }); return prev ? prev.lastmod : TODAY; }
	store[key] = { hash: contentHash, lastmod: TODAY, v: FORMULA_VERSION };
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
// Fingerprint the served homepage, not the source template. `generate:home-static`
// writes dist/index.html; the repo-root index.html is a different document
// (33 KB vs 66 KB), so hashing the template reported "unchanged" no matter what
// actually shipped on the homepage.
// A fingerprint returns both hashes:
//   current — canonicalised, formula v2. This is what gets stored.
//   legacy  — exactly what formula v1 stored, so a v1 entry can be migrated
//             without pretending its content changed.
function homepageFingerprint(){
	const distFile = path.join(DIST, 'index.html');
	const srcFile  = path.join(__dirname, '..', 'index.html');
	if(!fs.existsSync(distFile)) return { current: sha('missing:dist/index.html'), legacy: sha('missing:dist/index.html') };
	const legacy = sha(fs.existsSync(srcFile) ? fs.readFileSync(srcFile, 'utf8') : '');
	return { current: sha(canonicalize(fs.readFileSync(distFile, 'utf8'))), legacy };
}

for(const [locPath, srcFile] of STATIC_PAGES){
	const fp = homepageFingerprint();
	lines.push(url(`${BASE}${locPath}`,'daily','1.0', lastmodFor(`page ${locPath}`, fp.current, fp.legacy), null, null));
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
// `dateModified` and the asset cache version are masked by canonicalize(),
// which would otherwise bump all 13 tags daily / on every deploy.
function tagPageFingerprint(t){
	const file = path.join(DIST, ...tagUrlPath(t).split('/'), 'index.html');
	if(!fs.existsSync(file)) {
		const missing = sha(`missing:${t}:${JSON.stringify(tagMembers[t])}`);
		return { current: missing, legacy: missing };
	}
	const html = fs.readFileSync(file, 'utf8');
	// v1 stored sha(html with only dateModified masked). Reproduced verbatim so a
	// v1 entry can be proven unchanged instead of silently re-dated.
	const legacy = sha(html.replace(/"dateModified":"[^"]*"/g, '"dateModified":""'));
	return { current: sha(canonicalize(html)), legacy };
}
for(const t of TAG_PAGES){
	// Sidecar key stays `tag <internal key>` on purpose: the public slug can
	// change without losing the accumulated lastmod history behind it.
	const fp = tagPageFingerprint(t);
	lines.push(url(`${BASE}/${tagUrlPath(t)}/`,'weekly','0.8', lastmodFor(`tag ${t}`, fp.current, fp.legacy)));
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
	// Three lists on purpose:
	//   current — what the page renderer actually reads, including `tips` and
	//             `depth`, PLUS the render rule's own decision (renderContract).
	//             `depth` alone is not enough: the rule's meaning changed on
	//             2026-11-25 while no games.json field did, so 92 pages began
	//             serving an article and the fingerprint said "unchanged". The
	//             rule now lives in render-contract.cjs and is hashed here.
	//   legacy  — v1's list verbatim. Without it, adding a field would look like a
	//             content edit on all 41 pages and re-date three weeks of work.
	const fields        = g => [g.title, g.description, g.howToPlay, g.about, g.tips, g.depth, g.noindex, g.tags, g.input, g.featured, g.imgSrc, g.avalid, g.blog, renderContract.isDepth(g)];
	const legacyFields  = g => [g.title, g.description, g.howToPlay, g.about, g.noindex, g.tags, g.input, g.featured, g.imgSrc, g.avalid, g.blog];
	lines.push(url(loc,'monthly',priority, lastmodFor(`game ${slug}`, sha(JSON.stringify(fields(game))), sha(JSON.stringify(legacyFields(game)))), game.imgSrc||null, game.title||null));
	count++;
}
lines.push('','</urlset>','');

// --check: report drift without writing anything (exit 1 if the sidecar is behind).
if(CHECK){
	// Legacy v1 entries are reported separately: their v1 hash was recorded
	// mid-pipeline, so `--check` (which reads a finished build) cannot reproduce
	// it. That is transitional noise from this formula change, not content drift,
	// and it disappears once the next real build rewrites the sidecar as v2.
	if(stale.length){
		console.log(`\u26a0\ufe0f  lastmod sidecar is STALE for ${stale.length} URL(s) \u2014 the next build would bump their lastmod:`);
		for(const s of stale.slice(0, 60)) console.log(`   - ${s.key} (was ${s.prev || 'new'})`);
		if(stale.length > 60) console.log(`   ... and ${stale.length - 60} more`);
		console.log('   Fix: run `npm run generate:sitemap` and commit scripts/sitemap-lastmod.json + sitemap.xml.');
		process.exitCode = 1;
	} else {
		const parts = [`${kept} URL(s) unchanged`];
		if(migrated) parts.push(`${migrated} legacy v1 URL(s) carried over without re-dating`);
		console.log(`\u2705 lastmod sidecar in sync: ${parts.join(', ')}, no drift.`);
	}
	return;
}

fs.writeFileSync(OUT, lines.join('\n'), 'utf8'); fs.writeFileSync(SRC_OUT, lines.join('\n'), 'utf8');
fs.writeFileSync(SIDECAR, JSON.stringify(store, null, 2) + '\n', 'utf8');
console.log(`\u2705  Wrote sitemap.xml with ${count} game URLs + ${TAG_PAGES.length} tag URLs \u2192 dist/ + source`);
console.log(`   lastmod: ${bumped} updated (content changed / first run), ${kept} kept (unchanged), ${migrated} migrated to formula v${FORMULA_VERSION} without re-dating`);

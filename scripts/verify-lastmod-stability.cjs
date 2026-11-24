#!/usr/bin/env node
'use strict';
/**
 * verify-lastmod-stability.cjs — guard against the lastmod checker fabricating drift.
 *
 * WHY THIS EXISTS
 * The sitemap step runs mid-pipeline, but `npm run verify:lastmod` reads a
 * FINISHED build. Later stages (inject:version, hash:assets, minify:html) rewrite
 * the HTML without changing what the page says. When the fingerprint hashed raw
 * bytes, the two states never matched, `--check` reported every URL as stale, and
 * the "fix" it suggested would have stamped today's date on three weeks of pages.
 * A checker that cries wolf is worse than no checker: it trains you to ignore it,
 * and the one time it is right you ship a lie.
 *
 * WHAT IS ASSERTED
 *   1. canonicalize() is idempotent.
 *   2. canonicalize() erases exactly the pipeline's volatile tokens
 *      (`__CACHE_VER__`, `?v=<hash>`, inter-tag whitespace, dateModified) and
 *      NOTHING else — a real copy edit must survive canonicalisation.
 *   3. Running the sitemap generator twice with the same inputs produces the same
 *      sidecar dates (no date churn from a rebuild alone).
 *
 * Exit 0 = stable, exit 1 = the fingerprint has drifted from these guarantees.
 */
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT     = path.join(__dirname, '..');
const SIDECAR  = path.join(__dirname, 'sitemap-lastmod.json');
const sha      = s => crypto.createHash('sha1').update(s).digest('hex');

// Kept byte-identical to canonicalize() in generate-sitemap.cjs. If the two ever
// disagree, this guard would bless a formula the generator does not actually use,
// so the copy is compared against the generator's source text below.
function canonicalize(html){
	return String(html)
		.replace(/"dateModified":"[^"]*"/g, '"dateModified":""')
		.replace(/__CACHE_VER__/g, '__V__')
		.replace(/([?&]v=)[0-9a-f]{6,}/g, '$1__V__')
		.replace(/>\s+</g, '><')
		.replace(/\s+/g, ' ')
		.trim();
}

const failures = [];
function check(name, ok, detail){
	if(ok) { console.log(`   ok  ${name}`); return; }
	failures.push(`${name}${detail ? ' — ' + detail : ''}`);
	console.log(`   FAIL ${name}${detail ? ' — ' + detail : ''}`);
}

// 1. idempotent ------------------------------------------------------------
const sample = '<!DOCTYPE html><html><head><title>A &amp; B</title></head>\n  <body>\n    <h1>Hi</h1>\n  </body></html>';
check('canonicalize is idempotent', canonicalize(canonicalize(sample)) === canonicalize(sample));

// 2. erases volatile tokens, preserves copy ---------------------------------
const midPipeline = '<div>\n    <a href="/css/style.css?v=__CACHE_VER__">x</a>\n    <p>Real sentence here.</p>\n    <script>{"dateModified":"2026-11-06"}</script>\n</div>';
const finished    = '<div><a href="/css/style.css?v=6135f7ea">x</a><p>Real sentence here.</p><script>{"dateModified":"2026-11-24"}</script></div>';
check('mid-pipeline and finished state hash equally',
	sha(canonicalize(midPipeline)) === sha(canonicalize(finished)));

const edited = finished.replace('Real sentence here.', 'Rewritten sentence here.');
check('a real copy edit still changes the hash',
	sha(canonicalize(edited)) !== sha(canonicalize(finished)),
	'a rewrite must never be canonicalised away');

// 3. generator source uses the same formula ---------------------------------
const genSrc = fs.readFileSync(path.join(__dirname, 'generate-sitemap.cjs'), 'utf8');
check('generator defines canonicalize()', /function canonicalize\(html\)/.test(genSrc));
check('generator masks __CACHE_VER__', /__CACHE_VER__/.test(genSrc));
check('generator masks hashed ?v=', /\[0-9a-f\]\{6,\}/.test(genSrc),
	'expected the [0-9a-f]{6,} character class in the query-string mask');
check('generator masks dateModified', /dateModified/.test(genSrc));
check('generator fingerprints rendered homepage, not source template',
	/homepageFingerprint/.test(genSrc) && /DIST, 'index\.html'/.test(genSrc));
check('game fingerprint includes tips and depth',
	/g\.tips/.test(genSrc) && /g\.depth/.test(genSrc),
	'these fields change what the page renders');

// 4. rebuild does not churn dates ------------------------------------------
function snapshot(){
	const s = JSON.parse(fs.readFileSync(SIDECAR, 'utf8'));
	return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.lastmod]));
}
function generate(){
	try {
		execFileSync('node', [path.join(__dirname, 'generate-sitemap.cjs')], { cwd: ROOT, stdio: 'pipe' });
	} catch (e) {
		failures.push(`generator failed: ${e.message}`);
	}
}
const before = snapshot();
generate();
const after1 = snapshot();
generate();
const after2 = snapshot();
check('two consecutive generator runs leave lastmod untouched',
	JSON.stringify(before) === JSON.stringify(after1) && JSON.stringify(after1) === JSON.stringify(after2),
	'a rebuild alone must never move a date');

if(failures.length){
	console.error(`\n\u274c lastmod fingerprint is NOT stable (${failures.length} failure(s)):`);
	for(const f of failures) console.error(`   - ${f}`);
	process.exit(1);
}
console.log('\n\u2705 lastmod fingerprint is stable: canonicalisation only erases build noise, real edits still register, rebuilds do not churn dates.');
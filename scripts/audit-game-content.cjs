#!/usr/bin/env node
/**
 * scripts/audit-game-content.cjs
 *
 * Content-depth audit for GSC indexing health.
 *
 * Root cause targeted: "Crawled / Discovered - currently not indexed" + soft-404.
 * Game pages emit a <noscript> block that IS the text Google indexes (the rest of
 * the page is JS-rendered). That block is templated: description + howToPlay
 * (which is just description with generic suffixes stripped) + 4 related games
 * + a 12-category nav that is byte-identical across all 219 pages.
 *
 * This script measures, per game:
 *   - total noscript text length (what Google actually sees as body content)
 *   - whether howToPlay is a substring of description (intra-page duplication)
 *   - description length, genre-tag count
 * and ranks the thinnest pages as noindex / consolidate candidates.
 *
 * Output: console summary + seo-content-audit.md (project root).
 *
 * Usage:  node scripts/audit-game-content.cjs
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', 'games.json');
const DIST  = path.join(__dirname, '..', 'dist');
const OUT   = path.join(__dirname, '..', 'seo-content-audit.md');
const BASE  = 'https://play.poki2.online';

const TAG_LABELS = {
  action:'Action',competitive:'Competitive',idle:'Idle',puzzle:'Puzzle',racing:'Racing',
  shooting:'Shooting',sports:'Sports',strategy:'Strategy',multiplayer:'Multiplayer',
  singleplayer:'Single Player',arcade:'Arcade',adventure:'Adventure',platformer:'Platformer',
  clicker:'Clicker',other:'Other'
};

function normalizeHref(link){ try{ const u=new URL(link); let p=u.pathname.replace(/\/+$/,''); if(!p) p=u.hostname.split('.')[0]; return p.split('/').pop()||link; }catch{ return link; } }

function stripTags(html){ return html.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#8592;/g,'<').replace(/\s+/g,' ').trim(); }

function extractNoscriptText(html){
  // pick the largest <noscript> block (the crawler fallback), not the tiny stylesheet one
  const blocks = [...html.matchAll(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi)].map(m=>m[1]);
  if(!blocks.length) return '';
  blocks.sort((a,b)=>b.length-a.length);
  return stripTags(blocks[0]);
}

// The category nav + "All games" link is byte-identical across every game page.
// Measure it once to subtract as boilerplate.
function measureBoilerplate(){
  const sample = path.join(DIST,'game','2','2048','index.html');
  if(!fs.existsSync(sample)) return 0;
  const html = fs.readFileSync(sample,'utf8');
  const m = html.match(/<nav aria-label="Game Categories">[\s\S]*?<\/nav>/i);
  const all = html.match(/<p><a href="\/">&#8592; All games<\/a><\/p>/i);
  let b=''; if(m) b+=stripTags(m[0]); if(all) b+=' '+stripTags(all[0]);
  return b.trim().length;
}

if(!fs.existsSync(GAMES)){ console.error('games.json not found'); process.exit(1); }
if(!fs.existsSync(DIST)){  console.error('dist/ not found — run build first'); process.exit(1); }

const games = JSON.parse(fs.readFileSync(GAMES,'utf8'));
const BOILER = measureBoilerplate();

const rows=[];
let missingFile=0, hasHowTo=0, dupCount=0, noHowTo=0, emitsHowTo=0;

for(const g of games){
  if(!g.show) continue;
  const slug = normalizeHref(g.link);
  const char = slug[0].toLowerCase();
  const file = path.join(DIST,'game',char,slug,'index.html');
  let noscriptLen=0, exists=true, html='';
  if(!fs.existsSync(file)){ exists=false; missingFile++; }
  else { html = fs.readFileSync(file,'utf8'); noscriptLen = extractNoscriptText(html).length; }

  const desc = (g.description||'').trim();
  const htp  = (g.howToPlay||'').trim();
  const descL= desc.length, htpL= htp.length;
  const genres= (g.tags||[]).filter(t=>TAG_LABELS[t]).length;

  // Page-level duplication: does the GENERATED page still emit an "How to play"
  // block whose text is a substring of the description shown above it?
  const emits = exists && /<h2>How to play /i.test(html);
  if(exists && emits) emitsHowTo++;
  const dup = emits && htpL>0 && desc.toLowerCase().includes(htp.toLowerCase().replace(/[.!?]$/,''));
  if(htpL>0){ hasHowTo++; if(dup) dupCount++; } else noHowTo++;

  const uniqueEst = Math.max(0, noscriptLen - BOILER);
  // thinness score: lower = thinner. Only count howToPlay text that actually
  // adds unique content on the page (emitted AND not a substring of desc).
  const htpContrib = emits ? (dup ? 0 : htpL) : 0;
  const score = descL + htpContrib + genres*15;

  rows.push({ title:g.title, slug, char, url:`${BASE}/game/${char}/${slug}/`,
    descL, htpL, dup, genres, noscriptLen, uniqueEst, score, featured:!!g.featured, exists });
}

rows.sort((a,b)=> a.score - b.score); // thinnest first

const total = rows.length;
const shortDesc = rows.filter(r=>r.descL<120).length;
const noIndexCandidates = rows.filter(r=> r.score < 200 || !r.exists);
const veryThin = rows.slice(0,30);

const md = [];
md.push('# SEO content-depth audit — play.poki2.online');
md.push('');
md.push(`> Generated ${new Date().toISOString().slice(0,10)}. Targets GSC "crawled/discovered - not indexed" + soft-404 root cause.`);
md.push('');
md.push('## Why this matters');
md.push('');
md.push('Google indexes the `<noscript>` block (the rest of the page is JS-rendered). Historically that block');
md.push('was templated AND self-duplicating: `howToPlay` was auto-derived from `description` by');
md.push('`scripts/generate-how-to-play.cjs`, so the "How to play" section repeated the description verbatim on');
md.push('218/219 pages — a textbook thin/duplicate signal. **Fixed 2026-09-27**: `generate-game-pages.cjs` now');
md.push('skips the section (and its FAQPage question) whenever howToPlay ⊆ description. This audit verifies the');
md.push('fix stays at 0 and tracks the remaining problem: pages whose unique indexable text is still too thin.');
md.push('');
md.push('## Summary');
md.push('');
md.push(`| metric | value |`);
md.push(`|---|---|`);
md.push(`| games audited | ${total} |`);
md.push(`| generated dist HTML missing | ${missingFile} |`);
md.push(`| games with howToPlay field | ${hasHowTo} |`);
md.push(`| pages emitting an "How to play" block | ${emitsHowTo} |`);
md.push(`| …of which block text ⊂ description (duplicated, must be 0) | ${dupCount} |`);
md.push(`| games with NO howToPlay | ${noHowTo} |`);
md.push(`| descriptions < 120 chars (thin) | ${shortDesc} |`);
md.push(`| boilerplate (category nav, identical every page) | ${BOILER} chars |`);
md.push(`| noindex candidates (score<200 or no file) | ${noIndexCandidates.length} |`);
md.push('');
md.push('## Distribution — noscript body length (what Google sees)');
md.push('');
const buckets=[[0,300],[300,400],[400,500],[500,700],[700,9999]];
md.push(`| noscript chars | pages |`);
md.push(`|---|---|`);
for(const [lo,hi] of buckets){
  const n=rows.filter(r=>r.noscriptLen>=lo && r.noscriptLen<hi).length;
  md.push(`| ${hi===9999?`≥${lo}`:`${lo}–${hi}`} | ${n} |`);
}
md.push('');
md.push(`> After subtracting the ${BOILER}-char boilerplate nav, most pages have only`);
md.push(`> ~${Math.round(rows.reduce((s,r)=>s+r.uniqueEst,0)/total)} chars of genuinely unique body text.`);
md.push('');
md.push('## Top 30 thinnest pages — noindex / consolidate candidates');
md.push('');
md.push('These have the least unique indexable text. Options per page:');
md.push('  (a) **noindex** it temporarily so Google focuses crawl budget on quality pages,');
md.push('  (b) **beef up** with real gameplay tips / mechanics / screenshots, or');
md.push('  (c) **remove** from sitemap if the game has no real content potential.');
md.push('');
md.push('| # | score | desc | dup? | genres | noscript | unique | url |');
md.push('|---|---|---|---|---|---|---|---|');
veryThin.forEach((r,i)=>{
  md.push(`| ${i+1} | ${r.score} | ${r.descL} | ${r.dup?'Y':'·'} | ${r.genres} | ${r.noscriptLen} | ${r.uniqueEst} | [${r.slug}](https://play.poki2.online/game/${r.char}/${r.slug}/) |`);
});
md.push('');
md.push('## Recommended actions (priority order)');
md.push('');
md.push('1. **Stop generating howToPlay from description.** `generate-how-to-play.cjs` creates intra-page');
md.push('   duplication. Either drop the `<h2>How to play</h2>` block when howToPlay ⊂ description, or');
md.push('   author real, distinct gameplay tips per game (controls, objective, scoring, difficulty).');
md.push('2. **noindex the thinnest ~30 pages** (list above) — add `<meta name="robots" content="noindex,follow">`');
md.push('   and drop them from sitemap.xml. Re-enable once each has ≥400 chars of unique body text.');
md.push('3. **Add a unique "About this game" paragraph** per page (objective + mechanics + what makes it');
md.push('   distinct) into the noscript block + VideoGame JSON-LD `description`. Even 2–3 sentences × 219');
md.push('   pages materially raises the content floor.');
md.push('4. **Thin the boilerplate**: the 12-link category nav appears on every game page identically —');
md.push('   consider moving it out of `<noscript>` (JS-only) so it stops diluting each page\'s unique ratio.');
md.push('5. **Automate lastmod** (P6 #17) — see `generate-sitemap.cjs` companion change.');
md.push('');
md.push('---');
md.push(`_Full ranked table of all ${total} games is in the console output._`);
md.push('');

fs.writeFileSync(OUT, md.join('\n'),'utf8');

console.log(`\n=== SEO content-depth audit ===`);
console.log(`games: ${total} | howToPlay duplicated: ${dupCount}/${hasHowTo} | no howToPlay: ${noHowTo} | noindex candidates: ${noIndexCandidates.length}`);
console.log(`boilerplate nav: ${BOILER} chars (identical every page)`);
console.log(`avg unique body text/page: ${Math.round(rows.reduce((s,r)=>s+r.uniqueEst,0)/total)} chars`);
console.log(`\n30 thinnest (noindex candidates):`);
console.log('score | desc | dup | noscript | unique | url');
veryThin.slice(0,30).forEach(r=>{
  console.log(`${String(r.score).padStart(4)} | ${String(r.descL).padStart(4)} | ${r.dup?'Y':' '}  | ${String(r.noscriptLen).padStart(4)}    | ${String(r.uniqueEst).padStart(4)}  | /game/${r.char}/${r.slug}/`);
});
console.log(`\n✅  Report → ${OUT}`);

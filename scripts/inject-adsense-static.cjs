#!/usr/bin/env node
// Inject the AdSense loader into static HTML pages that lack it.
// Idempotent: pages already containing "adsbygoogle" are skipped.
// Generated pages (game/tag/home) get the loader from their templates instead.
'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = path.join(__dirname, '..');

const CLIENT_ID = 'ca-pub-5676206764686662';

const SNIPPET = [
  '  <!-- Google AdSense -->',
  '  <script>window.adsbygoogle = window.adsbygoogle || [];</script>',
  `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}" crossorigin="anonymous"></script>`,
].join('\n');

// Root static pages + per-game privacy pages. Deliberately excludes:
// offline.html (offline fallback), google*.html (verification), adsense-example.html (doc page)
const PATTERNS = [
  'about.html',
  'contact.html',
  'terms.html',
  'dmca.html',
  'privacy.html',
  'privacy_anchors.html',
  '404.html',
  'privacy/*/privacy.html',
];

const files = PATTERNS.flatMap((p) => globSync(p, { cwd: ROOT }))
  .map((f) => path.join(ROOT, f));

let injected = 0;
let skipped = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('adsbygoogle')) {
    skipped++;
    continue;
  }
  // Preferred anchor: viewport meta; fallback: </title>
  const viewportRe = /([ \t]*<meta name="viewport"[^>]*>\r?\n)/;
  const titleRe = /([ \t]*<title>[^<]*<\/title>[ \t]*\r?\n)/;
  if (viewportRe.test(html)) {
    html = html.replace(viewportRe, `$1${SNIPPET}\n`);
  } else if (titleRe.test(html)) {
    html = html.replace(titleRe, `$1${SNIPPET}\n`);
  } else {
    console.warn(`No anchor found in ${file}, skipping`);
    continue;
  }
  fs.writeFileSync(file, html);
  injected++;
  console.log(`Injected: ${path.relative(ROOT, file)}`);
}

console.log(`Done. Injected ${injected}, skipped ${skipped} (already present), scanned ${files.length}`);

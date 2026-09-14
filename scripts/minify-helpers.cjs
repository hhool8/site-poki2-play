#!/usr/bin/env node
/* Minify standalone helper scripts into dist/js (reload-guard, fix-root-href). */
'use strict';
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const ROOT = path.join(__dirname, '..');
const DIST_JS = path.join(ROOT, 'dist', 'js');
const HELPERS = ['reload-guard.js', 'fix-root-href.js'];

(async () => {
  for (const name of HELPERS) {
    const src = fs.readFileSync(path.join(ROOT, 'js', name), 'utf8');
    const out = await minify(src, { compress: true, mangle: true });
    if (out.code === undefined) { console.error(`terser failed for ${name}`); process.exit(1); }
    fs.writeFileSync(path.join(DIST_JS, name), out.code);
    console.log(`${name}: ${src.length} -> ${out.code.length} bytes`);
  }
})();

#!/usr/bin/env node
/**
 * minify-html.cjs — collapse inter-tag whitespace in built HTML.
 *
 * The generators emit pretty-printed HTML: on a game page ~21% of the bytes
 * are newline + indentation between tags. Collapsing only runs that contain a
 * newline is safe (inline spacing such as `</b> <i>` on one line is preserved)
 * and yields smaller pages, a better text-to-HTML ratio and lower TTFB.
 *
 * <script>, <style>, <pre> and <textarea> bodies are left untouched.
 *
 * Runs on every built HTML file before hash:assets so revisioned copies match
 * the final content. Usage: node scripts/minify-html.cjs [distDir]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));
const PROTECT = /<(script|style|pre|textarea)\b[\s\S]*?<\/\1>/gi;

function minifySegment(s) {
  return s
    .replace(/>[ \t]*\r?\n[ \t]*</g, '><')   // newline + indentation between tags
    .replace(/[ \t]+\r?\n/g, '\n')           // trailing spaces before a newline
    .replace(/\r?\n{2,}/g, '\n');            // blank lines
}

function minify(html) {
  const blocks = [];
  const masked = html.replace(PROTECT, m => `\u0000${blocks.push(m) - 1}\u0000`);
  const out = minifySegment(masked).replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, acc); }
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

if (!fs.existsSync(DIST)) { console.error(`dist not found: ${DIST}`); process.exit(1); }

let files = 0, before = 0, after = 0;
for (const f of walk(DIST)) {
  const src = fs.readFileSync(f, 'utf8');
  const min = minify(src);
  if (min.length < src.length) {
    fs.writeFileSync(f, min, 'utf8');
    files++; before += Buffer.byteLength(src); after += Buffer.byteLength(min);
  }
}
const saved = before - after;
console.log(`\u2705  minify-html: ${files} file(s), ${Math.round(before / 1024)}KB -> ${Math.round(after / 1024)}KB ` +
  `(saved ${Math.round(saved / 1024)}KB, ${before ? Math.round(saved / before * 100) : 0}%)`);

import fs from 'node:fs';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';

const root = process.cwd();
const dist = path.join(root, 'dist');
const excluded = new Set([
  '.git',
  '.history',
  '.venv',
  '.wrangler',
  'dist',
  'env',
  'node_modules',
  'orig',
  'public',
  'scripts',
  'tools',
  // Build/repo inputs that were being published as crawlable URLs.
  // Measured 2026-11-04: /workers/redirect-query-to-path/index.js,
  // /wrangler.worker.toml, /wrangler.pages.toml, /package.json,
  // /package-lock.json, /backlinks/placements.json, /README.md and
  // /seo-content-audit.md all answered 200 on the live site.
  'backlinks',
  'netlify',
  'workers',
  '.DS_Store',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'postcss.config.cjs',
  'rollup.config.js',
  'wrangler.pages.toml',
  'wrangler.worker.toml',
  'seo-content-audit.md',
  // Source input for scripts/inject-adsense-static.cjs, not a published page.
  'privacy_anchors.html'
]);

// READMEs are developer documentation; they have no reason to be on the site.
const isRepoDoc = (name) => /^README(\..+)?\.md$/i.test(name);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue;
  if (isRepoDoc(entry.name)) continue;
  await cp(
    path.join(root, entry.name),
    path.join(dist, entry.name),
    { recursive: true }
  );
}

await cp(path.join(root, 'public'), dist, { recursive: true });

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
  'tools'
]);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue;
  await cp(
    path.join(root, entry.name),
    path.join(dist, entry.name),
    { recursive: true }
  );
}

await cp(path.join(root, 'public'), dist, { recursive: true });

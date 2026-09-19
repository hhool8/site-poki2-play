#!/usr/bin/env node
// Sync public/og -> dist/og so OG share images are guaranteed in the build output,
// independent of build:images (optimize-images). Run AFTER generate:og.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'public', 'og');
const dest = path.join(__dirname, '..', 'dist', 'og');

if (!fs.existsSync(src)) {
	console.error('public/og not found — run "npm run generate:og" first');
	process.exit(1);
}

fs.cpSync(src, dest, { recursive: true, force: true });

function countPngs(dir) {
	let n = 0;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) n += countPngs(p);
		else if (entry.name.endsWith('.png')) n++;
	}
	return n;
}

console.log(`Synced ${countPngs(dest)} OG images to ${path.relative(process.cwd(), dest)}`);

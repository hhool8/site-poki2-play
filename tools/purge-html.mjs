#!/usr/bin/env node
// Purge every sitemap URL from the Cloudflare edge after a deploy.
// HTML is now edge-cached (zone cache rule, respect_origin + s-maxage=3600),
// so a deploy would otherwise be invisible to returning visitors for up to an
// hour. Purges by exact URL list (works on all plans, unlike prefix purge).
// Usage: CLOUDFLARE_API_TOKEN=... node tools/purge-html.mjs [--zone <id>]
import { readFileSync } from 'node:fs';

const ZONE_ID = (process.argv.includes('--zone')
  ? process.argv[process.argv.indexOf('--zone') + 1]
  : '9a6678176bc61eaad08424813ad27fed');
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) { console.error('[purge] CLOUDFLARE_API_TOKEN not set'); process.exit(1); }

const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
console.log(`[purge] ${urls.length} sitemap URLs`);

// purge_cache takes at most 30 URLs per call — we fit in one.
const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ files: urls }),
});
const body = await res.json();
if (!body.success) { console.error('[purge] FAILED', JSON.stringify(body.errors)); process.exit(1); }
console.log(`[purge] OK — ${urls.length} URLs purged from edge`);

#!/usr/bin/env node
/**
 * IndexNow 自动推送 — tools/backlinks/indexnow-ping.mjs
 *
 * 向 api.indexnow.org（Bing / Yandex / Seznam 共享入口）推送 URL，加速新站收录。
 *
 * 用法：
 *   node tools/backlinks/indexnow-ping.mjs                 # 推送 sitemap 中最近更新的 30 条 URL
 *   node tools/backlinks/indexnow-ping.mjs --limit 10      # 只推 10 条
 *   node tools/backlinks/indexnow-ping.mjs --all-pages     # 全量模式：推所有内容变了的已发布页面
 *   node tools/backlinks/indexnow-ping.mjs --url https://play.poki2.online/game/x/y/   # 推指定 URL
 *   node tools/backlinks/indexnow-ping.mjs --urls-file urls.txt                        # 从文件读取（每行一个 URL）
 *   node tools/backlinks/indexnow-ping.mjs --dry-run       # 只打印，不实际请求
 *   node tools/backlinks/indexnow-ping.mjs --regen-key     # 重新生成 key（旧的 key 文件作废）
 *
 * key 文件位于 public/<KEY>.txt，随 build 部署到 https://play.poki2.online/<KEY>.txt，
 * IndexNow 会回查该文件验证站点所有权。首次使用需先部署一次 build。
 */
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HOST = 'play.poki2.online';
const ORIGIN = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);
const dryRun = has('dry-run');

// ---------- key 管理 ----------
const keyStatePath = path.join(ROOT, 'backlinks', 'indexnow-key.txt');

function readOrGenKey(regen = false) {
  if (!regen && fs.existsSync(keyStatePath)) {
    const key = fs.readFileSync(keyStatePath, 'utf8').trim();
    if (key) return { key, created: false };
  }
  const key = randomBytes(16).toString('hex'); // 32 hex chars
  fs.mkdirSync(path.dirname(keyStatePath), { recursive: true });
  fs.writeFileSync(keyStatePath, key + '\n');
  return { key, created: true };
}

const { key, created } = readOrGenKey(has('regen-key'));
const keyFilePublic = path.join(ROOT, 'public', `${key}.txt`);
const keyFileDist = path.join(ROOT, 'dist', `${key}.txt`);
const keyLocation = `${ORIGIN}/${key}.txt`;

// 把 key 文件写到 public/（随 build 部署）和 dist/（本地直接 wrangler 部署 dist 时也生效）
for (const dest of [keyFilePublic, keyFileDist]) {
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, key);
    console.log(`[key] 写入 ${path.relative(ROOT, dest)}`);
  }
}

if (created || has('regen-key')) {
  console.log(`[key] 新 key 已生成：${key}`);
  console.log('[key] 注意：需要重新 build+deploy 使 <KEY>.txt 上线后，推送才会通过验证。');
}

// ---------- 收集 URL ----------
function loadSitemapUrls(sitemapPath) {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/**
 * dist/ 里所有声明了 canonical 的页面，返回 [{ url, file }]。
 *
 * 为什么不能只从 sitemap 取样：sitemap 只有 25 条，而本站在 play 侧发布 269 条 canonical URL。
 * 只推 sitemap 的话，另外 244 条页面（包括绝大多数游戏页）的内容变更永远推不出去，
 * Bing 只能等自然重抓。apex 侧已在 2026-11-04 用同样的方式把推送范围从 26 条扩到 114 条。
 *
 * 两个必须排除的：
 *   - 资源哈希产生的 `index.<hash>.html` 副本（每个页面一份，内容相同，canonical 也相同）；
 *   - 404.html，它没有内容，推给引擎没有意义。
 */
function loadDistCanonicalPages() {
  const dist = path.join(ROOT, 'dist');
  const out = [];
  const seen = new Set();
  if (!fs.existsSync(dist)) return out;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
        continue;
      }
      if (!e.name.endsWith('.html')) continue;
      if (/\.[0-9a-f]{8}\.html$/.test(e.name)) continue; // 哈希副本
      if (e.name === '404.html') continue; // 错误页
      const html = fs.readFileSync(p, 'utf8');
      const m =
        html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/) ||
        html.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/);
      if (!m) continue;
      const url = m[1].trim();
      if (!url.startsWith(ORIGIN)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ url, file: p });
    }
  };
  walk(dist);
  return out;
}

/** 页面指纹：剥掉每页都会变的构建注释，否则每次 build 都全量变更。 */
function fingerprint(file) {
  const html = fs.readFileSync(file, 'utf8').replace(/[ \t]*<!--\s*built:[^>]*?-->\s*/g, '');
  return createHash('sha256').update(html).digest('hex');
}

const statePath = path.join(ROOT, 'backlinks', 'indexnow-state.json');
function readState() {
  try {
    const s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return s && typeof s.pages === 'object' ? s.pages : {};
  } catch {
    return {};
  }
}
function writeState(pages) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      {
        note: 'Content fingerprints of the URLs last announced to IndexNow. Machine-local, not committed: losing it only causes a full re-announce, which is harmless.',
        updatedAt: new Date().toISOString(),
        pages,
      },
      null,
      2,
    ) + '\n',
  );
}

let urls = [];
const singleUrl = flag('url');
const urlsFile = flag('urls-file');
const sitemap = flag('sitemap') || path.join(ROOT, 'sitemap.xml');
const limit = parseInt(flag('limit') || '30', 10);
const allPages = has('all-pages');

if (singleUrl) {
  urls = [singleUrl];
} else if (urlsFile) {
  urls = fs.readFileSync(urlsFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
} else if (allPages) {
  // 全量模式：只推内容真的变了的页面，靠指纹与上次推送对比。
  const state = readState();
  const pages = loadDistCanonicalPages();
  const changed = [];
  for (const { url, file } of pages) {
    const fp = fingerprint(file);
    if (state[url] !== fp) changed.push(url);
  }
  urls = changed;
  console.log(`[ping] 全量模式：${pages.length} 条已发布页面，其中 ${changed.length} 条内容有变化`);
} else {
  // sitemap 按 <loc> 顺序推送（sitemap 生成顺序 = 首页/分类页在前，游戏页在后），
  // 每次默认推前 limit 条 + 随机抽 limit/2 条游戏页，保证覆盖面又不过量。
  // 候选池 = sitemap + 全部已发布 canonical 页，否则随机抽样只在 25 条里打转。
  const all = [...new Set([...loadSitemapUrls(sitemap), ...loadDistCanonicalPages().map((p) => p.url)])];
  const head = all.slice(0, limit);
  const rest = all.slice(limit);
  const randCount = Math.min(Math.floor(limit / 2), rest.length);
  const rand = [];
  while (rand.length < randCount && rest.length) {
    rand.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  }
  urls = [...head, ...rand];
}

urls = [...new Set(urls.filter((u) => u.startsWith(ORIGIN)))]; // 只推本域，去重
console.log(`[ping] 待推送 ${urls.length} 条 URL（host: ${HOST}）`);

if (dryRun) {
  console.log(urls.map((u) => `  - ${u}`).join('\n'));
  console.log('[ping] dry-run，未实际请求。');
  process.exit(0);
}

if (!urls.length) {
  console.log('[ping] 无可推送 URL，退出。');
  process.exit(0);
}

// ---------- 推送 ----------
const body = { host: HOST, key, keyLocation, urlList: urls };
const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

const logPath = path.join(ROOT, 'backlinks', 'indexnow-log.jsonl');
const logLine = JSON.stringify({ ts: new Date().toISOString(), status: res.status, count: urls.length });
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.appendFileSync(logPath, logLine + '\n');

if (res.status === 200 || res.status === 202) {
  console.log(`[ping] ✅ 推送成功（HTTP ${res.status}），${urls.length} 条 URL 已提交 IndexNow。`);
  // 记录指纹，下次 --all-pages 只推真正变了的页面。
  const pages = loadDistCanonicalPages();
  const state = readState();
  for (const { url, file } of pages) state[url] = fingerprint(file);
  writeState(state);
  console.log(`[ping] 指纹已写入 ${path.relative(ROOT, statePath)}（${Object.keys(state).length} 条页面）`);
} else {
  const text = await res.text().catch(() => '');
  console.error(`[ping] ❌ 推送失败（HTTP ${res.status}）${text ? '：' + text.slice(0, 300) : ''}`);
  if (res.status === 403) {
    console.error('[ping] 403 = key 验证失败。确认 https://' + HOST + `/${key}.txt 已可访问（需 build+deploy）。`);
  }
  process.exit(1);
}

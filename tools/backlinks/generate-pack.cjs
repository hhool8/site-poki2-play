#!/usr/bin/env node
/**
 * 外链素材包周轮换生成器 — tools/backlinks/generate-pack.cjs
 *
 * 每次运行生成本周的外链提交素材包（backlinks/packs/YYYY-WW.md）：
 *   1. 从 games.json 按 ISO 周数轮换取 5 款有描述的热门游戏
 *   2. 生成 Reddit r/WebGames 合集帖草稿（含本周游戏组合，避免每次发一样的）
 *   3. 生成目录站（AlternativeTo / SaaSHub）提交文案
 *   4. 生成本周人工待办清单（来自 README.backlinks.zh.md P13）
 *
 * 用法：node tools/backlinks/generate-pack.cjs [--force]
 * 同一周重复运行会覆盖当周文件（内容一致）；--force 强制重新生成。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const games = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));

// ---------- 规范 URL：以 sitemap 为准，避免 games.json 里的旧域（mobileapp.poki2.online） ----------
const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const sitemapUrls = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));

function canonicalUrl(g) {
  const slug = new URL(g.link).pathname.split('/').filter(Boolean).pop();
  if (slug) {
    for (const u of sitemapUrls) {
      if (u.endsWith(`/${slug}/`)) return u;
    }
  }
  return null; // sitemap 无此页，跳过该游戏
}

// ---------- ISO 周数 ----------
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

const now = new Date();
const { year, week } = isoWeek(now);
const weekTag = `${year}-W${String(week).padStart(2, '0')}`;
const outDir = path.join(ROOT, 'backlinks', 'packs');
const outFile = path.join(outDir, `${weekTag}.md`);
fs.mkdirSync(outDir, { recursive: true });

if (fs.existsSync(outFile) && !process.argv.includes('--force')) {
  console.log(`[pack] 本周素材包已存在：${path.relative(ROOT, outFile)}（--force 可重新生成）`);
  process.exit(0);
}

// ---------- 轮换取游戏 ----------
const pool = games
  .filter((g) => g.show !== false && g.description && g.link)
  .map((g) => ({ ...g, link: canonicalUrl(g) }))
  .filter((g) => g.link);
// 周数做旋转起点，保证每周组合不同、长期覆盖全量游戏
const start = (week * 7 + year * 53) % pool.length;
const picks = [];
for (let i = 0; picks.length < 5 && i < pool.length; i++) {
  const g = pool[(start + i) % pool.length];
  if (!picks.includes(g)) picks.push(g);
}

const fmt = (g) => `- [${g.title}](${g.link}) — ${g.description.replace(/\s+/g, ' ').slice(0, 110)}`;
const gameList = picks.map(fmt).join('\n');

// ---------- Reddit 帖草稿 ----------
const redditPost = `Title: I built a free browser game portal — this week's picks: ${picks.map((g) => g.title).join(', ')}

Body:
Hey r/WebGames — sharing this week's picks from Poki2, a free browser gaming portal I run (no download, no signup, works on mobile and desktop):

${gameList}

Everything runs instantly in the browser. Feedback welcome — especially on mobile controls.
(If this isn't allowed here, mods please remove.)`;

// ---------- 目录站文案 ----------
const directoryCopy = `## AlternativeTo / SaaSHub（以 "Poki alternative" 提交）

- Name: Poki2
- URL: https://play.poki2.online
- One-liner: Play 200+ free online games instantly in your browser — no download, no signup.
- Long description: Poki2 is a free browser gaming portal with 200+ hand-picked HTML5 games: ${picks.map((g) => g.title).join(', ')} and more. Every game runs instantly in any modern browser — no downloads, no signups, no plugins. Mobile and desktop supported.
- Platform: Web
- Tags: games, browser-games, html5, free
- Icon: public/icons/icon-512.png
- Suggested "alternative to": Poki (https://poki.com), CrazyGames (https://www.crazygames.com)`;

// ---------- 每周待办 ----------
const checklist = `## 本周人工待办（P13）

- [ ] 把上面的 Reddit 帖发到 r/WebGames（先浏览/回帖再发，降低 spam 判定）
- [ ] 若尚未提交：AlternativeTo、SaaSHub 用上面文案各提交一次（一次性，勿重复）
- [ ] GitHub profile（github.com/hhool8）确认已带 https://play.poki2.online 链接
- [ ] 把新发布的外链地址登记进 backlinks/placements.json，让周报监控存活状态
- [ ] 运行 \`npm run backlinks:ping\`（部署后）向 Bing/Yandex 推送索引`;

const md = `# 外链素材包 — ${weekTag}

> 由 tools/backlinks/generate-pack.cjs 自动生成于 ${now.toISOString().slice(0, 10)}。
> 本周轮换游戏：${picks.map((g) => g.title).join('、')}

## 1. Reddit 帖草稿（r/WebGames）

\`\`\`text
${redditPost}
\`\`\`

## 2. 目录站提交文案

${directoryCopy}

## 3. 本周待办

${checklist}
`;

fs.writeFileSync(outFile, md);
console.log(`[pack] ✅ 已生成本周素材包：${path.relative(ROOT, outFile)}`);
console.log(`[pack] 本周轮换游戏：${picks.map((g) => g.title).join('、')}`);

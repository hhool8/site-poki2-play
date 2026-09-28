#!/usr/bin/env node
/**
 * 外链存活监控 — tools/backlinks/check-placements.mjs
 *
 * 读取 backlinks/placements.json 中登记的外链落点，逐个抓取页面，
 * 检测是否仍包含 play.poki2.online / poki2.online 链接，输出：
 *   - backlinks/placement-report.md   （人读报告）
 *   - backlinks/placements-status.json（机器状态，供 diff）
 *
 * placements.json 结构：
 * [
 *   { "url": "https://github.com/hhool8", "note": "GitHub profile 链接" },
 *   { "url": "https://www.alternativeto.net/...", "note": "AlternativeTo 条目" }
 * ]
 * 新发的外链（Reddit 帖、Fandom、目录站条目）都登记进来即可自动监控。
 *
 * 用法：node tools/backlinks/check-placements.mjs
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const placementsFile = path.join(ROOT, 'backlinks', 'placements.json');
const reportFile = path.join(ROOT, 'backlinks', 'placement-report.md');
const statusFile = path.join(ROOT, 'backlinks', 'placements-status.json');
const NEEDLES = ['play.poki2.online', 'poki2.online'];

if (!fs.existsSync(placementsFile)) {
  const seed = [
    { url: 'https://github.com/hhool8', note: 'GitHub profile 链接（P13 #36）' },
  ];
  fs.mkdirSync(path.dirname(placementsFile), { recursive: true });
  fs.writeFileSync(placementsFile, JSON.stringify(seed, null, 2) + '\n');
  console.log('[check] 未找到 placements.json，已创建种子文件。');
  console.log('[check] 发外链后把 URL 登记进去再重跑本脚本。');
}

const placements = JSON.parse(fs.readFileSync(placementsFile, 'utf8'));
console.log(`[check] 共 ${placements.length} 个外链落点待检测\n`);

const results = [];
async function main() {
for (const p of placements) {
  const item = { ...p, checkedAt: new Date().toISOString() };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(p.url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkMonitor/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(t);
    const html = await res.text();
    item.httpStatus = res.status;
    item.found = NEEDLES.some((n) => html.toLowerCase().includes(n));
    item.status = !res.ok ? 'HTTP ' + res.status : item.found ? 'OK' : 'MISSING';
  } catch (e) {
    item.found = false;
    item.status = 'ERROR: ' + (e.name === 'AbortError' ? 'timeout' : e.message.slice(0, 80));
  }
  results.push(item);
  const icon = item.status === 'OK' ? '✅' : '⚠️ ';
  console.log(`${icon} ${item.status.padEnd(9)} ${p.url}${p.note ? '  — ' + p.note : ''}`);
}

const ok = results.filter((r) => r.status === 'OK').length;
const bad = results.length - ok;

const report = `# 外链存活周报

生成时间：${new Date().toISOString().slice(0, 19).replace('T', ' ')}（本地时区见服务器）
落点总数：${results.length} ｜ 存活：${ok} ｜ 异常：${bad}

| 状态 | 落点 | 说明 |
|---|---|---|
${results
  .map(
    (r) =>
      `| ${r.status} | ${r.url} | ${r.note || ''} |`
  )
  .join('\n')}

## 处理建议

- **MISSING**：外链被撤（常见于 Fandom / Reddit 管理删除）。参考 README.backlinks.zh.md：Fandom 被撤即停，勿反复补。
- **HTTP 4xx/5xx / ERROR**：页面或登记地址可能变了，人工核对 URL 后更新 placements.json。
`;

fs.writeFileSync(reportFile, report);
fs.writeFileSync(
  statusFile,
  JSON.stringify({ checkedAt: new Date().toISOString(), ok, bad, results }, null, 2) + '\n'
);
console.log(`\n[check] 报告：${path.relative(ROOT, reportFile)}（存活 ${ok} / 异常 ${bad}）`);
}

main().catch((e) => {
  console.error('[check] 运行失败：', e.message);
  process.exit(1);
});

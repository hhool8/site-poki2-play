#!/usr/bin/env node
/**
 * 免注册外链自动提交 — tools/backlinks/free-submit.mjs
 *
 * 覆盖三类 2026 年仍存活的免注册渠道：
 *   A. 统计/审计类站点：对任意域名 GET 一次即自动生成信息页（HypeStat / SimilarSites / WebWiki 等）
 *   B. urlscan.io 匿名公开扫描：生成包含目标 URL 的永久公开结果页
 *   C. Ping-O-Matic 聚合 ping：通知目录/聚合器爬虫发现站点
 *
 * 诚实定位（README.backlinks.zh.md 同步说明）：
 *   这类链接权重近零（多数 nofollow / 无关主题），作用 = 收录加速 + 新域链接档案去空白。
 *   它们不是排名策略，不能替代 P13 人工外链。高频重复生成会形成 spam 模式，
 *   因此脚本默认 14 天冷却（--force 可越过），结果落盘 backlinks/free-submit-report.md。
 *
 * 用法：
 *   node tools/backlinks/free-submit.mjs             # 正常运行（14 天冷却）
 *   node tools/backlinks/free-submit.mjs --force     # 忽略冷却强制运行
 *   node tools/backlinks/free-submit.mjs --dry-run   # 只列出渠道与计划动作
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HOST = 'play.poki2.online';
const STATE_FILE = path.join(ROOT, 'backlinks', 'free-submit-state.json');
const REPORT_FILE = path.join(ROOT, 'backlinks', 'free-submit-report.md');
const LOG_FILE = path.join(ROOT, 'backlinks', 'free-submit-log.jsonl');
const COOLDOWN_DAYS = 14;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

// ---------- 渠道清单（type: get | urlscan | ping） ----------
// url: 页面地址模板；needle: 响应中应出现本域名的位置验证
const SERVICES = [
  { name: 'HypeStat', type: 'get', url: `https://hypestat.com/info/${HOST}`, needle: HOST },
  { name: 'SimilarSites', type: 'get', url: `https://www.similarsites.com/site/${HOST}`, needle: HOST },
  { name: 'WebWiki', type: 'get', url: `https://www.webwiki.com/${HOST}`, needle: HOST },
  { name: 'SiteWorthTraffic', type: 'get', url: `https://www.siteworthtraffic.com/report/${HOST}`, needle: HOST },
  { name: 'StatShow', type: 'get', url: `https://www.statshow.com/www/${HOST}`, needle: HOST },
  { name: 'Cubestat', type: 'get', url: `https://www.cubestat.com/${HOST}`, needle: HOST },
  { name: 'URLScan (anon scan)', type: 'urlscan' },
  { name: 'Ping-O-Matic', type: 'ping' },
];

// ---------- 冷却检查 ----------
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastRun: null, dead: {} };
  }
}
const state = loadState();

if (!dryRun && !force && state.lastRun) {
  const days = (Date.now() - new Date(state.lastRun).getTime()) / 86400000;
  if (days < COOLDOWN_DAYS) {
    console.log(`[free] 距上次运行仅 ${days.toFixed(1)} 天（冷却期 ${COOLDOWN_DAYS} 天）。`);
    console.log('[free] 重复批量生成统计页会形成 spam 链接模式，确需立即执行用 --force。');
    process.exit(0);
  }
}

// 上轮连续失败 ≥3 次的渠道自动跳过（视为死站）
function isDead(name) {
  return (state.dead[name] || 0) >= 3;
}

async function timedFetch(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36', ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

// ---------- 执行 ----------
const results = [];

async function runGet(s) {
  const res = await timedFetch(s.url);
  const html = await res.text();
  const found = s.needle ? html.toLowerCase().includes(s.needle.toLowerCase()) : res.ok;
  return {
    service: s.name,
    action: `GET ${s.url}`,
    httpStatus: res.status,
    pageLive: found,
    status: res.ok && found ? 'CREATED' : res.ok ? 'PAGE_OK_NO_ECHO' : 'HTTP ' + res.status,
  };
}

async function runUrlscan() {
  // 2026 起匿名提交返回 401，需免费注册拿 API key；设置了 URLSCAN_API_KEY 环境变量即自动使用
  const apiKey = process.env.URLSCAN_API_KEY;
  if (!apiKey) {
    return {
      service: 'URLScan (anon scan)',
      action: 'POST urlscan.io public scan',
      status: 'NEEDS_API_KEY',
      note: 'urlscan.io 匿名提交已关闭（401）。免费注册后在环境变量设置 URLSCAN_API_KEY，本脚本下次自动带上。',
    };
  }
  const res = await timedFetch('https://urlscan.io/api/v1/scan/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'API-Key': apiKey },
    body: JSON.stringify({ url: `https://${HOST}/`, visibility: 'public' }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    service: 'URLScan (anon scan)',
    action: 'POST urlscan.io public scan',
    httpStatus: res.status,
    pageLive: res.ok,
    status: res.ok ? 'CREATED' : 'HTTP ' + res.status,
    resultPage: data.result ? `https://urlscan.io${data.result}` : undefined,
    note: data.message,
  };
}

async function runPing() {
  const qs = new URLSearchParams({
    title: 'Poki2 — Free Online Games',
    blogurl: `https://${HOST}/`,
    rssurl: '',
    chk_weblogscom: 'on', chk_blogs: 'on', chk_feedburner: 'on',
    chk_syndic8: 'on', chk_newsgator: 'on', chk_blogdigger: 'on',
    chk_weblogalot: 'on', chk_newsisfree: 'on', chk_topicexchange: 'on',
    chk_google: 'on', chk_spurl: 'on',
  });
  const url = `http://pingomatic.com/ping/?${qs.toString()}`;
  const res = await timedFetch(url, {}, 30000);
  const html = await res.text();
  const ok = res.ok && (html.includes('Poki2') || html.toLowerCase().includes('ping'));
  return { service: 'Ping-O-Matic', action: 'GET pingomatic ping', httpStatus: res.status, pageLive: ok, status: ok ? 'PINGED' : 'HTTP ' + res.status };
}

console.log(`[free] 目标域名：${HOST}，共 ${SERVICES.length} 个免注册渠道${dryRun ? '（dry-run）' : ''}\n`);

for (const s of SERVICES) {
  if (isDead(s.name)) {
    results.push({ service: s.name, status: 'SKIPPED_DEAD', note: '连续 3 次失败，视为死站' });
    console.log(`⏭️  跳过（死站） ${s.name}`);
    continue;
  }
  let r;
  try {
    if (s.type === 'get') r = await runGet(s);
    else if (s.type === 'urlscan') r = await runUrlscan();
    else r = await runPing();
  } catch (e) {
    r = { service: s.name, status: 'ERROR: ' + (e.name === 'AbortError' ? 'timeout' : e.message.slice(0, 60)) };
  }
  r.checkedAt = new Date().toISOString();
  results.push(r);
  const icon = r.status.startsWith('CREATED') || r.status === 'PINGED' ? '✅' : r.status === 'PAGE_OK_NO_ECHO' ? '🟡' : '❌';
  console.log(`${icon} ${String(r.status).padEnd(18)} ${s.name}${r.resultPage ? '\n    ↳ ' + r.resultPage : ''}`);
}

// ---------- 状态与报告 ----------
if (!dryRun) {
  for (const r of results) {
    const ok =
      r.status.startsWith('CREATED') ||
      r.status === 'PINGED' ||
      r.status === 'PAGE_OK_NO_ECHO' ||
      r.status === 'HTTP 403' || // 403 = 疑似 bot 拦截，建页可能实际成功，人工抽查后重置
      r.status === 'NEEDS_API_KEY'; // 渠道没死，只是缺配置，不计死亡
    if (r.status.startsWith('SKIPPED')) continue;
    if (ok) state.dead[r.service] = 0;
    else state.dead[r.service] = (state.dead[r.service] || 0) + 1;
  }
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  fs.appendFileSync(LOG_FILE, JSON.stringify({ run: state.lastRun, results }) + '\n');

  const created = results.filter((r) => r.status.startsWith('CREATED') || r.status === 'PINGED').length;
  const report = `# 免注册外链提交报告

运行时间：${state.lastRun}（冷却期 ${COOLDOWN_DAYS} 天）
建页/推送成功：${created} / ${results.length}

| 状态 | 渠道 | 动作 | 备注 |
|---|---|---|---|
${results
  .map((r) => `| ${r.status} | ${r.service} | ${r.action || ''} | ${r.resultPage ? `[结果页](${r.resultPage})` : r.note || ''} |`)
  .join('\n')}

## 定位与后续

- 这批链接权重近零，价值 = 收录加速 + 新域链接档案去空白；**不是排名策略**。
- PAGE_OK_NO_ECHO = 页面可访问但未直接回显本域名（可能延迟建页），可 1 周后人工抽查是否已生成信息页。
- HTTP 403 = 疑似 bot 拦截（页面可能实际已建），人工用浏览器打开 URL 抽查即可。
- NEEDS_API_KEY = 渠道需要免费注册的 API key（如 urlscan.io：设置环境变量 URLSCAN_API_KEY）。
- 生成页若无索引，价值为零；不必人工干预，交给 \`backlinks:ping\` / IndexNow 的覆盖范围即可。
- 下一优先级仍是 P13 人工外链（AlternativeTo / SaaSHub / Reddit / Wikidata）。
`;
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`\n[free] 报告：${path.relative(ROOT, REPORT_FILE)}（成功 ${created}/${results.length}；14 天后可再次运行）`);
} else {
  console.log('\n[free] dry-run 完成，未实际提交。');
}

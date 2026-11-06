# 外链建设周报 — 2026-W42

> 生成时间：2026-10-12 ｜ 对应 README.backlinks.zh.md 的 P13 自动化任务
> 本轮执行：`backlinks:pack` → `backlinks:check` → `backlinks:ping` → `backlinks:free`

## 1. 本周素材包

文件：`backlinks/packs/2026-W42.md`

**本周轮换 5 款游戏**：Pacman、Sky Wire、Spring Ninja、Troll Boxing、Snakebird

**Reddit r/WebGames 帖草稿要点**

- 标题：*I built a free browser game portal — this week's picks: Pacman, Sky Wire, Spring Ninja, Troll Boxing, Snakebird*
- 正文结构：自我介绍（免下载免注册、移动/桌面通用）→ 5 条带链接的游戏清单 → 结尾邀请反馈（尤其移动端操作）+ "若版规不允许请删" 兜底句
- 每款游戏一行，格式：`[游戏名](https://play.poki2.online/game/x/xxx/) — 一句话玩法说明`

**目录站提交文案要点**

- Name: Poki2 ｜ URL: https://play.poki2.online
- One-liner: *Play 200+ free online games instantly in your browser — no download, no signup.*
- 定位为 **Poki / CrazyGames 的 alternative**，平台 Web，tags: games / browser-games / html5 / free
- 建议提交点：AlternativeTo、SaaSHub（一次性，勿重复提交）

> ⚠️ **文案质量提示（需人工留意）**：生成器 `tools/backlinks/generate-pack.cjs:69` 对游戏描述做了 110 字符硬截断（`.slice(0, 110)`），无省略号、不做单词/句子边界处理，导致草稿里 5 条描述全部断在单词中间（如 "Supp…"、"Suppor…"、"Supports ke"）。**复制到 Reddit 前需手工补全或删掉半截描述**，否则会显得粗糙。建议下轮把截断改为按句子边界或加 `…` 收尾。

## 2. 外链存活检测

文件：`backlinks/placement-report.md`

- **落点总数 1 ｜ 存活 1 ｜ 异常 0**
- ✅ OK — `https://github.com/hhool8`（GitHub profile 链接，P13 #36）

对比：上周同一落点报 1 ERROR，本地复核确认为执行环境网络限制误报；本周恢复正常，验证了该判断。

**异常处理建议（本周无异常需处理）**

- `MISSING`（外链被撤）：Fandom 被撤即停，**勿反复补**；其余人工核对页面是否真删
- `HTTP 4xx/5xx` / `ERROR`：多为 URL 变动或网络抖动，人工核对后更新 `placements.json`

## 3. IndexNow 推送

- **HTTP 200，45 条 URL 已提交**（host: `play.poki2.online`），无 403
- key `a674a31da32bcce781e7a03a8c981309` 已在 `backlinks/indexnow-key.txt` 与 `public/` 中，且已随部署上线 → **无需重新 build+deploy**
- 推送历史：2026-09-28 (98 条) → 10-05 (45 条) → 10-12 (45 条)

## 4. 免注册渠道（14 天冷却）

- 本轮**冷却期已满，实际运行**（上次 2026-09-27，间隔 15 天），未使用 `--force`
- **建页/推送成功 3 / 8**

| 状态 | 渠道 | 说明 |
|---|---|---|
| ✅ CREATED | HypeStat | 统计页已生成 |
| ✅ CREATED | SimilarSites | 对比页已生成（本周新增成功） |
| ✅ PINGED | Ping-O-Matic | 聚合 ping 已推送 |
| 🟡 PAGE_OK_NO_ECHO | SiteWorthTraffic | 页面可访问但未回显域名，1 周后人工抽查 |
| ❌ HTTP 403 | WebWiki | 疑 bot 拦截，浏览器打开抽查即可 |
| ❌ ERROR: timeout | StatShow | 连续 2 次失败，累计 3 次后脚本自动跳过 |
| ❌ ERROR: fetch failed | Cubestat | 连续 2 次失败 |
| ❌ NEEDS_API_KEY | urlscan.io | 匿名提交已关闭（401） |

> 🔑 **urlscan.io 启用方式**：免费注册 urlscan.io → 在环境变量设置 `URLSCAN_API_KEY` → 本脚本下次自动带上 key。

**定位提醒**：这批链接权重近零（多为 nofollow、无主题相关性），价值 = 收录加速 + 新域链接档案去空白，**不是排名策略**。真正搬排名的仍是 P13 人工外链。

## 5. 本周待办清单

| # | 事项 | 归属 |
|---|---|---|
| 1 | 把 Reddit 草稿发到 r/WebGames（**先浏览/回帖再发**，降低 spam 判定；发前修正半截描述） | 人工 |
| 2 | 若尚未提交：AlternativeTo、SaaSHub 用素材包文案各提交一次 | 人工 |
| 3 | 确认 github.com/hhool8 profile 已带 https://play.poki2.online 链接 | 人工 |
| 4 | 发布的外链地址登记进 `backlinks/placements.json`，纳入下周存活监控 | 人工 |
| 5 | （可选）免费注册 urlscan.io 并配置 `URLSCAN_API_KEY` | 人工 |
| 6 | （建议）修复素材包描述 110 字符硬截断问题 | 代码 |

**明确不由自动化执行**：Reddit / 目录站自动发帖——违反平台 ToS，会导致封号与外链清零，提交动作保留人工。

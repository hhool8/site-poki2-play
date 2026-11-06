# 外链建设周报 — 2026-W41

> 执行时间：2026-10-05 ｜ 站点：https://play.poki2.online ｜ 对应 README.backlinks.zh.md 的 P13 自动化

## 1. 本周素材包（backlinks/packs/2026-W41.md）

- 本周轮换 5 款游戏：**Vex 4、Vex 6、Wordle、Bubble Fish、Foo Foo**
- 含 Reddit r/WebGames 帖草稿 1 篇 + 目录站（AlternativeTo / SaaSHub）提交文案 1 套
- 摘要：以"Poki2 是免费浏览器游戏站，本周精选 5 款游戏"为切入，附各游戏一句话简介与直链；结尾邀请反馈并声明遵守版规。

## 2. 外链存活（backlinks/placements.json）

- 落点总数：**1** ｜ 存活：**0** ｜ 异常：**1**
- 异常项：`https://github.com/hhool8`（GitHub profile 链接，P13 #36）— `ERROR: fetch failed`
- 本地复核：该地址在本执行环境返回 `000`（连接失败），同环境站点根域返回 `200`。判定为**执行环境网络限制**所致的误报，非链接失效。
- 处理建议：**无需修改 placements.json**；请在普通浏览器中人工打开 `https://github.com/hhool8` 确认 profile 存活且带上 `https://play.poki2.online`。若确实失效再登记新落点。
- 备注：若后续出现 **MISSING**（多来自 Fandom / Reddit 管理删除），按规则"Fandom 被撤即停，勿反复补"；其余 4xx/5xx 人工核对 URL 后更新 placements.json。

## 3. IndexNow 推送（Bing / Yandex）

- 结果：**成功（HTTP 200）**，共推送 **45 条 URL**。
- 说明：未出现 403，即 `https://play.poki2.online/<key>.txt` 已正确部署，无需重新 build+deploy。

## 4. 免注册渠道（backlinks:free）

- 本次运行：距上次仅 **7.6 天**，处于 **14 天冷却期**，脚本正常退出。**未使用 --force 跳过冷却**（避免形成 spam 链接模式）。
- 上一轮实际结果（2026-09-27）参考：建页/推送成功 **2 / 8**（HypeStat 已建、Ping-O-Matic 已推送；SimilarSites / StatShow / Cubestat 失败，WebWiki 403，SiteWorthTraffic 页面可访问但未回显）。
- urlscan.io 渠道上次返回 **401 / NEEDS_API_KEY**：如需启用，免费注册 urlscan.io 并设置环境变量 `URLSCAN_API_KEY` 即可。

## 5. 本周待办清单

- [ ] **人工**把 Reddit r/WebGames 帖发布（先浏览/回帖再发，降低 spam 判定）— 禁止代发
- [ ] **人工**在 AlternativeTo、SaaSHub 各提交一次站点评介（文案见素材包，一次性勿重复）
- [ ] **人工**在普通浏览器核对 `https://github.com/hhool8` 存活且带站点链接
- [ ] 新发布的外链地址登记进 `backlinks/placements.json`，纳入下周存活监控
- [ ] 如需 urlscan.io 渠道：注册并配置 `URLSCAN_API_KEY`
- [ ] 约 1 周后抽查 SiteWorthTraffic 信息页是否已回显本域名

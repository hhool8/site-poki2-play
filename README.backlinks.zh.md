# 外链建设行动包（P13）— poki2.online

> 目标：新域收录慢的外因是零外链。本文把 P13 拆成"今天就能做"的具体动作。
> 每完成一项，在 README.roadmap.seo.zh.md 的 P13 打勾并记录日期。

## 资料包（提交时直接复制）

- **站点名**：Poki2
- **URL**：https://poki2.online （根域做 301 到 play.poki2.online 时统一填 play 子域）
- **一句话介绍**：Play 200+ free online games instantly in your browser — no download, no signup. Puzzle, action, racing, .io and classic games for desktop and mobile.
- **英文长介**：Poki2 is a free browser gaming portal with 200+ hand-picked HTML5 games: 2048 variants, Vex platformers, Cut the Rope, Wordle, Krunker, Eaglercraft and more. Every game runs instantly in any modern browser — no downloads, no signups, no plugins. Mobile and desktop supported.
- **图标**：`public/icons/icon-512.png`（512×512）、favicon.png
- **联系邮箱**：（补你的邮箱）

## 35. 目录 / 平台提交

| 平台 | 可行性 | 动作 |
|---|---|---|
| **AlternativeTo** | ✅ 高 | 提交为 "Poki" 的 alternative（Poki/CrazyGames 页面下 "Add application"）。审核快，dofollow 概率低但曝光真实 |
| **Product Hunt** | ⚠️ 中 | 需要一个"发布理由"（如上线 embed 功能时再发，见 #61） |
| **SaaSHub / Slant / LibHunt** 类聚合站 | ✅ 高 | 同样以 Poki alternative 提交，SaaSHub 给真实外链 |
| **itch.io** | ❌ | 面向游戏开发者上传作品，不适合门户站，跳过 |
| **Indie DB** | ❌ | 同上，跳过 |
| **Reddit** | ✅ 高 | r/WebGames、r/playmygame、r/incremental_games（idle 专题帖）发精选游戏帖，帖内自然带链接。先参与再发帖，避免被当 spam |
| **Hacker News** | ⚠️ 低 | 仅当有技术故事（如 "Eaglercraft in browser" 专题页）时投 Show HN |
| **游戏门户目录** | ✅ | 搜 "html5 games directory submit" / "browser games directory"，挑 5–10 个还在维护的目录站提交 |

## 36. 开发者主页外链

- GitHub：`github.com/hhool8` profile 页加站点链接（如果是项目主页则 repo README 加）✅ 零成本
- 如有其他在用的社交主页（X / 掘金 / 知乎专栏），统一加站点链接

## 37. Wikipedia / Fandom

- **Wikipedia**：❌ 不要给门户站加词条/链接，必然被删甚至拉黑。跳过
- **Fandom**：⚠️ 谨慎可行——在个别经典游戏的 Fandom 词条 "Playable versions" 类段落加 play.poki2.online 链接（如 Flap Cat、There Is No Game）。风险：链接加外链模板 `{{external link}}` 要求独立性，小站容易被撤。**每季度最多试 2–3 条，被撤就停**
- **替代方案（推荐）**：做 **Wikidata 条目**（P20 #62 的前置）：创建 Poki2 的 Wikidata item（instance of: website / video game portal, official website 链接）。Wikidata 是 Wikipedia 引擎的合法数据源，比正文链接安全得多

## 零代码快赢（非 P13 但同属外链/收录）

1. **Cloudflare Crawler Hints（IndexNow）**：Dashboard → 该域 Speed/优化 → 开启 Crawler Hints，自动向 Bing/Yandex 推送索引，Bing 收录立刻提速
2. **Bing Webmaster Tools**：确认已验证（BingSiteAuth.xml 已部署），导入 GSC 数据 + 提交 sitemap.xml
3. **GSC 手动提交**：对 67 个有 about 内容的页面，每天挑 3–5 个 Request Indexing（2024 后有配额，别一次全提）

## 61. Embed 外链生成器（代码项，建议下个迭代）

在游戏页加 "Embed this game" 区块（iframe snippet + 复制按钮）：
- 每个嵌码自动带 `<a href="https://play.poki2.online/game/x/y/">Poki2</a>` 版权链接 → 用户嵌到自己的博客/网站就是自然外链
- 这是 Poki/CrazyGames 外链策略的核心，实现成本低（1 个组件 + 页脚链接模板）
- 做完后才有 Product Hunt 的发布理由

## 优先级排序（建议执行顺序）

1. GitHub profile 链接（5 分钟）
2. Cloudflare Crawler Hints 开启（5 分钟）
3. AlternativeTo + SaaSHub 提交（1 小时）
4. Reddit r/WebGames 首帖（选 5 个有 about 内容的热门游戏做合集帖）
5. Wikidata 条目（1 小时）
6. 排期实现 embed 生成器（#61），完成后 Product Hunt

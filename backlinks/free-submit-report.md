# 免注册外链提交报告

运行时间：2026-10-12T03:29:51.074Z（冷却期 14 天）
建页/推送成功：3 / 8

| 状态 | 渠道 | 动作 | 备注 |
|---|---|---|---|
| CREATED | HypeStat | GET https://hypestat.com/info/play.poki2.online |  |
| CREATED | SimilarSites | GET https://www.similarsites.com/site/play.poki2.online |  |
| HTTP 403 | WebWiki | GET https://www.webwiki.com/play.poki2.online |  |
| PAGE_OK_NO_ECHO | SiteWorthTraffic | GET https://www.siteworthtraffic.com/report/play.poki2.online |  |
| ERROR: timeout | StatShow |  |  |
| ERROR: fetch failed | Cubestat |  |  |
| NEEDS_API_KEY | URLScan (anon scan) | POST urlscan.io public scan | urlscan.io 匿名提交已关闭（401）。免费注册后在环境变量设置 URLSCAN_API_KEY，本脚本下次自动带上。 |
| PINGED | Ping-O-Matic | GET pingomatic ping |  |

## 定位与后续

- 这批链接权重近零，价值 = 收录加速 + 新域链接档案去空白；**不是排名策略**。
- PAGE_OK_NO_ECHO = 页面可访问但未直接回显本域名（可能延迟建页），可 1 周后人工抽查是否已生成信息页。
- HTTP 403 = 疑似 bot 拦截（页面可能实际已建），人工用浏览器打开 URL 抽查即可。
- NEEDS_API_KEY = 渠道需要免费注册的 API key（如 urlscan.io：设置环境变量 URLSCAN_API_KEY）。
- 生成页若无索引，价值为零；不必人工干预，交给 `backlinks:ping` / IndexNow 的覆盖范围即可。
- 下一优先级仍是 P13 人工外链（AlternativeTo / SaaSHub / Reddit / Wikidata）。

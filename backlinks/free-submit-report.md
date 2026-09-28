# 免注册外链提交报告

运行时间：2026-09-27T10:02:45.268Z（冷却期 14 天）
建页/推送成功：2 / 8

| 状态 | 渠道 | 动作 | 备注 |
|---|---|---|---|
| CREATED | HypeStat | GET https://hypestat.com/info/play.poki2.online |  |
| ERROR: fetch failed | SimilarSites |  |  |
| HTTP 403 | WebWiki | GET https://www.webwiki.com/play.poki2.online |  |
| PAGE_OK_NO_ECHO | SiteWorthTraffic | GET https://www.siteworthtraffic.com/report/play.poki2.online |  |
| ERROR: timeout | StatShow |  |  |
| ERROR: fetch failed | Cubestat |  |  |
| HTTP 401 | URLScan (anon scan) | POST urlscan.io anonymous public scan | No API key supplied. Please supply a valid API key in the "api-key" HTTP header. |
| PINGED | Ping-O-Matic | GET pingomatic ping |  |

## 定位与后续

- 这批链接权重近零，价值 = 收录加速 + 新域链接档案去空白；**不是排名策略**。
- PAGE_OK_NO_ECHO = 页面可访问但未直接回显本域名（可能延迟建页），可 1 周后人工抽查是否已生成信息页。
- 生成页若无索引，价值为零；不必人工干预，交给 `backlinks:ping` / IndexNow 的覆盖范围即可。
- 下一优先级仍是 P13 人工外链（AlternativeTo / SaaSHub / Reddit / Wikidata）。

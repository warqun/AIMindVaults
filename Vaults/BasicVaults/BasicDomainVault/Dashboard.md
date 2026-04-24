---
type: folder-index
status: active
updated: 2026-04-22
tags: [zk, dashboard]
agent: claude
---

# Dashboard

> Domain Preset 볼트 운영 대시보드. Zettelkasten 상태를 한 눈에 점검.
> 쿼리 결과는 실시간. 매일 이 노트로 시작 → "오늘 처리할 것" 판별.

## Fleeting 처리 지연 (24h 초과)

```dataview
TABLE file.mtime AS created
FROM "00_Fleeting"
WHERE status = "inbox" AND file.mtime < date(today) - dur(1 day)
SORT file.mtime ASC
```

## 고아 permanent (링크 없음)

```dataview
TABLE file.mtime AS modified
FROM "02_Permanent"
WHERE length(file.outlinks) = 0 AND length(file.inlinks) = 0
SORT file.mtime DESC
```

## Thin permanent (연결 ≤ 1)

```dataview
TABLE length(file.outlinks) + length(file.inlinks) AS total_links
FROM "02_Permanent"
WHERE length(file.outlinks) + length(file.inlinks) <= 1
SORT total_links ASC
```

## 최근 재활성화 (30일)

```dataview
TABLE file.mtime AS modified, status
FROM "02_Permanent"
WHERE file.mtime >= date(today) - dur(30 days)
SORT file.mtime DESC
```

## 링크 밀도 상위 20

```dataview
TABLE length(file.outlinks) AS out, length(file.inlinks) AS in
FROM "02_Permanent"
SORT length(file.outlinks) + length(file.inlinks) DESC
LIMIT 20
```

## AI Drafts 모니터링

```dataview
TABLE file.mtime, type, status
FROM "_AI_Drafts"
SORT file.mtime DESC
```

---
type: folder-index
tags: [lab, dashboard]
agent: claude
updated: 2026-04-22
---

# Lab Dashboard

> Running experiments · Unresolved failures · Phase 진행률.
> 관련: [[_index]]

## Running experiments

```dataview
TABLE iteration, hypothesis, tools, phase
FROM "04_Experiment"
WHERE status = "running"
SORT file.mtime DESC
```

## Experiment result distribution (최근 90일)

```dataview
TABLE length(rows) AS count
FROM "04_Experiment"
WHERE file.mtime >= date(today) - dur(90 days)
GROUP BY result
SORT count DESC
```

## Unresolved failures

```dataview
TABLE severity, repro_rate, file.mtime AS reported
FROM "05_Failure"
WHERE resolved = false
SORT severity ASC, file.mtime DESC
```

## 재발 실패 클러스터 (최근 180일)

```dataview
TABLE length(rows) AS count, rows.file.link AS occurrences
FROM "05_Failure"
FLATTEN file.tags AS tag
WHERE file.mtime >= date(today) - dur(180 days)
GROUP BY tag
SORT count DESC
LIMIT 10
```

## Iteration 계보

```dataview
TABLE iteration, status, result
FROM "04_Experiment"
GROUP BY hypothesis
SORT hypothesis ASC
```

## Permanent · Domain 승격 후보

```dataview
TABLE file.mtime AS last_updated
FROM "02_Permanent"
WHERE status = "evergreen"
SORT file.mtime DESC
```

## Phase 진행률

```dataview
TABLE
  length(filter(rows, (r) => r.status = "done")) AS done,
  length(rows) AS total
FROM "04_Experiment" OR "05_Failure"
WHERE phase
GROUP BY phase
SORT phase ASC
```

## _AI_Drafts 모니터링

```dataview
TABLE file.mtime AS created, type, status
FROM "_AI_Drafts"
SORT file.mtime DESC
```

## 최근 7일 실험 요약

```dataview
TABLE iteration, result, file.mtime AS when
FROM "04_Experiment"
WHERE file.mtime >= date(today) - dur(7 days)
SORT file.mtime DESC
```

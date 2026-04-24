---
type: dashboard
tags: [BasicProjectVault, Template, Multi-Hub, Project, PARA, dashboard]
agent: claude
updated: 2026-04-22
---

# Dashboard — Project Preset

> Now · Next · Blocked · Decisions 실시간 대시보드. Dataview 쿼리는 Project Hub 명세 § 8 기준.
> 템플릿 볼트이므로 현재 비어 있음. 위성 볼트 복제 후 노트가 쌓이면 자동 반영.

## Now — Active Tasks

```dataview
TABLE type, status, due, priority
FROM "04_Task"
WHERE status = "active"
SORT priority ASC, due ASC
LIMIT 20
```

## Blocked

```dataview
TABLE status, phase, file.mtime AS updated
FROM ""
WHERE status = "blocked"
SORT file.mtime DESC
```

## Due 초과 Task

```dataview
TABLE due, priority, phase
FROM "04_Task"
WHERE due AND due < date(today) AND status != "done"
SORT due ASC
```

## 최근 결정 (30일)

```dataview
LIST file.mtime
FROM "05_Decision"
WHERE file.mtime >= date(today) - dur(30 days)
SORT file.mtime DESC
```

## Open Issues by Severity

```dataview
TABLE severity, status, file.mtime AS updated
FROM "06_Issue"
WHERE status != "done" AND status != "archived"
SORT severity ASC, file.mtime DESC
```

## Phase 진행률

```dataview
TABLE 
  length(filter(rows, (r) => r.status = "done")) AS done,
  length(rows) AS total
FROM "04_Task"
WHERE phase
GROUP BY phase
SORT phase ASC
```

## AI Drafts 모니터링

```dataview
TABLE file.mtime AS created, type, status
FROM "_AI_Drafts"
SORT file.mtime DESC
```

## Idea 적체 (72h 초과)

```dataview
TABLE file.mtime AS created
FROM "00_Idea"
WHERE status = "draft" AND file.mtime < date(today) - dur(3 days)
SORT file.mtime ASC
```

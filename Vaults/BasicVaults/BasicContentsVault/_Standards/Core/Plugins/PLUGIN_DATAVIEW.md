---
type: plugin-standard
plugin: dataview
updated: 2026-03-05
---

# Dataview

## 기능

- frontmatter 기반 동적 목록/테이블 생성
- 상태 대시보드 자동 집계

## 주 사용 작업

- 이슈 상태판
- 우선순위/담당자/에픽 단위 조회

## 기본 문법

```dataview
TABLE status, priority, updated
FROM "docs"
WHERE status != "done"
SORT updated desc
```

## 주의

- 정확한 결과를 위해 frontmatter 키 이름을 표준으로 고정한다.


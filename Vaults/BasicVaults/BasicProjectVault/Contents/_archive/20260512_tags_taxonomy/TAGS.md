---
type: tag-taxonomy
tags:
updated: (날짜)
---

# TAGS — 태그 규칙/목록(정규화 기준)

> 목적: 검색/필터/에이전트 컨텍스트를 단순화하기 위해 태그를 “정규화된 소수”로 유지한다.
> 볼트 생성 후 이 볼트의 태그 체계를 작성하세요.

## 규칙

- 태그는 frontmatter의 `tags: [ ... ]`에서만 관리(본문 `#tag`는 선택)
- 태그는 **소문자 + 슬래시 계층**으로 통일
- 한 노트에 태그는 **3~8개** 내로 유지(과도한 태그 금지)
- 새로운 태그를 만들기 전에 이 문서에 추가/검토(무분별한 증식 방지)

---

## 핵심 태그(권장)

### 문서 유형

- `doc/design`
- `doc/spec`
- `doc/issue`
- `doc/workflow`
- `doc/reference`
- `doc/temp`

### 상태/우선순위

- `status/wip`
- `status/blocked`
- `status/decided`
- `priority/high`
- `priority/medium`
- `priority/low`

### 에이전트(운용)

- `agent/claude`
- `agent/codex`


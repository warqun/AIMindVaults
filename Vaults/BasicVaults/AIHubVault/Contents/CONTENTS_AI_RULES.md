---
type: standard
tags:
  - domain
updated: 2026-03-23
---

# CONTENTS_AI_RULES — AIMindVault 전용 AI 작업 규칙

> `_Standards/Core/` 규칙에 추가(override)된다.

## 작업 우선순위

1. `_STATUS.md` 먼저 확인 — 현재 집중 작업 파악
2. `_VAULT-INDEX.md`로 관련 파일 위치 확인
3. 작업 범위가 넓으면 `_Standards/Core/` 관련 가이드 참조

## 파일 수정 규칙

- `_Standards/Core/` 파일 수정은 모든 볼트에 영향. 신중하게 판단.
- `_Standards/Contents/` 파일은 이 볼트 전용. 자유롭게 수정 가능.

## 노트 생성 시 주의

- Frontmatter 규칙: `_Standards/Core/NoteProperties.md` 참조
- `type`: `standard` | `template` | `guide` | `idea` | `plan` | `report`
- `tags`에 `AIMindVault` 필수 포함
- 용어 정의: [[CONTENTS_GLOSSARY]] 참조

## 금지 사항

- `_Standards/Core/` 전체 bulk 수정 금지

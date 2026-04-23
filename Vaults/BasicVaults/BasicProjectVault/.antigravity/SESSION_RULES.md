---
type: workflow
tags:
  - Meta
  - antigravity
updated: 2026-03-10
agent: antigravity
---

# Antigravity 세션 규칙 (DEPRECATED)

> **DEPRECATED (2026-03-21)**: Antigravity → Codex 데스크탑 앱으로 전환. 볼트 루트의 `AGENTS.md`를 사용.

> Antigravity 전용 세션 진입점.
> 세션 시작 시 이 파일을 읽고 규칙을 따른다.

## 이 볼트의 역할

**AI 작업환경 설계·개선·배포 허브** — `_Standards`, `_tools`, `.claude` 등 AI 운영 구조 관리.
게임 개발/기획 작업은 이 볼트에서 수행하지 않음.

## 세션 시작 루틴 (강제)

1. 루트 `_STATUS.md` 확인 — 전체 볼트 현황 + 다른 볼트 작업 확인
2. `_STATUS.md` 확인 — 이 볼트의 현재 집중/다음/블로킹
3. `.antigravity/AGENT_STATUS.md` 확인 — 내 마지막 작업 상태
3. `_VAULT-INDEX.md`로 문서 위치 파악
4. 필요 시 `.codex/AGENT_STATUS.md` 확인 — Codex 마지막 작업 (충돌 방지)

## 편집 모드 분리 (강제)

- 모든 편집은 **`[Contents]` 모드** 또는 **`[workspace]` 모드** 중 하나로 수행한다.
- `[Contents]` 모드: `Contents/**` 콘텐츠만 수정 가능. `_Standards/`, `_tools/`, `.codex/`, `.claude/`, `.antigravity/`, 볼트 루트 수정 금지.
- `[workspace]` 모드: `_Standards/`, `_tools/`, `.codex/`, `.claude/`, `.antigravity/`, 볼트 루트만 수정 가능. `Contents/**` 수정 금지.
- 모드 전환 시 명시적 선언 필수. 한 작업 안에서 두 모드 혼합 금지.
- **[workspace] 모드 완료 시 버전 기록 강제**: workspace 파일을 생성·수정·삭제했으면, `_WORKSPACE_VERSION.md`에 새 버전(`YYYYMMDDNNNN`)을 반드시 추가한다. 버전 기록 없이 workspace 작업을 완료 보고하지 않는다.
- 상세: `_WORKFLOW.md` § 5) 편집 모드 분리

## 노트 작성 규칙

- 문서는 한국어. 코드/식별자/경로는 원문 유지.
- `_Standards/Core/NoteProperties.md`의 Frontmatter 규칙 준수 필수.
  - `type`, `tags`(AIMindVault 포함), `updated` 또는 `created` 필수.
- 새 폴더 생성 시 `_VAULT-INDEX.md` 루트 구조에 등록.
- Juggl 블록: 제목 바로 아래 삽입 (`local: 노트_제목`). 예외: _STATUS.md, _VAULT-INDEX.md.

## 스크립트 생성/관리 규칙 (2026-03-09)

- 새 스크립트 생성 전 반드시 `_Standards/Core/Script_Registry.md` 확인 — 같은 기능 중복 금지.
- 기존 스크립트 확장으로 해결 가능하면 새 스크립트를 만들지 않는다.
- 경로 하드코딩 금지 — 스크립트 위치 기반 자동탐지(`$ScriptDir\..\..`) 사용.
- 생성 후 반드시 `Script_Registry.md`에 등록, 삭제 시 "삭제된 스크립트" 섹션에 이동 + 사유 기록.
- 상세: [[_Standards/Core/Script_Creation_Rule]]

## 인코딩 안전 규칙 (강제)

- `Contents` 대량 수정 전 반드시 인코딩 검증을 먼저 실행.
- 대량 수정 스크립트는 UTF-8 고정 I/O만 허용.
- `Get-Content | Set-Content` 파이프라인 사용 금지 — `.NET UTF-8 API`만 사용.
- 수정 후 `BAD_COUNT=0` 확인 전에는 후속 작업 금지.
- 상세: [[_Standards/Core/Encoding_BulkEdit_Safety]]

## 편집 완료 게이트 (필수)

```bash
node ".sync/_tools/cli-node/bin/cli.js" review -r . -s Contents
```

- `POST_EDIT_REVIEW_BAD=0` 확인 전에는 완료 보고 금지.

## Obsidian CLI 우선 사용 규칙

- 조회/검색/히스토리 복구는 먼저 `_tools/cli/aimv bridge`을 사용.
- 파일 직접 파싱은 CLI 결과로 부족할 때만 사용.
- 편집 후 `-Action post-review`로 검토 완료.
- 상세: [[_Standards/Core/AI_ObsidianCLI_Usage]]

## 세션 종료 시

1. **`_STATUS.md` 갱신 (필수)**: `_STATUS.md`를 직접 갱신 (Now/Next/Blocked/Decisions). **`_STATUS.md` 갱신 없이 세션을 종료하지 않는다.**
2. **루트 `_STATUS.md` 갱신 (필수)**: 루트 `_STATUS.md`의 이 볼트 섹션 갱신 (Now/Last Agent/Next/Blocked).
3. **AGENT_STATUS 갱신 (권장)**: `.antigravity/AGENT_STATUS.md` — 복잡한 작업이나 맥락 전달 필요 시 갱신. 단순 작업이면 생략 가능.

## 다른 에이전트와의 관계

| 에이전트 | 진입점 | 규칙 폴더 |
|----------|--------|----------|
| Antigravity (나) | `.antigravity/SESSION_RULES.md` (이 파일) | `.antigravity/` |
| Claude Code | `CLAUDE.md` | `.claude/rules/`, `.claude/commands/` |
| Codex | `AGENTS.md` | `.codex/rules/`, `.codex/playbooks/` |
| Cursor | `.cursor/rules/` (루트 자동 로드) | `.cursor/` |

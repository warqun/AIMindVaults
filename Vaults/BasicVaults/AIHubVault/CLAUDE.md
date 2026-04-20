---
tags:
  - AIMindVault
  - Meta
  - PresetHub
  - Multi-Hub
type: workflow
updated: 2026-04-20
agent: claude
---

# AIHubVault — Default Preset Hub (Multi-Hub 아키텍처)

> 이 볼트의 모든 AI 에이전트(Claude Code, Claudian, Codex, Cursor)는 이 문서를 진입점으로 사용한다.
> 에이전트별 추가 진입점: Codex → `CODEX.md` / Antigravity → `.antigravity/SESSION_RULES.md` / Cursor → `.cursor/rules/`

## 이 볼트의 역할

**AIMindVaults Default Preset Hub** — `hubId="default"`, `hubType="preset"`, `coreHub="../CoreHub"` (2026-04-20 Phase 1).

27 위성 볼트가 legacy scan 으로 이 Preset 에 바인딩. Custom 플러그인·규칙·스킬 번들 관리처.

### Multi-Hub 계층

| Hub | 경로 | 역할 |
|-----|------|------|
| **CoreHub** (Core Hub) | `../CoreHub/` | Core 계층 정본 (CLI, 표준, 스키마, Core 6 플러그인) |
| **AIHubVault** (이 볼트, Preset Hub) | `./` | Core 계층 수신 + Custom 계층 관리 |
| 27 위성 | `Vaults/` 전역 | 이 Preset 과 sync |

### Core 편집은 CoreHub 에서만 (강제)

`.sync/_tools/`, `.sync/_Standards/Core/`, `.sync/schemas/`, Core 6 플러그인 (local-rest-api, advanced-uri, shellcommands, dataview, templater, linter) 편집은 **CoreHub 볼트에서** 수행. 이 볼트에서 직접 편집 금지.

Core 편집 후 CoreHub 에서 `bump-version -m "..." --broadcast` 실행 → 이 볼트로 자동 Push. 이 명령 실행 전 완료 보고 금지.

### 이 볼트에서 편집 가능한 것 (Custom 계층)

- `.obsidian/plugins/` 중 Custom (Juggl, make-md, obsidian-git, mcp-tools, quickadd, metadata-menu, global-search-and-replace, obsidian42-brat, tasks-plugin, mermaid-tools, ytranscript 등)
- 이 볼트의 CLAUDE.md, _STATUS.md, README.md 등 Preset 개별 파일
- Custom 계층 편집 후 이 볼트 `_WORKSPACE_VERSION.md` bump (위성 전파 알림)

> **콘텐츠 분리 완료 (2026-03-21)**: 기존 Contents/Domain/ → `Vaults/Domains_Infra/AI/`, Contents/Project/ → `Vaults/Projects_Infra/Project_AIMindVaults/`로 이관됨. 이 볼트는 workspace 전용 Hub로 운영.

## 파생 인스턴스 규칙

이 볼트는 `aimv clone`으로 복제되어 다른 용도의 볼트로 사용될 수 있다.

1. **복제된 볼트도 이 CLAUDE.md의 공통 규칙(§ 아래)을 모두 따른다.**
2. **workspace 모드 편집은 이 볼트(AIHubVault)에서만 수행한다.** 다른 볼트의 `_Standards/`, `_tools/`, `Juggl_StyleGuide/`는 Hub-Sync로 자동 배포되므로 읽기 전용.
3. **다른 볼트에서는 `Contents/**`만 자유롭게 편집 가능.**

---

## 세션 진입 규칙 (강제)

어떤 작업이든, 시작 전에 반드시 아래 순서로 읽는다:

1. `_STATUS.md` — 현재 집중/다음/블로킹 파악
2. 이 문서 (`CLAUDE.md`) — 볼트 역할·규칙 확인
3. `_VAULT-INDEX.md` — 문서 위치 파악

**선독 절차를 건너뛰면 작업을 시작하지 않는다.**

---

## 편집 모드 분리 (강제)

모든 편집은 아래 모드 중 하나를 **명시적으로 선언**한 후 수행한다. 모드 혼합 금지.

### Contents 모드

> **이 볼트는 workspace 전용 Hub.** 콘텐츠 작업은 아래 볼트에서 수행:
> - AI 도메인 지식 → `Vaults/Domains_Infra/AI/`
> - AIMindVaults 프로젝트 → `Vaults/Projects_Infra/Project_AIMindVaults/`

### workspace 모드 (AIHubVault 전용)

- **대상**: `_Standards/`, `_tools/`, `.claude/`, `.codex/`, `Tags/`, `Juggl_StyleGuide/`, 볼트 루트 파일
- **금지**: `Contents/**` 본문 콘텐츠 수정
- **예외**: `Contents/` 내 frontmatter 태그/메타데이터 일괄 갱신은 workspace 작업으로 허용
- 수정 후 `_WORKSPACE_VERSION.md`에 버전 기록 필수 (형식: `YYYYMMDDNNNN`)
- 버전 기록 없이 workspace 작업 완료 보고 금지

### 모드 운용 규칙

1. **작업 시작 시 모드 선언 필수**: `[Contents/Domain]`, `[Contents/Project]`, 또는 `[workspace]`를 명시
2. **모드 전환 시 명시적 선언**: 이전 모드 편집이 완결된 후 전환
3. **사용자 지시가 모드를 넘나드는 경우**: 모드별로 분리하여 순차 실행

---

## 노트 작성 규칙

- **언어**: 한국어 기본. 코드/식별자/경로는 원문 유지.
- **날짜**: YYYY-MM-DD 형식만 사용.
- **구조**: H1 제목 1개. 내부 링크는 `[[WikiLink]]` 사용.
- **Frontmatter 필수**: 모든 노트는 YAML Frontmatter(`---`)로 시작.
  - `type`, `tags`(볼트 태그 포함), `updated` 또는 `created` 필수.
  - 새 폴더 생성 시 `_VAULT-INDEX.md`에 등록.
- **Juggl 임베드**: 제목 바로 아래에 삽입. 예외: `_STATUS.md`, `_VAULT-INDEX.md`, `.claude/` 내 파일.

```juggl
local: 노트_제목
```

---

## 안전 규칙

### 인코딩

- `Contents` 대량 수정 전 인코딩 검증 필수.
- 대량 수정은 UTF-8 고정 I/O만 허용.
- `Get-Content + Set-Content` 파이프라인으로 한국어 마크다운을 절대 재작성하지 않는다.
- 대량 치환: dry-run → 3파일 샘플 → 전체 실행.

### 임시 파일

- CLI 명령 실행 시 임시 파일은 `$env:TEMP` 하위에만 생성.
- 볼트 루트에 `.vtt`, `.json`, `.srt`, `.tmp`, `.log` 등 임시 파일 방치 금지.
- 작업 완료 후 즉시 삭제, 삭제 확인 전 완료 보고 금지.

### 토큰 절약

- **핀포인트 접근**: 필요한 파일만 정확히 지정하여 읽는다. 광범위 탐색 금지.
- **같은 파일 반복 읽기 금지**: 한번 읽은 내용은 기억하고 재참조.
- **고비용 작업 사전 보고**: 대량 파일 스캔, 복수 스크립트 실행 등은 사용자 승인 후 진행.

---

## 스크립트 관리

- 새 스크립트 생성 전 `_Standards/Core/Script_Registry.md`에서 중복 확인.
- **스크립트 생성은 사용자 승인 필수.** 목적, 경로, 영향 범위, 일회성 여부를 보고.
- 경로 하드코딩 금지 — 스크립트 위치 기반 자동탐지 사용.
- 생성 후 Script_Registry.md에 등록. 삭제 시 "삭제된 스크립트" 섹션에 이동.

---

## 편집 완료 게이트

노트 편집 완료 후 반드시 실행:
```bash
node .sync/_tools/cli-node/bin/cli.js review
```
`POST_EDIT_REVIEW_BAD=0` 확인 전 완료 보고 금지.

---

## 세션 종료 규칙

세션 종료 시 볼트의 `_STATUS.md`를 **직접 갱신**한다:
- **Now**: 이번 세션에서 완료/진행 중인 작업
- **Next**: 다음에 이어서 할 작업
- **Blocked**: 막힌 사항 (없으면 "없음")
- **Decisions**: 이번 세션에서 내린 결정 (`(YYYY-MM-DD)` 형식)

**`_STATUS.md` 갱신 없이 세션을 종료하지 않는다.**

---

## 상세 규칙 참조

위 규칙의 상세 내용은 아래 경로에서 확인:
- `_Standards/Core/AI_Rules_Index.md` — AI 에이전트 규칙 전체 인덱스
- `_Standards/Core/` — 공통 운영 표준
- `_WORKFLOW.md` — 전체 운용 규칙

---
type: workflow
updated: 2026-03-11
agent: claude
---

# WORKFLOW — Vault 운용 규칙

## 0) 세션 부트스트랩 (강제)

- 루트 멀티볼트 허브에서 시작한 경우: 먼저 루트 `CODEX.md` 또는 `CLAUDE.md`로 대상 볼트를 확정한 뒤 이 문서를 읽는다.
- 어떤 작업지시를 받더라도, 실제 작업 전에 아래 문서를 먼저 읽고 시작한다.
  1) `_STATUS.md` (필수)
  2) 에이전트 진입점 (CLAUDE.md / CODEX.md / SESSION_RULES.md / .cursor/rules/)
  3) AGENT_STATUS (선택 — 복잡한 작업 이력 확인 필요 시)
- 위 선독 절차를 건너뛰면 작업을 시작하지 않는다.

> 목적: 여러 에이전트가 같은 Vault를 교대 운용할 때 충돌·불일치·컨텍스트 낭비를 최소화한다.

## 1) 상태 공유 규칙

### 에이전트 목록

| 에이전트 | 주요 역할 | 진입점 | AGENT_STATUS |
|----------|-----------|--------|--------------|
| Claude Code | (사용자 정의) | `CLAUDE.md` | `.claude/AGENT_STATUS.md` (권장) |
| Codex | (사용자 정의) | `CODEX.md` | `.codex/AGENT_STATUS.md` (권장) |
| Antigravity | (사용자 정의) | `.antigravity/SESSION_RULES.md` | `.antigravity/AGENT_STATUS.md` (권장) |
| Cursor | (사용자 정의) | `.cursor/rules/` (자동 로드) | `.cursor/AGENT_STATUS.md` (권장) |

> 멀티 에이전트 운용 시 에이전트별 역할을 자유롭게 분담할 수 있습니다. 에이전트 1개만 사용해도 무방합니다.

### 규칙

- **`_STATUS.md` = 유일한 필수 상태 문서** — 모든 에이전트가 세션 종료 시 직접 갱신
- **AGENT_STATUS = 선택적 기록** — 복잡한 작업, 맥락 전달이 필요할 때 에이전트 자체 판단으로 갱신
- **세션 시작 시**: `_STATUS.md` 읽기 필수, AGENT_STATUS 읽기는 선택
- **루트 `_STATUS.md`**: 볼트별 요약. 세션 종료 시 해당 볼트 섹션 갱신

## 2) 용량/컨텍스트 절약 가이드

- `_STATUS.md`/`AGENT_STATUS.md`는 요약만(세션 1개 분량) 유지
- 장기 누적은 분리 파일로 링크만 남긴다

## 3) 태그 운용 규칙

- 정규 태그 기준: `Tags/TAGS.md`
- 마스킹(기존→정규) 매핑/절차: `Tags/TAG_MASK.md`
- 기본 태그: `AIMindVault`, `Meta`

## 4) AI-First Obsidian CLI 브리지 규칙

- 원칙: Obsidian CLI 우선, 미지원 작업만 플러그인/MCP로 보완한다.
- 공통 절차:
  1) `_STATUS.md`/각 에이전트 `AGENT_STATUS.md` 확인
  2) 작업 라우팅 결정 (CLI 단독 / CLI+MCP / 플러그인)
  3) 결과를 `_STATUS.md`와 자기 `AGENT_STATUS.md`에 요약

### 시작/종료 보강 규칙

- 시작 전 필수: `execution_mode`를 명시 (`문서전용` 또는 `실행`)
- 종료 시 필수: `_STATUS.md` 및 각 작업자 `AGENT_STATUS.md` 최소 3줄 업데이트

## 5) 편집 모드 분리 (강제)

모든 편집 작업은 아래 두 모드 중 하나에 속한다. 모드를 혼합하지 않는다.

### Contents 모드 (콘텐츠 작업)

- **대상**: `Contents/**` 하위 파일
- **성격**: 볼트 주제 관련 콘텐츠 작성·수정
- **금지**: `_Standards/`, `_tools/`, `.claude/`, `.codex/`, `_forge/`, vault 루트 파일(`CLAUDE.md`, `_WORKFLOW.md` 등) 수정
- **예외**: `_VAULT-INDEX.md`에 새 문서 등록, `_STATUS.md` 상태 업데이트는 허용

#### Contents 모드 참조 순서

Contents 모드 진입 시, 아래 순서로 문서를 참조한다.

| 순서 | 파일 | 역할 |
|------|------|------|
| 1 | `_Standards/CONTENTS_SPEC.md` | 볼트 목적·범위·산출물 정의 — "이 볼트가 무엇인지" 파악 |
| 2 | `Contents/CONTENTS_GLOSSARY.md` | 볼트 전용 용어 사전 — 문서 작성 시 일관된 용어 사용 |
| 3 | `Contents/CONTENTS_AI_RULES.md` | AI 작업 규칙 — `_Standards/Core/` 규칙에 추가(override) |
| 4 | `_Standards/Contents/*` | 볼트 전용 커스텀 규칙 상세 (필요 시) |

- `_Standards/CONTENTS_SPEC.md`는 볼트 정체성을 정의하므로 항상 최우선 참조.
- `_Standards/Contents/`는 이 볼트 전용 세부 규칙 폴더로, Core에 없는 커스텀 정책을 담는다.
- `Contents/CONTENTS_*.md`는 콘텐츠 작업자가 직접 참고하는 운영 문서(규칙·용어).

#### Contents 모드 내부 분기

| 분기                   | 대상                    | 성격                                |
| -------------------- | --------------------- | --------------------------------- |
| `[Contents/Domain]`  | `Contents/Domain/**`  | 지식 축적 (가이드, 리서치, 프롬프트, 에이전트 작업방식) |
| `[Contents/Project]` | `Contents/Project/**` | 목표 달성·작업 관리 (아이디어, 계획, 이슈)        |

**두 분기의 차이**:

| 항목 | Domain | Project |
|------|--------|---------|
| **목적** | 분야별 지식 축적 (PKM) | 목표 달성 (작업 관리) |
| **시간축** | 영구적 — 지식은 누적·갱신 | 한시적 — 목표 달성 시 완료 |
| **노트 성격** | 가이드, 리서치, 프롬프트, 레퍼런스 | 아이디어, 계획, 이슈, 회고 |
| **하위 구조** | 주제별 자유 설계 (`CONTENTS_SPEC`에 정의) | 프로젝트별 자유 설계 (`CONTENTS_SPEC`에 정의) |

- Domain은 "알게 된 것"을 쌓는 곳이고, Project는 "해야 할 것"을 관리하는 곳이다.
- 한 작업 안에서 Domain과 Project를 동시 수정할 수 있으나, 모드 선언 시 작업 대상 분기를 명시한다.

### workspace 모드 (환경 작업)

- **대상**: `_Standards/`, `_tools/`, `.claude/`, `.codex/`, `_forge/`, vault 루트 파일, `Tags/`, `Juggl_StyleGuide/`
- **성격**: 볼트 구조·설정·규칙·스크립트·에이전트 설정 변경
- **금지**: `Contents/**` 본문 콘텐츠 수정
- **예외**: `Contents/` 내 frontmatter 태그/메타데이터 일괄 갱신은 workspace 작업으로 허용

#### workspace 모드 — AIHubVault 전용 (강제)

- **workspace 편집은 AIHubVault에서만 수행한다.** 다른 볼트의 workspace 파일은 `sync_workspace.ps1`로 자동 전파된다.
- workspace 파일 수정 후 반드시 `_WORKSPACE_VERSION.md`에 버전을 기록한다.

1. 당일 최대 버전 번호 확인 → +1로 새 버전 생성 (형식: `YYYYMMDDNNNN`)
2. 변경 내용을 테이블 최상단에 추가

### 운용 규칙

1. **작업 시작 시 모드 선언**: 에이전트는 편집 시작 전에 `[Contents/Domain]`, `[Contents/Project]`, 또는 `[workspace]`를 명시한다.
2. **모드 전환 시 명시적 선언**: 한 세션에서 두 모드 작업이 필요하면, 전환 시점을 명시하고 이전 모드의 편집이 완결된 후 전환한다.
3. **사용자 지시가 모드를 넘나드는 경우**: 에이전트가 모드별로 분리해서 순차 실행한다.

## AI Note Environment

- See `_Standards/Core/NoteProperties.md`.

---

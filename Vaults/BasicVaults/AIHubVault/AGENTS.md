# AIHubVault — AI 작업환경 설계·개선·배포 허브 (Codex)

> Codex 데스크탑 앱 / CLI 전용 진입점.
> Claude Code → `CLAUDE.md` 참조.
> 공통 강제 규칙: 루트 `.claude/rules/`에서 자동 적용.

## 공통 규칙 (정본 참조 — Mandatory)

루트 `.claude/rules/` 디렉토리의 **모든 규칙 파일**을 읽고 따른다.
볼트 `CLAUDE.md`의 규칙도 함께 참조한다.

## 에이전트 식별자

- **식별자**: `codex`
- 세션 종료 시 `codex / YYYY-MM-DD`로 기록

## 이 볼트의 역할

**AI 작업환경 설계·개선·배포 허브** — `_Standards`, `_tools`, `.claude`, `_forge` 등 AI 운영 구조를 설계하고 다른 볼트에 배포하는 원본(Hub).

## 세션 시작 순서

1. 루트 `.claude/rules/` 전체 읽기 — 공통 강제 규칙 (정본)
2. `.codex/rules/` — Codex 고유 규칙
3. `_STATUS.md` 확인 — 현재 집중/다음/블로킹
4. `.codex/AGENT_STATUS.md` 확인 — 내 마지막 작업 상태
5. `_VAULT-INDEX.md` — 문서 위치 파악

편집 전에 위 순서를 완료한다.

## 편집 모드 분리 (강제)

모든 편집은 아래 모드 중 하나를 선언한 후 수행한다. 모드 혼합 금지.

### Contents 모드

- **`[Contents/Domain]`**: `Contents/Domain/**` 지식 축적
- **`[Contents/Project]`**: `Contents/Project/**` 작업 관리
- 금지: `_Standards/`, `_tools/`, `.claude/`, `.codex/`, `_forge/`, 볼트 루트 파일

### workspace 모드 (AIHubVault 전용)

- 대상: `_Standards/`, `_tools/`, `.claude/`, `.codex/`, `_forge/`, `Tags/`, `Juggl_StyleGuide/`, 볼트 루트 파일
- 금지: `Contents/**` 본문 수정
- 수정 후 `_WORKSPACE_VERSION.md`에 버전 기록 필수

## 파생 인스턴스 규칙

- workspace 모드 편집은 이 볼트(AIHubVault)에서만 수행
- 다른 볼트의 `_Standards/`, `_tools/`, `Juggl_StyleGuide/`는 Hub-Sync로 자동 배포 — 읽기 전용
- 다른 볼트에서는 `Contents/**`만 자유 편집

## Codex 고유 규칙

| 파일 | 용도 |
|------|------|
| `.codex/rules/never-do.md` | 금지 목록 |
| `.codex/rules/note-writing.md` | 노트 작성 규칙 |
| `.codex/rules/bulk-edit-safety.md` | 대량 편집 안전 |

## Skills

| 스킬 | 용도 |
|------|------|
| `.codex/skills/session-end/` | 세션 종료 절차 |
| `.codex/skills/juggl-insert/` | Juggl 임베드 삽입 |

## 우선순위

- 규칙 준수 > 속도
- 최소 편집 > 광범위 편집
- 검증 완료 > 빠른 완료 보고

## 세션 종료

볼트 `_STATUS.md` + 루트 `_STATUS.md` 양쪽 갱신 필수.

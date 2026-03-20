---
type: standards
tags:
  - AIMindVault
  - Meta
  - Standards
updated: 2026-03-17
---

# AI 에이전트 규칙 인덱스

> AI 에이전트의 동작을 제어하는 모든 규칙의 위치와 요약.
> 규칙은 3계층으로 구성되며, 상위 계층이 하위를 포함한다.

---

## 1계층: 공통 강제 규칙 (`.claude/rules/`)

멀티볼트 루트의 `.claude/rules/`에 정의. 모든 볼트에서 AI 에이전트가 자동으로 로드한다.
Obsidian에서는 숨김 폴더이므로 직접 보이지 않지만, 아래 목록으로 확인 가능.

| 규칙 | 파일 | 요약 |
|------|------|------|
| 편집 모드 분리 | `edit-mode-separation.md` | Contents/workspace 모드 혼합 금지. workspace 편집은 AIHubVault 전용. 버전 기록 필수 |
| 인코딩 안전 | `encoding-safety.md` | UTF-8 고정 I/O만 허용. `Get-Content + Set-Content`로 한국어 마크다운 재작성 금지. 대량 수정은 dry-run → 샘플 → 전체 |
| Post-Edit Review | `post-edit-review.md` | 노트 편집 후 `post_note_edit_review.ps1` 실행 필수. `BAD=0` 확인 전 완료 보고 금지 |
| 노트 작성 패턴 | `note-writing.md` | 한국어 기본, YYYY-MM-DD, Frontmatter 필수(`type`, `tags`, `updated`), `[[WikiLink]]` 사용 |
| 스크립트 관리 | `script-management.md` | 새 스크립트 전 `Script_Registry.md` 중복 확인. 하드코딩 금지. 생성/삭제 시 레지스트리 갱신 |
| 스크립트 생성 승인 | `script-creation-approval.md` | 스크립트 생성 전 사용자 승인 필수. 목적·경로·영향범위·일회성 여부 보고 |
| 세션 종료 | `session-exit.md` | 세션 종료 시 `_STATUS.md` 직접 갱신 (Now/Next/Blocked/Decisions). 갱신 없이 종료 금지 |
| 임시 파일 관리 | `temp-file-management.md` | 임시 파일은 `$env:TEMP` 하위에만 생성. 볼트 내 방치 금지. 완료 후 즉시 삭제 |
| 토큰 절약 | `token-optimization.md` | 핀포인트 접근, 반복 읽기 금지, 자가 디버깅 반복 금지, 고비용 작업 사전 보고 |
| Juggl 스타일 | `juggl-style-sync.md` | graph.css와 스타일 가이드 동시 갱신. 노트 제목 아래 Juggl 임베드 삽입 |
| 배포 동기화 | `distribution-sync.md` | 공통 규칙/워크스페이스 변경 시 배포 반영 대상 확인. 변경 로그 기록 |

---

## 2계층: 볼트별 규칙 (`CLAUDE.md`)

각 볼트 루트의 `CLAUDE.md`에 정의. 해당 볼트에 진입할 때 에이전트가 읽는다.

포함 내용:
- 볼트 역할 및 파생 인스턴스 규칙
- 세션 진입 규칙 (필수 읽기 순서)
- 편집 모드 분리 (Contents/workspace 대상·금지·예외)
- 노트 작성 규칙 (언어, 날짜, Frontmatter, Juggl)
- 안전 규칙 (인코딩, 임시 파일, 토큰 절약)
- 스크립트 관리
- 편집 완료 게이트 (Post-Edit Review)
- 세션 종료 규칙

---

## 3계층: 운용 규칙 (`_WORKFLOW.md`)

볼트의 `_WORKFLOW.md`에 정의. 에이전트의 상세 운용 절차를 규정한다.

포함 내용:
- 세션 부트스트랩 (선독 절차)
- 에이전트 목록 및 상태 공유 규칙
- 용량/컨텍스트 절약 가이드
- 태그 운용 규칙
- Obsidian CLI 브리지 규칙
- 편집 모드 분리 상세 (Contents 모드 참조 순서, 내부 분기)

---

## 에이전트별 진입점

| 에이전트 | 진입점 | 비고 |
|----------|--------|------|
| Claude Code | `CLAUDE.md` | `.claude/rules/` 자동 로드 |
| Claudian | `CLAUDE.md` + `claudian-settings.json`의 systemPrompt | Contents 전용, workspace 금지 |
| Codex | `CODEX.md` | `.codex/rules/` 자동 로드 |
| Antigravity | `.antigravity/SESSION_RULES.md` | 조사·리서치 특화 |
| Cursor | `.cursor/rules/` (자동 로드) | 코드 편집·리팩토링 |

---

## 규칙 변경 시 주의사항

- **1계층**: `.claude/rules/` — 멀티볼트 루트에서 수정. `_ROOT_VERSION.md`에 버전 기록
- **2계층**: `CLAUDE.md` — AIHubVault에서 수정. `_WORKSPACE_VERSION.md`에 버전 기록
- **3계층**: `_WORKFLOW.md` — AIHubVault에서 수정. `_WORKSPACE_VERSION.md`에 버전 기록
- 2·3계층은 `sync_workspace.ps1`로 다른 볼트에 자동 전파
- 1계층은 `distribution-sync` 워크플로우로 배포

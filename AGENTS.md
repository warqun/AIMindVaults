# AIMindVaults — 멀티볼트 라우팅 허브 (Codex)

> 이 파일은 Codex 데스크탑 앱 / Codex CLI 전용 진입점이다.
> Claude Code → `CLAUDE.md` 참조.

## 공통 규칙 (정본 참조 — Mandatory)

세션 시작 시 `.claude/rules/` 디렉토리의 **모든 규칙 파일**을 읽고 따른다.
이 규칙들은 모든 AI 에이전트에 동일 적용되는 강제(Mandatory) 규칙이다.

## 에이전트 식별자

- **식별자**: `codex`
- 세션 종료 시 작업 에이전트를 `codex / YYYY-MM-DD`로 기록

## Codex 개인 룰 (사용자 지시 우선 — Mandatory)

- 사용자가 프롬프트에서 **작업(생성/수정/삭제/실행)** 을 명시하지 않으면, Codex는 **읽기 전용**으로만 동작한다.
- 읽기 전용 범위: 파일 탐색, 내용 조회, 상태 점검, 비교, 요약, 보고.
- 명시 지시 전 금지: 파일 변경, 자동화 등록/실행, 쓰기성 스크립트 실행, 외부 상태 변경.
- 지시가 모호하면 변경 작업을 시작하지 않고 짧게 확인한다.

## 세션 시작 순서

1. 이 파일 (`AGENTS.md`)
2. `.claude/rules/` 전체 — 공통 강제 규칙 (정본)
3. `_STATUS.md` (루트) — 전체 볼트 현황 + 다른 볼트 작업 확인
4. `.codex/rules/` — Codex 고유 규칙
5. `.codex/AGENT_STATUS.md`
6. 대상 볼트의 `AGENTS.md`
7. 대상 볼트의 `_STATUS.md`

편집 전에 위 순서를 완료한다.

## 볼트 레지스트리

### BasicVaults (작업환경 허브)

| 볼트 ID | 경로 | 역할 | 상태 |
|---------|------|------|------|
| AIHubVault | `Vaults/BasicVaults/AIHubVault/` | AI 작업환경 설계·개선·배포 허브 | active |
| BasicContentsVault | `Vaults/BasicVaults/BasicContentsVault/` | 범용 콘텐츠 저장소 (배포용 — 직접 편집 금지) | active |

> 사용자가 볼트를 추가하면 이 레지스트리에 등록한다.
> 볼트 생성은 `clone_vault.ps1`로 BasicContentsVault를 클론한다.

## 볼트 라우팅 규칙

1. 명시적 볼트 지정 우선
2. 키워드 추론:
   - "AI 워크플로우", "에이전트", "_Standards", ".forge" → AIHubVault
   - 그 외 주제 → 사용자에게 확인 (볼트가 없으면 생성 안내)
3. 파일 경로 포함 시 → 경로에서 볼트 추출
4. 루트 파일만 대상이면 → 루트에서 작업
5. 모호하면 → 사용자에게 확인

## 루트 스코프

루트에서 직접 수정 가능한 대상:
- `AGENTS.md`, `CLAUDE.md`, `CODEX.md`
- `.claude/`, `.codex/`
- `_STATUS.md`, `_ROOT_VERSION.md`

볼트 내부 파일은 대상 볼트 진입 후에만 수정한다.

## 에이전트 소유권 규칙

- Codex: 단일 볼트 내 노트 편집, 반복 작업, 백그라운드 정리, 소스 노트 파이프라인 실행
- 동시 수정 금지: `_STATUS.md`, `_WORKSPACE_VERSION.md`, `.obsidian/`
- 멀티볼트 구조 변경, 스크립트 개발은 Claude 또는 사용자가 수행

## Codex 스킬 (`.codex/skills/`)

| 스킬 | 용도 |
|------|------|
| `create-video-note` | 영상 URL → 구조화된 노트 |
| `create-article-note` | 웹 글/텍스트 → 구조화된 노트 |
| `create-pdf-note` | PDF → 구조화된 노트 |
| `cross-vault-migration` | 볼트 간 노트 이관 |
| `sync-distribution` | 배포 동기화 |
| `open-note` | Obsidian 노트 열기 |
| `open-vault` | Obsidian 볼트 열기 |

## Obsidian 노트 열기 (Mandatory)

이 환경의 모든 `.md` 노트는 **Obsidian 볼트** 안에 있다.
사용자가 "노트 열어줘"라고 하면 **Obsidian에서 해당 노트를 포커스해서 여는 것**을 의미한다.

### 올바른 방법: Obsidian URI 스킴

```powershell
Start-Process 'obsidian://open?vault=볼트명&file=볼트루트기준_상대경로'
```

| 파라미터 | 설명 | 예시 |
|----------|------|------|
| `vault` | Obsidian에 등록된 볼트 **폴더명** | `AIHubVault`, `BasicContentsVault` |
| `file` | 볼트 루트 기준 상대 경로. **`.md` 확장자 생략** | `Contents/Domain/Example_Note` |

- 경로 구분자: `/` 사용 (`\` 아님)
- 한글 파일명: 그대로 사용 (URL 인코딩 불필요)
- `Start-Process <파일경로.md>`, `code`, `Invoke-Item` 등은 VS Code로 열리므로 금지

### 주의사항

- Obsidian이 실행 중이어야 한다
- 볼트가 Obsidian에 등록되어 있어야 한다
- 파일이 존재하지 않으면 새 노트 생성을 제안할 수 있으므로 경로를 정확히 확인

## Codex 고유 설정

- `.codex/rules/` — Codex 전용 규칙
- `.codex/skills/` — 작업 절차 캡슐화

## 세션 종료

볼트 `_STATUS.md` + 루트 `_STATUS.md` 양쪽 갱신 필수.
상세: `.claude/rules/core/session-exit.md`

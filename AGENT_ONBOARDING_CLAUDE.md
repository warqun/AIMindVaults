# AIMindVaults — Claude Code 온보딩

> Claude Code 에이전트 전용 온보딩 문서.
> 공통 규칙은 `AGENT_ONBOARDING.md`를 먼저 읽는다.

---

## 1. 진입점

- **루트 진입점**: `CLAUDE.md` — 볼트 레지스트리 (22볼트), 라우팅 키워드, 진입 프로토콜
- **볼트 진입점**: `{볼트}/CLAUDE.md` — 볼트 전용 규칙, 편집 모드, 세션 규칙

## 2. 세션 시작 순서

1. `CLAUDE.md` (루트) — 라우팅 허브
2. `_SESSION_HANDOFF_CLAUDE.md` (루트) — 이전 세션 맥락
3. `_STATUS.md` (루트) — 전체 볼트 현황
4. 대상 볼트의 `CLAUDE.md`
5. 대상 볼트의 `_STATUS.md`
6. **환경 점검 수행** — `AGENT_ONBOARDING.md § 6. 환경 점검` 의 "실행 트리거" 중 하나라도 해당하면 **사용자 작업 요청을 기다리기 전에 자동 수행**하고 결과를 보고한다. 첫 세션(핸드오프 비어 있음)에서는 예외 없이 실행.

편집 전에 위 순서를 완료한다. 온보딩 요약만 하고 환경 점검을 건너뛴 채 "준비 완료" 보고 금지.

---

## 3. 에이전트 식별

- **식별자**: `claude`
- frontmatter `agent: claude` (복수 에이전트 작업 시 `agent: [claude, codex]`)
- 세션 종료 시 `_STATUS.md`에 `claude / YYYY-MM-DD`로 기록
- 핸드오프 파일: `_SESSION_HANDOFF_CLAUDE.md`

---

## 4. Claude Code 역할 범위

| 영역 | Claude Code | Codex |
|------|-------------|-------|
| 멀티볼트 구조 변경 (볼트 생성, 폴더 재구조화) | O | X |
| 스크립트 개발/수정 (`_tools/cli-node/`) | O | X |
| 규칙/스킬 작성 (`.claude/rules/`, `.claude/commands/`) | O | X |
| `.obsidian/` 설정 변경 | O | X |
| 복수 볼트에 걸치는 작업 | O | X |
| 단일 볼트 내 노트 편집 | O | O |
| 소스 노트 파이프라인 (영상/글/PDF → 노트) | O | O |

---

## 5. 스킬 목록 (`.claude/commands/core/` — 17개)

| 스킬 | 용도 |
|------|------|
| `/auto-organize` | 노트/볼트 생성 시 폴더 자동 분류 |
| `/create-vault` | 새 볼트 생성 (BasicContentsVault 클론) |
| `/grok-route` | Grok 분기 라우터 |
| `/juggl-note` | Juggl 포함 표준 노트 생성 |
| `/note-link` | 노트 간 의미적 연결 |
| `/status-update` | 상태 갱신 |
| `/vault-health` | Vault 건강 진단 |
| `/vault-route` | 볼트 라우팅 및 진입 |
| `/vault-update` | 세션 종료 루틴 |
| `/install-plugin` | Obsidian 플러그인 설치 |
| `/open-vault` | Obsidian 볼트 열기 |
| `/open-note` | Obsidian 노트 열기 |
| `/open-notes` | 복수 노트 새 탭 열기 (local-rest-api) |
| `/reindex` | 볼트 콘텐츠 인덱스 재빌드 |
| `/note-from-video` | 영상 → 볼트 노트 변환 파이프라인 |
| `/note-from-article` | 웹 글/텍스트 → 볼트 노트 변환 파이프라인 |
| `/note-from-pdf` | PDF → 볼트 노트 변환 파이프라인 |

스킬 상세: `.claude/commands/MANIFEST.md` 참조.

---

## 6. 설정 구조

```
.claude/
├── rules/
│   ├── core/           ← 강제 규칙 (모든 에이전트 공통, 상시 주입, 배포 동기화 대상)
│   ├── custom/         ← 개인 규칙 (상시 주입, 배포 미대상)
│   └── MANIFEST.md     ← core/ 목록
├── rules-archive/      ← 자동 주입 제외, Skill Router 트리거 시 Read
├── commands/
│   ├── core/           ← 스킬 (배포 동기화 대상)
│   ├── custom/         ← 개인 스킬 (배포 미대상)
│   └── MANIFEST.md     ← core/ 목록
└── settings.local.json ← Claude Code 로컬 설정
```

### core vs custom 규칙

- **core/**: 모든 사용자에게 적용되는 제품 규칙. `aimv sync`로 자동 전파.
- **custom/**: 사용자 개인 규칙. 배포 동기화 대상 아님. 자유롭게 추가/수정.
- 신규 규칙은 custom/에 우선 생성 → 검증 후 core/로 격상.

### Skill Router 동적 로드 (Claude Code 동작)

공통 온보딩 §15 "규칙 동적 로드 구조"의 Claude Code 실행 방식:

- `_skill-router.md`의 트리거 키워드와 사용자 메시지를 매 턴 대조한다.
- 매칭되면 `Skill` 도구로 해당 스킬(`/distribute`, `/create-vault` 등)을 호출한다. 스킬 본문이 추가로 필요한 archive 규칙 파일을 지시하면 `Read` 도구로 로드한다.
- 파일만 지정된 행은 `Skill` 호출 없이 `Read` 도구로 바로 로드한다.
- 세션 내 이미 호출한 스킬/로드한 규칙은 재실행하지 않는다.

---

## 7. 강제 규칙 요약 (`.claude/rules/core/`)

| 규칙 | 핵심 |
|------|------|
| `vault-routing.md` | 콘텐츠 배치 전 볼트 레지스트리 확인 |
| `edit-mode-separation.md` | Contents/workspace 모드 분리, workspace는 AIHubVault 전용 |
| `note-writing.md` | frontmatter 필수, WikiLink 필수, URI 예약문자 금지 |
| `session-exit.md` | _STATUS.md + 핸드오프 양쪽 갱신 필수 |
| `post-edit-review.md` | 편집 후 검증 + 인덱싱 완료까지가 작업 종료 |
| `encoding-safety.md` | UTF-8 고정 I/O, Get-Content 파이프라인 금지 |
| `token-optimization.md` | 핀포인트 접근, 반복 읽기 금지, 고비용 작업 사전 승인 |
| `script-creation-approval.md` | 스크립트 생성 전 사용자 승인 필수 |
| `script-management.md` | Script_Registry 중복 확인, 경로 하드코딩 금지 |
| `temp-file-management.md` | $env:TEMP 사용, 볼트 내 임시 파일 방치 금지 |
| `distribution-sync.md` | 배포 반영 대상 변경 시 변경 로그 기록 |
| `juggl-style-sync.md` | Juggl 스타일 변경 시 graph.css 갱신 |
| `obsidian-config-safety.md` | .obsidian/ 편집은 AIHubVault에서만, Read→Edit 방식 |
| `vault-individualization.md` | 볼트 생성 시 `aimv clone` 사용, 이름/분류/태그 구체화 |

---

## 8. MCP 서버 연동

Claude Code는 MCP(Model Context Protocol) 서버를 통해 외부 도구와 연동한다.
설정: `~/.claude/settings.json` 또는 프로젝트별 `.claude/settings.local.json`.

### 이 환경에 연결된 MCP 서버

| 서버 | 용도 | 상세 |
|------|------|------|
| Serena | 시맨틱 코드 분석 (C# 심볼 기반) | `.claude/rules/custom/serena-mcp.md` |
| mcp-unity | Unity 에디터 조작 | 사용하지 않음 (unity-cli 우선) |
| Notion | Notion 페이지 읽기/쓰기 | `.claude/rules/custom/notion-sync.md` |
| Blender | Blender 3D 조작 | `.claude/rules/custom/blender-mcp.md` |
| Google Calendar | 일정 관리 | — |
| Gmail | 이메일 | — |
| Claude in Chrome | 브라우저 자동화 | — |

### Unity 도구 우선순위 (강제)

1. **unity-cli** — 최우선 (`unity-cli console`, `unity-cli editor refresh --compile`)
2. **Serena MCP** — C# 코드 심볼 탐색/수정
3. **mcp-unity** — unity-cli 없는 프로젝트에서만 대체

상세: `.claude/rules/custom/unity-tools.md`, `.claude/rules/custom/serena-mcp.md`

# AIMindVaults — Claude Code 온보딩

> Claude Code 에이전트 전용 온보딩 문서.
> 공통 규칙은 `AGENT_ONBOARDING.md`를 먼저 읽는다.
> 최종 현행화: 2026-07-01 (R168) — 2026-04-18 Phase 1 주입 구조 + R125 `.agents/` 공용공간 반영.

---

## 1. 진입점

- **루트 진입점**: `CLAUDE.md` — 의도별 진입 가이드, 볼트 라우팅 키워드 매핑, 볼트 진입 프로토콜, 주입 구조
- **볼트 레지스트리**: 루트 `_STATUS.md` — 실제 등록 볼트·타입·경로·작업 에이전트 (사용자 환경별 다름, 배포 문서에 개별 볼트명 인용 금지)
- **볼트 진입점**: `{볼트}/CLAUDE.md` — 볼트 전용 규칙 (수집 범위, 태그·타입 선언, 세션 규칙)

## 2. 세션 시작 순서

1. `CLAUDE.md` (루트) — 라우팅 허브. SessionStart hook 이 `agents-sync` 를 자동 실행해 `.agents/` 정본 ↔ `.claude/`·`.codex/` 미러 정합을 검증한다 (`AGENTS_SYNC_RESULT=NOOP` 정상)
2. `_SESSION_HANDOFF_CLAUDE.md` (루트) — 이전 세션 맥락
3. `_SESSION_HANDOFF_CODEX.md` (루트) — Codex 세션과 충돌/연계 확인
4. `_STATUS.md` (루트) — 전체 볼트 현황
5. `_AGENT_COMMS/to_claude/` 스캔 — open 큐 · 완료 트리거 · self-memo 분류 (3건 이상이면 frontmatter 일괄 확인 후 분류 보고. 규약: `.claude/rules/custom/agent-ownership.md`)
6. 대상 볼트의 `CLAUDE.md` → `_STATUS.md`

편집 전에 위 순서를 완료한다. 매 사용자 메시지마다 `_skill-router.md` 트리거 매핑을 검토한다.

---

## 3. 에이전트 식별

- **식별자**: `claude`
- frontmatter `agent: claude` (복수 에이전트 작업 시 `agent: [claude, codex]` 누적 기록)
- 세션 종료 시 `_STATUS.md`에 `claude / YYYY-MM-DD`로 기록
- 핸드오프 파일: `_SESSION_HANDOFF_CLAUDE.md` (자신의 파일만 갱신, 최신 1회분 유지)

---

## 4. Claude Code 역할 범위

| 영역 | Claude Code | Codex |
|------|-------------|-------|
| 멀티볼트 구조 변경 (볼트 생성, 폴더 재구조화) | O | X |
| 스크립트 개발/수정 (`_tools/cli-node/`) | O | X |
| 규칙/스킬 작성 (`.agents/`, `.claude/rules/`, `.claude/commands/`) | O | X |
| `.obsidian/` 설정 변경 | O | X |
| 복수 볼트에 걸치는 작업 | O | X |
| 단일 볼트 내 노트 편집 | O | O |
| 소스 노트 파이프라인 (영상/글/PDF → 노트) | O | O |
| 배포 동기화 실행 | X | O |

소유권·동시 수정 금지 영역 정본: `.claude/rules/custom/agent-ownership.md`

---

## 5. 스킬 (`.claude/commands/core/` — 2026-07-01 기준 21개)

| 스킬 | 용도 |
|------|------|
| `/auto-organize` | 노트/볼트 생성 시 폴더 자동 분류 |
| `/create-vault` | 새 볼트 생성 (Multi-Hub — Preset Hub 바인딩 클론) |
| `/delegate-task` | 에이전트 협업 위임 (큐 작성 + spawn + 트리거 + 추적) |
| `/hub-broadcast` | Hub 파일 전체 볼트 전파 |
| `/install-plugin` | Obsidian 플러그인 설치 (Hub 기준) |
| `/juggl-note` | Juggl 포함 표준 노트 생성 |
| `/note-from-video` | 영상 → 볼트 노트 변환 파이프라인 |
| `/note-from-article` | 웹 글/텍스트 → 볼트 노트 변환 파이프라인 |
| `/note-from-pdf` | PDF → 볼트 노트 변환 파이프라인 |
| `/note-link` | 노트 간 의미적 연결 생성 |
| `/obsidian-windows` | Obsidian 창 수 제어 (열기/닫기) |
| `/open-vault` | Obsidian 볼트 열기 |
| `/open-note` | Obsidian 노트 열기 |
| `/open-notes` | 복수 노트 새 탭 열기 |
| `/reindex` | 볼트 콘텐츠 인덱스 재빌드 |
| `/spawn-claude` | 루트에서 새 Claude CLI 인스턴스 실행 |
| `/status-update` | 상태 갱신 |
| `/sync-all` | 전체 위성 볼트 워크스페이스 동기화 |
| `/vault-health` | Vault 건강 진단 |
| `/vault-route` | 볼트 라우팅 및 진입 |
| `/vault-update` | 세션 종료 루틴 |

- 도메인 스킬 (custom, 배포 미대상): `.claude/commands/custom/<도메인>/` — 사용자 환경별 상이 (예: 3D 생성, 메시징 봇, 배포 운영 등)
- 스킬 상세: `.claude/commands/MANIFEST.md`. 트리거 매핑: `.claude/rules/core/_skill-router.md`

---

## 6. 설정 구조 (R125 공용공간 + 미러)

```
.agents/                        ← 에이전트 공용 정본 (rules/commands/hooks)
├── _MANIFEST.md                ← 영역별 버전 표 + 도메인 볼트 매핑
└── {rules,commands,hooks}/
    └── {core, custom/<도메인>}/
.claude/                        ← Claude 미러 + Claude 전용 설정
├── rules/
│   ├── core/                   ← 상시 주입 (배포 동기화 대상)
│   ├── custom/                 ← 개인 규칙 (배포 미대상)
│   ├── rules-archive/…         ← (.claude/rules-archive/) 자동 주입 제외 — Skill Router 경유 수동 Read
│   └── MANIFEST.md             ← core/ 목록
├── commands/{core,custom}/     ← 스킬 (+ MANIFEST.md)
├── hooks/                      ← PreToolUse·Stop·SessionStart 훅 (NUL 리다이렉트 차단, URI 예약문자 차단,
│                                  예약 파일명 차단, 스크립트 생성 advisory, Post-Edit advisory, Stop 시 상태 점검, agents-sync)
├── settings.json               ← hooks 등록 (공유)
└── settings.local.json         ← 로컬 권한
```

- **정본은 `.agents/`** — `agents-sync` 가 `.claude/`·`.codex/` 미러를 자동 생성·검증한다. 미러를 직접 편집하지 말고 정본을 편집.
- core = 배포 동기화 대상 / custom = 개인. 신규 규칙은 custom 우선 생성 → 검증 후 core 격상 + MANIFEST 등록.

---

## 7. 규칙 주입 구조 (2026-04-18 Phase 1 이후)

### 상시 주입 (`.claude/rules/core/` — 2026-07-01 기준 14개)

| 규칙 | 핵심 |
|------|------|
| `_essentials.md` | **통합 코어** — 보고 언어(한국어), 토큰 절약(인덱서 우선), 볼트 라우팅, 편집 모드 분리, Post-Edit Review, 노트 작성(frontmatter·태그·H1), 세션 종료 |
| `_skill-router.md` | 트리거 키워드 → Skill 호출 또는 rules-archive Read 매핑. 매 메시지 검토 |
| `distribution-content-safety.md` | 배포 대상 문서에 사용자 개인 볼트명·자산 인용 금지 |
| `distribution-sync.md` | 배포 반영 대상 변경 시 변경 로그 기록 |
| `encoding-safety.md` | UTF-8 고정 I/O, Get-Content 파이프라인 금지, dry-run → 샘플 → 전체 |
| `juggl-style-sync.md` | Juggl 임베드 규약 (`local:` = 파일명), graph.css 갱신 |
| `obsidian-config-safety.md` | `.obsidian/` 편집은 Hub 에서만, Read→Edit 방식, 버전 기록 |
| `script-creation-approval.md` | 스크립트 생성 전 사용자 승인 필수 |
| `script-management.md` | Script_Registry 중복 확인, 경로 하드코딩 금지 |
| `shell-redirect-safety.md` | 셸별 NUL 리다이렉트 구분 (Bash `2>/dev/null` · PS `2>$null` · CMD `2>nul`) |
| `temp-file-management.md` | `$env:TEMP` 사용, 볼트 내 임시 파일 방치 금지, MAX_PATH 삭제 절차 |
| `user-guidance.md` | 고위험 자기교정 (수동 복사 차단, 편집 모드 혼동, 버전 기록 누락 등) |
| `vault-individualization.md` | 볼트 생성 5단계 (clone → 레지스트리 → 키워드 → 인덱스 빌드 → obsidian.json 등록) |
| `viz-device-sync.md` | viz 디바이스 간 동기화 (자동 pull+sync, 스냅샷, KPI derive) |

### 조건부 로드 (`.claude/rules-archive/`)

자동 주입 제외. `_skill-router.md` 트리거 감지 시 수동 Read — 세부 원본: token-optimization, session-exit, note-writing, vault-routing, post-edit-review, edit-mode-separation, user-guidance-detail 등.

---

## 8. MCP 서버 연동

Claude Code 는 MCP(Model Context Protocol) 서버로 외부 도구와 연동한다.
설정: `~/.claude/settings.json` (CLI 전역) / 프로젝트 `.claude/settings.local.json`.

- **연결 서버 구성은 디바이스·세션별로 변동** — 세션 시작 시 실제 연결 목록 기준으로 판단한다. 문서의 고정 목록에 의존하지 않는다.
- 도메인별 MCP 규칙 (R125 카테고리화 이후 경로):
  - Unity: `.claude/rules/custom/Unity/unity-tools.md` (unity-cli → Serena → mcp-unity 우선순위 강제) + `Unity/serena-mcp.md` + `Unity/unity-scripting-style.md`
  - Blender: `.claude/rules/custom/Blender/blender-mcp.md`
  - Notion: `.claude/rules/custom/Notion/notion-sync.md`
  - 기타 도메인 (3D 생성 API, 메시징 봇 등): `.claude/rules/custom/<도메인>/`

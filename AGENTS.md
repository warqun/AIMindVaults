# AIMindVaults — 멀티볼트 라우팅 허브 (Codex)

> 이 파일은 Codex 데스크탑 앱 / Codex CLI 전용 진입점이다.
> Claude Code → `CLAUDE.md` 참조.

## 공통 규칙 (Phase 1 구조 — Mandatory)

세션 시작 시 다음 순서로 규칙을 로드한다:

1. **상시 필수** (Codex 는 명시적 Read, Claude 는 자동 주입):
   - `.claude/rules/core/*.md` — 배포 규칙 (모든 에이전트 공통)
   - `.claude/rules/custom/*.md` — 사용자 개인 규칙
2. **트리거 시 Read** (작업 유형별):
   - `.claude/rules-archive/*.md` — 도메인·상세 규칙
   - 트리거 매핑은 `.codex/rules/skill-router.md` 참조 (신설 예정)
   - 매핑 없으면 core/custom 만으로 진행

이 규칙들은 모든 AI 에이전트에 동일 적용되는 강제(Mandatory) 규칙이다.
Claude 는 자동 주입 메커니즘이 있고, Codex 는 없으므로 세션 진입 시 core/custom 파일을 명시적으로 Read 해야 한다.

여기 명시되지 않은 에이전트(Cursor, Windsurf, GitHub Copilot, Antigravity 등)도 자유롭게 부착 가능하며, 사용하지 않는 에이전트의 진입점·규칙 파일은 각 사용자가 정리한다.

## 에이전트 식별자

- **식별자**: `codex`
- 세션 종료 시 작업 에이전트를 `codex / YYYY-MM-DD`로 기록

## Codex 개인 룰 (사용자 지시 우선 — Mandatory)

- 사용자가 프롬프트에서 **작업(생성/수정/삭제/실행)** 을 명시하지 않으면, Codex는 **읽기 전용**으로만 동작한다.
- 읽기 전용 범위: 파일 탐색, 내용 조회, 상태 점검, 비교, 요약, 보고.
- 명시 지시 전 금지: 파일 변경, 자동화 등록/실행, 쓰기성 스크립트 실행, 외부 상태 변경.
- 지시가 모호하면 변경 작업을 시작하지 않고 짧게 확인한다.

## 세션 시작 순서

0. **`agents-sync --verify` 호출 (Mandatory, R122)** — `.agents/` 정본과 `.codex/` 미러 동기 상태 확인:
   ```bash
   node "Vaults/BasicVaults/CoreHub/.sync/_tools/cli-node/bin/cli.js" agents-sync --verify
   ```
   - exit 0 = 동기 OK (그대로 진행)
   - exit 1 = drift 감지 → `node ... agents-sync` 실행 (--apply 기본) 후 사용자에게 보고
   - Codex 는 hook 비활성이라 룰 따라 매 세션 진입 시 명시 호출 필수
1. 이 파일 (`AGENTS.md`)
2. `.claude/rules/core/*.md` — 상시 필수 (모든 파일 Read, `.agents/rules/core/` 정본 미러)
3. `.claude/rules/custom/*.md` — 상시 필수 (모든 파일 Read)
4. `_STATUS.md` (루트) — 전체 볼트 현황 + 다른 볼트 작업 확인
5. `_AGENT_COMMS/to_codex/` — Claude 가 남긴 메시지 스캔 (`status: open` 확인)
6. `.codex/rules/` — Codex 고유 규칙 (skill-router · edit-scope · status-sync · encoding-safety · vault-routing · create-vault-safety · agent-comms)
7. 작업 유형 트리거 매칭 시 도메인 룰/스킬 Read — 매핑은 `.codex/rules/skill-router.md` + `.agents/_MANIFEST.md` 참조 (R122 이후 도메인 분류: Unity·Blender·Meshy·Discord·Notion·Distribution·CreateVault 등). 대상 = `.codex/rules/custom/{도메인}/` + `.codex/skills/custom/{도메인}/` (미러, R122 이후)
8. (볼트 진입 시) 대상 볼트 `_STATUS.md`

편집 전에 위 순서를 완료한다.
`.codex/AGENT_STATUS.md` · 볼트별 `AGENTS.md` 는 레거시 항목 — 필요 시에만 Read (대부분 stub).

## 볼트 레지스트리

**볼트 전체 목록·경로·상태는 루트 `_STATUS.md` 볼트 레지스트리 참조.**

레지스트리는 카테고리별(BasicVaults, Domains, Labs, Projects 등) 테이블로 볼트명 · 타입 · 경로 · 콘텐츠 · 작업 에이전트를 관리한다.

볼트 ID → 실제 경로 해석은 루트 `_STATUS.md` 볼트 레지스트리의 "경로" 컬럼에서 lookup.

## 볼트 라우팅 규칙

1. 명시적 볼트 지정 우선
2. 키워드 추론:
   - "AI 워크플로우", "에이전트", "_Standards" → AIHubVault
   - "콘텐츠", "노트 작성" → BasicContentsVault
   - `<도메인 키워드>` → `<대응 볼트 ID>`

   > 사용자가 자기 환경 (Unity·게임 기획·요리·운동 등) 에 맞춰 키워드 매핑을 추가한다.
   > 실제 등록 볼트 목록은 `_STATUS.md` 의 볼트 레지스트리 섹션 참조 (사용자 환경별 다름).
3. 파일 경로 포함 시 → 경로에서 볼트 추출
4. 루트 파일만 대상이면 → 루트에서 작업
5. 모호하면 → 사용자에게 확인

## 루트 스코프

루트에서 직접 수정 가능한 대상:
- `AGENTS.md`, `CLAUDE.md`, `CODEX.md`
- `.claude/`, `.codex/`
- `_STATUS.md`, `_ROOT_VERSION.md`
- `_AGENT_COMMS/` (에이전트 간 소통 공간 — 볼트 아님)
- `docs/`

볼트 내부 파일은 대상 볼트 진입 후에만 수정한다.

## 에이전트 소유권 규칙

`.claude/rules/custom/agent-ownership.md` 참조.
- Codex: 단일 볼트 내 노트 편집, 반복 작업, 백그라운드 정리
- 동시 수정 금지: `_STATUS.md`, `_WORKSPACE_VERSION.md`, `.obsidian/`

## Serena MCP — 시맨틱 코드 분석 도구

Serena MCP는 전역 Codex 시작 설정에 등록하지 않는다. 비-Unity 작업에서 자동 기동하면 세션마다 `serena`/`uvx` 프로세스가 중복 실행되므로, **Unity C# 스크립팅 작업으로 라우팅된 경우에만** 도구 검색으로 Serena를 호출한다.

Unity 작업이 아닐 때는 Serena MCP를 호출하지 않는다. 일반 노트·루트·볼트 운영 작업은 인덱서, 파일 조회, 일반 검색 도구로 처리한다.

### 프로젝트 활성화 (Unity 작업 시 1회)

대상 Unity 프로젝트가 확정된 뒤, Serena 첫 사용 전에 활성화한다.

| 프로젝트 | 경로 |
|----------|------|
| GameMaker | `C:\Dev_Game\GameMaker` |
| CoreCombat | `C:\Dev_Game\CoreCombat` |

### 주요 도구

| 도구 | 용도 |
|------|------|
| `activate_project` | 프로젝트 활성화 (경로 지정) |
| `get_symbols_overview` | 파일 내 클래스/메서드 목록 조회 |
| `find_symbol` | 심볼 이름으로 검색 |
| `find_referencing_symbols` | 특정 심볼을 참조하는 곳 찾기 |
| `search_for_pattern` | 코드 패턴 검색 (grep 대체) |
| `replace_symbol_body` | 심볼 본문 교체 (편집 시) |

### 사용 원칙

- Unity/C# 작업 트리거가 감지된 경우에만 `.codex/rules/skill-router.md`의 Unity 행을 적용한다.
- Serena 도구가 아직 노출되지 않았으면 `tool_search`로 `serena`를 검색해 lazy-load한다.
- 파일 전체 읽기 전에 `get_symbols_overview`로 구조 파악
- `find_symbol`로 필요한 심볼만 골라 읽기
- 광범위 검색은 `search_for_pattern`으로 대체

---

## Unity CLI — Unity 에디터 제어

Unity 에디터가 해당 프로젝트를 열고 있을 때 사용 가능한 CLI 도구.

| 용도 | 명령 |
|------|------|
| 콘솔 로그 확인 | `unity-cli console` |
| 리컴파일 | `unity-cli editor refresh --compile` |
| 테스트 실행 | `unity-cli test` |
| Custom Tool | `unity-cli <tool_name> --params '{...}'` |

Custom Tools: CoreCombat `Assets/Editor/UnityCliTools/` (24개)
`mcp__mcp-unity__*` MCP 도구는 사용하지 않는다.

---

## Codex 고유 설정

- `.codex/config.toml` — 프로젝트 설정
- `.codex/rules/` — Codex 전용 규칙
- `.codex/skills/` — 작업 절차 캡슐화

## 세션 종료

볼트 `_STATUS.md` + 루트 `_STATUS.md` 양쪽 갱신 필수.
상세: `.claude/rules/core/session-exit.md`

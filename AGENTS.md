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

### Domains (도메인 지식 볼트)

| 볼트 ID | 경로 | 역할 | 상태 |
|---------|------|------|------|
| Unity | `Vaults/Domains_Game/Unity/` | Unity 엔진 도메인 지식 | active |
| GameDesign | `Vaults/Domains_Game/GameDesign/` | 게임 기획·디자인 | active |
| CapCut | `Vaults/Domains_Video/CapCut/` | CapCut 영상편집 도메인 지식 | active |
| Notion | `Vaults/Domains_Infra/Notion/` | Notion 워크스페이스 운영 | active |
| Git | `Vaults/Domains_VCS/Git/` | Git 버전관리 지식 | active |
| Blender | `Vaults/Domains_3D/Blender/` | Blender 3D 도메인 지식 | active |
| AI_Gen4Game | `Vaults/Domains_AI_Asset/AI_Gen4Game/` | AI 생성 게임 에셋 | active |

### Labs (도메인+프로젝트 복합 볼트)

| 볼트 ID | 경로 | 역할 | 상태 |
|---------|------|------|------|
| ObsidianDev | `Vaults/Lab_Infra/ObsidianDev/` | Obsidian 플러그인 개발 | active |

### Domain_Art (아트 도메인)

| 볼트 ID | 경로 | 역할 | 상태 |
|---------|------|------|------|
| LightAndColor | `Vaults/Domain_Art/LightAndColor/` | 빛과 색 이론, 색채학, 명암/색보정, 영화 색 스토리텔링 | active |
| ArtInsight | `Vaults/Domain_Art/ArtInsight/` | 미적 안목, 시각적 분별, 레퍼런스 해석, 취향과 스타일 판단 | active |

### Projects (프로젝트 볼트)

| 볼트 ID | 경로 | 역할 | 상태 |
|---------|------|------|------|
| CombatToolKit | `Vaults/Lab_Game/CombatToolKit/` | 게임 전투 시스템 개발 툴킷 | active |
| TileMapToolKit | `Vaults/Lab_Game/TileMapToolKit/` | 게임 타일맵 시스템 개발 툴킷 | active |
| JissouGame | `Vaults/Projects_Game/JissouGame/` | Unity 기반 게임 개발 프로젝트 | active |

### References (참조 전용)

| 볼트 ID | 경로 | 역할 | 상태 |
|---------|------|------|------|
| Unity_Documentation | `References/Unity_Documentation/` | Unity 6.3 공식 문서 (조회 전용) | readonly |

## 볼트 라우팅 규칙

1. 명시적 볼트 지정 우선
2. 키워드 추론:
   - "AI 워크플로우", "에이전트", "_Standards", ".forge" → AIHubVault
   - "Unity", "유니티 엔진" → Unity
   - "CapCut", "영상편집" → CapCut
   - "Notion", "노션 운영" → Notion
   - "Obsidian 플러그인", "플러그인 개발" → ObsidianDev
   - "전투 시스템", "CombatToolKit", "스킬 시스템", "이펙트 패키지", "뱀서" → CombatToolKit
   - "타일맵", "TileMap", "맵 생성", "청크", "절차적 생성" → TileMapToolKit
   - "JissouGame", "지쏘우", "jissou" → JissouGame
   - "게임 기획", "게임 디자인" → GameDesign
   - "Git", "버전관리" → Git
   - "Blender", "3D" → Blender
   - "AI 에셋", "생성형 AI" → AI_Gen4Game
   - "빛과 색", "색채학", "명암", "색온도", "필름룩", "RAW", "LOG" → LightAndColor
   - "아트 인사이트", "미적 감각", "안목", "취향", "유행과 트렌드", "올드와 클래식", "상황과 감정" → ArtInsight
3. 파일 경로 포함 시 → 경로에서 볼트 추출
4. 루트 파일만 대상이면 → 루트에서 작업
5. 모호하면 → 사용자에게 확인

## 루트 스코프

루트에서 직접 수정 가능한 대상:
- `AGENTS.md`, `CLAUDE.md`, `CODEX.md`
- `.claude/`, `.codex/`
- `_STATUS.md`, `_ROOT_VERSION.md`
- `docs/`

볼트 내부 파일은 대상 볼트 진입 후에만 수정한다.

## 에이전트 소유권 규칙

`.claude/rules/custom/agent-ownership.md` 참조.
- Codex: 단일 볼트 내 노트 편집, 반복 작업, 백그라운드 정리
- 동시 수정 금지: `_STATUS.md`, `_WORKSPACE_VERSION.md`, `.obsidian/`

## Serena MCP — 시맨틱 코드 분석 도구

Serena MCP 서버가 연결되어 있다. 파일을 통째로 읽지 말고 Serena의 심볼 도구를 우선 사용한다.

### 프로젝트 활성화 (세션 시작 시 1회)

대상 Unity 프로젝트에 접근하기 전에 활성화한다.

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

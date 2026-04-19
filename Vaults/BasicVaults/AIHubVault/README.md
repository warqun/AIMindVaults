# AIMindVault

> AI 작업환경 설계·개선·배포를 위한 Obsidian 볼트.
> Multi-agent orchestration (Claude · Codex · Copilot), 지식 그래프 시각화, 자동화 스크립트, AI 에이전트 운영 표준 문서 포함.

---

## 멀티볼트 시스템 필독

이 볼트는 **AIMindVaults 멀티볼트 시스템**의 일부입니다. 단독으로 사용하지 않습니다.
핵심 개념(Hub-Sync, 편집 모드 분리, 볼트 라우팅 등)은 [[CORE_CONCEPTS]]를 참고하세요.

### 구조

```
AIMindVaults/                    <- 멀티볼트 루트 (AI 에이전트 작업 경로)
├── CLAUDE.md                    <- Claude Code 라우팅 허브
├── CODEX.md                     <- Codex 라우팅 허브
├── .claude/                     <- 공통 규칙 + 커맨드
├── .codex/                      <- 공통 Codex 규칙
└── Vaults/
    └── BasicVaults/
        ├── AIHubVault/          <- 이 볼트 (작업환경 원본 Hub)
        └── BasicContentsVault/  <- 범용 콘텐츠 저장소
```

### AIHubVault = Hub (핵심 규칙)

- **이 볼트가 작업환경의 원본(Single Source of Truth)**입니다.
- `_Standards/Core/`, `_tools/`, `_WORKFLOW.md`, `_VAULT-INDEX.md`, `Juggl_StyleGuide/` 등 workspace 파일은 **이 볼트에서만 편집**합니다.
- 다른 볼트의 동일 파일은 Hub-Sync로 자동 전파됩니다. 직접 수정하지 마세요.
- Hub 식별 마커: `.sync/.hub_marker` 파일 (이 볼트에만 존재)

### Hub-Sync (자동 동기화)

- 다른 볼트를 Obsidian에서 열면 `sync_workspace.ps1`이 자동 실행됩니다.
- AIHubVault의 workspace 파일을 해당 볼트로 복사합니다.
- 동기화 대상: `_Standards/Core/Hub_Sync_Targets.md` 참조
- **전제 조건**: Shell Commands 플러그인에 `syncworkspace` 명령이 `on-layout-ready` 이벤트로 등록되어 있어야 합니다.

---

## Prerequisites

- **Obsidian** v1.5 이상
- **Shell Commands** 플러그인 (Hub-Sync 자동 실행에 필수)
- **(선택)** Git — obsidian-git을 통한 자동 버전 관리 사용 시
- **(선택)** AI 에이전트 CLI — 사용하려는 에이전트에 맞게 설치:
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — `npm install -g @anthropic-ai/claude-code`
  - [Codex CLI](https://github.com/openai/codex) — `npm install -g @openai/codex`
  - [Cursor](https://www.cursor.com/) — 설치 후 `AIMindVaults/`를 프로젝트로 열기
  - [Windsurf](https://windsurf.com/) — 설치 후 `AIMindVaults/`를 프로젝트로 열기

---

## Quick Start

### 1. AIMindVaults 받기

ZIP 다운로드 후 원하는 위치에 압축 해제.

> **Windows 경로 길이 주의**: Windows는 기본적으로 경로 260자 제한이 있습니다. 볼트 내부 경로가 깊으므로, `AIMindVaults/`는 드라이브 루트 가까이에 배치하세요 (예: `C:\AIMindVaults/`, `D:\AIMV/`). `C:\Users\...\Documents\Projects\` 같은 깊은 경로에 넣으면 파일 복사·압축 해제 시 오류가 발생할 수 있습니다.
>
> 근본 해결: Windows Long Path 지원을 활성화하면 260자 제한이 해제됩니다.
> ```
> 레지스트리: HKLM\SYSTEM\CurrentControlSet\Control\FileSystem
> 값: LongPathsEnabled = 1 (DWORD) → 재부팅 필요
> ```

### 2. Obsidian에서 볼트 등록

각 볼트를 **개별적으로** Obsidian에 등록합니다:

1. Obsidian -> **Open folder as vault** -> `Vaults/BasicVaults/AIHubVault/` 선택
2. 같은 방식으로 `Vaults/BasicVaults/BasicContentsVault/` 등록
3. 첫 실행 시 "커뮤니티 플러그인 사용" -> **Turn on community plugins** 클릭

### 3. Shell Commands 플러그인 확인

각 볼트에서 `Settings -> Shell Commands`를 열어 `syncworkspace` 명령이 등록되어 있고, `on-layout-ready` 이벤트가 활성화되어 있는지 확인합니다.

- AIHubVault에서는 자기 자신이 Hub이므로 동기화가 SKIP됩니다 (정상).
- 다른 볼트에서는 열 때마다 AIHubVault와 버전을 비교하고 필요 시 자동 동기화합니다.

### 4. AI 에이전트 설정

AI 에이전트(Claude Code, Codex 등)의 **프로젝트 루트를 `AIMindVaults/` 디렉토리**로 설정합니다.

- Claude Code → 루트 `CLAUDE.md`가 볼트 라우팅 허브 역할
- Codex → 루트 `AGENTS.md`가 진입점 (구 `CODEX.md`는 `.codex/CODEX.md`로 리다이렉트)
- 에이전트는 사용자의 작업 대상에 따라 적절한 볼트로 자동 라우팅됩니다.

---

## 새 볼트 추가하기

1. `BasicContentsVault/_tools/clone_vault.ps1`로 BasicContentsVault를 클론하여 새 볼트 생성
2. `Vaults/` 하위 적절한 위치에 배치 (카테고리 폴더 자유롭게 추가 가능)
3. Obsidian에서 볼트 등록
4. Shell Commands 플러그인에 `syncworkspace` 등록 (`on-layout-ready` 활성화)
5. 루트 `CLAUDE.md`의 볼트 레지스트리 테이블에 추가

---

## 볼트 구조

```
AIMindVault/
├── Contents/              # 볼트 콘텐츠
│   ├── Domain/            # 지식 축적 (가이드, 리서치, 프롬프트)
│   └── Project/           # 작업 관리 (아이디어, 계획)
├── _Standards/            # Vault 일관성 기준 및 플러그인 운영 표준
│   ├── Core/              # 공통 운영 표준 (Hub-Sync으로 모든 볼트에 배포)
│   └── Contents/          # 이 볼트 전용 규칙 (동기화 안 됨)
├── _tools/                # 자동화 스크립트 (PowerShell CLI)
├── Juggl_StyleGuide/      # Juggl 그래프 스타일 가이드
├── Tags/                  # 태그 정의 노트
├── _VaultReview/          # 에이전트 검토 보고서
├── _STATUS.md             # 현재 작업 상태 (세션 시작 시 확인)
├── _VAULT-INDEX.md        # 작업환경 디렉토리 맵
├── _WORKFLOW.md           # 운용 규칙 (편집 모드, 동기화 등)
├── _WORKSPACE_VERSION.md  # 동기화 버전 추적
└── .claude/               # Claude Code 설정 (rules, commands)
```

---

## AI 에이전트 연동

| 에이전트 | 설정 파일 위치 |
|---------|-------------|
| Claude Code | `.claude/CLAUDE.md`, `.claude/rules/`, `.claude/commands/` |
| Codex | `.codex/` |
| Antigravity | `.antigravity/SESSION_RULES.md` |
| Cursor | `.cursor/rules/` |

각 AI 도구의 workspace로 **멀티볼트 루트(`AIMindVaults/`)**를 지정합니다.
볼트별 설정은 각 볼트 내부의 에이전트 폴더에 있습니다.

### 새 AI 에이전트 연동 시

로컬 AI 에이전트(Claude Code, Cursor, Windsurf 등)는 **프로젝트 폴더를 워크스페이스로 등록**해서 사용합니다. 압축 해제한 `AIMindVaults/` 폴더를 에이전트의 워크스페이스(프로젝트 루트)로 열어주세요. 그 후 아래 프롬프트를 에이전트의 첫 대화에 복사·붙여넣기하면 에이전트가 자기 설정 방식을 알려줍니다:

````
이 프로젝트는 AIMindVaults라는 멀티볼트 Obsidian 시스템이야.
여러 AI 에이전트(Claude Code, Codex, Antigravity 등)가 동시에 작업하는 환경이고,
각 에이전트마다 설정 파일과 진입 규칙이 별도로 구성되어 있어.

너를 이 시스템에 새 에이전트로 연동하고 싶어.
아래 정보를 기반으로 설정 파일을 만들어줘:

## 현재 시스템 구조
- 멀티볼트 루트: AIMindVaults/ (에이전트 프로젝트 루트)
- 볼트 위치: Vaults/ 하위 (예: Vaults/BasicVaults/AIHubVault/)
- 기존 에이전트 설정 예시:
  - Claude Code: 루트 CLAUDE.md + .claude/rules/ + 볼트별 CLAUDE.md
  - Codex: 루트 CODEX.md + .codex/rules/ + 볼트별 CODEX.md
  - Antigravity: 볼트별 .antigravity/SESSION_RULES.md

## 필요한 것
1. 루트 진입점 파일 (볼트 라우팅 허브 역할)
2. 볼트별 규칙 파일 (볼트 고유 규칙 + 세션 루틴)
3. 공통 규칙 참조 방법 (AIMindVaults/.claude/rules/ 에 이미 정의된 공통 규칙 활용)

## 네가 알려줘야 할 것
- 너의 에이전트 이름
- 자동으로 읽는 설정 파일 규칙 (파일명, 위치, 포맷)
- 루트 접속인지 볼트 단위 접속인지
- rules/commands 같은 하위 폴더를 지원하는지

이 정보를 알려주면, 기존 에이전트 패턴에 맞춰서 설정 파일을 구성할게.
참고할 기존 파일: 루트 CLAUDE.md, .codex/rules/vault-routing.md
````

---

## 플러그인

### 커뮤니티 플러그인 (24개)

`Settings -> Community plugins -> Browse`에서 검색·설치·활성화:

| 플러그인명                     | 용도 |
| ------------------------- | ------- |
| Advanced Canvas           | 캔버스 고급 기능 확장 (카드 색상, 엣지 스타일, 그룹 등) |
| Advanced Tables           | 마크다운 표 자동 정렬 및 키보드 편집 지원 |
| BRAT                      | 베타·미출시 플러그인 GitHub URL로 설치·관리 |
| Colored Tags              | 태그에 색상 적용해 시각적 구분 |
| Dataview                  | 노트를 데이터베이스처럼 쿼리·테이블·리스트로 표시 |
| Git                       | Git 자동 커밋·푸시·풀 (버전 관리) |
| Global Search and Replace | 볼트 전체 텍스트 일괄 검색·치환 |
| Juggl                     | 인터랙티브 지식 그래프 시각화 |
| Linter                    | 노트 형식 자동 교정 (frontmatter, 공백, 줄바꿈 등) |
| Local REST API            | 외부 도구(Claude 등)에서 Obsidian에 HTTP API로 접근 |
| make.md                   | 파일 관리·Spaces·스마트 폴더 UI 제공 |
| MCP Tools                 | MCP 서버 연동 — AI 에이전트와 Obsidian 연결 |
| Mermaid Themes            | Mermaid 다이어그램 테마 커스터마이징 |
| Mermaid Tools             | Mermaid 다이어그램 작성 보조 도구 |
| Meta Bind                 | 노트 내 인터랙티브 위젯 (버튼·슬라이더·입력창) |
| Metadata Menu             | 프론트매터 메타데이터 관리 UI |
| New 3D Graph              | 3D 지식 그래프 시각화 |
| QuickAdd                  | 빠른 노트 생성·템플릿·매크로 실행 |
| Share to NotionNext       | 노트를 Notion 페이지로 내보내기 |
| Shell Commands            | 터미널 명령어를 Obsidian 내에서 직접 실행 |
| Smart Connections         | AI 기반 노트 의미 유사도 연결 추천 |
| TagFolder                 | 태그 기반 가상 폴더 뷰 제공 |
| Tasks                     | 할 일 목록·마감일·필터·반복 일정 관리 |
| Templater                 | 고급 템플릿 작성 및 자동화 (JS 스크립팅 지원) |

### 베타 플러그인 (3개)

BRAT 설치 후, `Settings -> BRAT -> Add Beta plugin`에서 URL 입력:

| 플러그인         | GitHub URL                                          | 용도 |
| ------------ | --------------------------------------------------- | ------- |
| Claudian     | https://github.com/YishenTu/claudian                | Claude AI를 Obsidian 내에서 직접 실행 |
| Time Machine | https://github.com/dsebastien/obsidian-time-machine | 노트 편집 히스토리·스냅샷 조회 및 복원 |
| YTranscript  | https://github.com/lstrzepek/obsidian-yt-transcript | YouTube 영상 자막 추출·노트 삽입 |

> 상세 -> `_Standards/Plugins/Installed_Plugins_Index.md`

---

## 플러그인 상세 정보

-> `_Standards/Plugins/README.md`

---

## 삭제/이동 시 주의

`AIMindVaults/` 폴더를 삭제하거나 이동하기 전에, 이 폴더를 워크스페이스로 등록한 AI 에이전트가 없는지 확인하세요. **에이전트가 워크스페이스로 열고 있는 폴더는 삭제/이동이 실패합니다.**

해제 방법:
- **Claude Code**: `claude` 세션 종료 (`/exit` 또는 터미널 닫기)
- **Cursor / Windsurf**: 해당 프로젝트를 닫거나 다른 폴더로 전환
- **Codex CLI**: 실행 중인 세션 종료

모든 에이전트에서 워크스페이스 연결을 해제한 후 삭제/이동합니다.

---

## License

MIT

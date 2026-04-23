# AIMindVaults — 멀티볼트 라우팅 허브

> 이 디렉토리는 여러 Obsidian 볼트를 관리하는 최상위 작업 디렉토리.
> 개별 볼트 작업 시 반드시 볼트 진입 프로토콜을 따른다.
> 공통 강제 규칙은 `.claude/rules/core/`에 정의되어 자동 적용.

## 의도별 진입 가이드

사용자 메시지에서 **의도 카테고리** 를 먼저 식별한 뒤 해당 진입점부터 읽는다. 의도가 불명확하면 § "볼트 진입 프로토콜" 의 키워드 매핑으로 내려간다.

| 의도 | 진입점 (순서대로) |
|------|------------------|
| **현재 상태·우선순위 파악** | 루트 `_STATUS.md` → 대상 볼트 `_STATUS.md` |
| **이전 세션 맥락 복원** | 루트 `_SESSION_HANDOFF_CLAUDE.md` · `_SESSION_HANDOFF_CODEX.md` → 대상 볼트 `_SESSION_HANDOFF_*` |
| **새 노트 작성** | 볼트 라우팅 (§ 볼트 진입 프로토콜 키워드 매핑) → 대상 볼트 `CLAUDE.md` → `/juggl-note` 또는 `/note-from-*` |
| **기존 콘텐츠 검색·조사** | `aimv index search -r <볼트>` (단일) 또는 `aimv index master-search` (크로스볼트) |
| **도메인 지식 참조** | Domains_* 볼트 (Unity, Python, Cooking, AI 등) · 각 볼트 `_VAULT-INDEX.md` |
| **프로젝트·도구 작업** | Projects_* / Lab_* 볼트 · 해당 볼트 `_STATUS.md` Now·Next 확인 |
| **Multi-Hub 시스템 변경** | Core 계층 → `Vaults/BasicVaults/CoreHub/` · Custom 계층 → `AIHubVault/` · 루트 규칙·스킬 → `.claude/` |
| **배포·Git push** | 해당 언어 배포본 레포 (`Korean` / `English`) 경로에서 Git 작업 |
| **규칙·스킬 추가·수정** | `.claude/rules/core/` (배포 대상) · `.claude/rules/custom/` (개인) · `.claude/commands/`  |
| **개인 기록·회고** | Diary 볼트 (AI 접근 `ai_scope=none` 기본) |
| **멀티 에이전트 협업** | `.claude/rules/custom/agent-ownership.md` + 대상 볼트 `AGENT_STATUS.md` |

각 의도는 **시간(과거/현재) × 대상(볼트/Hub/루트) × 행위(읽기/편집/배포)** 3축의 교차점을 구체적 진입 파일로 가리킨다. 진입 후에도 볼트 경계를 넘으면 "볼트 진입 프로토콜" 의 필수 읽기 순서를 따른다.

## 볼트 목록과 경로

**볼트 전체 목록·경로·상태는 루트 `_STATUS.md` 볼트 레지스트리 참조.**

레지스트리는 카테고리별(BasicVaults, Domains, Labs, Projects 등) 테이블로 볼트명 · 타입 · 경로 · 콘텐츠 · 작업 에이전트를 관리한다.

## 볼트 진입 프로토콜 (강제)

### 1. 대상 볼트 식별

- 명시적 지정: "AIHubVault에서 ~", "BasicContentsVault ~"
- 키워드 추론 (아래 매핑):

| 키워드 | 볼트 ID |
|-------|---------|
| _Standards, workspace, 동기화 스크립트 | AIHubVault (workspace 전용 Hub) |
| 콘텐츠, 노트 작성, 지식 관리 | BasicContentsVault |
| Unity, 유니티 엔진 | Unity |
| CapCut, 영상편집 | CapCut |
| Notion, 노션 운영 | Notion |
| CI/CD, 배포 동기화, 파이프라인 | CICD |
| 검색, 인덱싱, 인덱서, 텍스트 매칭, Search | Search |
| AI 활용, 에이전트 활용법, 프롬프트, AI 도구 | AI |
| AppFlowy, 셀프호스트, Notion 이관 | AppFlowy |
| Discord, 디스코드, 디코, 디스코드 봇, MEE6, Carl-bot, Welcome 플로우, Rules Screening, 커뮤니티 모더레이션 | Discord |
| AIMindVaults 프로젝트, 멀티볼트 계획, 배포 계획 | Project_AIMindVaults |
| Obsidian 플러그인, 플러그인 개발 | ObsidianDev |
| 전투 시스템, CombatToolKit, 스킬 시스템, 이펙트 패키지, 뱀서 | CombatToolKit |
| 타일맵, TileMap, 맵 생성, 청크, 절차적 생성 | TileMapToolKit |
| JissouGame, 지쏘우, jissou | JissouGame |
| 게임 기획, 게임 디자인, 레벨 디자인, 밸런싱, GameDesign | GameDesign |
| 게임 아트, 비주얼 기법, Fake 2D, 렌더링 스타일, 셰이더 스타일 | GameArt |
| Blender, 블렌더, 3D 모델링, 메시, 텍스처링 | Blender |
| Git, 깃, 버전 관리, 브랜치, 커밋 | Git |
| AI 에셋, Meshy, AI 텍스처, AI 3D 생성, AI_Gen4Game | AI_Gen4Game |
| 빛과 색, 색채학, 명암, 색온도, Light and Color | LightAndColor |
| 아트 인사이트, 미적 감각, 안목, 취향, 유행과 트렌드, 올드와 클래식, 상황과 감정 | ArtInsight |
| 크라우드 펀딩, 펀딩, 수익 모델, 자금 조달, Funding | Funding |
| Python, 파이썬, pandas, numpy, pip | Python |
| JavaScript, 자바스크립트, Node.js, 노드, npm, TypeScript, 타입스크립트 | JavaScript |
| AI 코딩, 코드 스타일, 클린 코드, 네이밍 규약, 리팩토링, AI_Coding | AI_Coding |
| 요리, 조리과학, 식재료, 조리 기법, 식문화, Cooking | Cooking |
| 요리철학, 요리연구, 요리 채널, 레시피 분석, CookingLab | CookingLab |
| 다이어리, 회고, 성장 기록, 개인 메모 | Diary |
| Unity 매뉴얼, 스크립트 API, Unity 문서 | Unity_Documentation (readonly) |

- 파일 경로 포함 시 → 경로에서 볼트 추출
- 모호하면 → 사용자에게 확인
- **볼트 ID → 실제 경로 해석은 루트 `_STATUS.md` 볼트 레지스트리의 "경로" 컬럼에서 lookup**

### 2. 볼트 진입 시 필수 읽기 (순서대로)

- `_SESSION_HANDOFF_CLAUDE.md` (루트) — Claude 이전 세션 맥락
- `_SESSION_HANDOFF_CODEX.md` (루트) — Codex 이전 세션 맥락 (충돌/연계 확인)
- `_STATUS.md` (루트) — 전체 볼트 현황 + 다른 볼트 작업과 충돌/연계 확인
- `{볼트경로}/CLAUDE.md` — 볼트 전용 규칙
- `{볼트경로}/_STATUS.md` — 현재 진행 상황

### 3. 작업환경 동기화 검토 (대상 볼트 ≠ AIHubVault인 경우)

- `{볼트경로}/_WORKSPACE_VERSION.md` 최상단 버전과 AIHubVault의 최상단 버전 비교
- 차이 있으면 → AIHubVault 기준으로 동기화 수행 후 작업 시작
- 상세 프로토콜: AIHubVault `Contents/Project/plan/AIMindVaults_plan/20260311_허브_동기화_계획.md`

### 4. 교차 작업 규칙

- 2개 이상 볼트 수정 시 볼트별로 분리하여 순차 실행
- 볼트 전환 시 현재 볼트의 편집을 완결한 후 전환

## 루트 작업 범위

루트에서 직접 수정 가능한 대상:
- `_STATUS.md` (멀티볼트 상태 허브)
- `CLAUDE.md` (이 파일)
- `CODEX.md` (Codex 루트 진입점)
- `.claude/` (루트 Claude 설정)
- `.codex/` (루트 Codex 설정)
- `.cursor/` (루트 Cursor 설정)
- `docs/` (루트 문서)

볼트 내부 파일은 볼트 진입 프로토콜을 거친 후에만 수정한다.

## 주입 구조 (2026-04-18 Phase 1 이후)

### 상시 주입 (모든 세션)

- `.claude/rules/core/_essentials.md` — 보고 언어, 토큰 절약, 볼트 라우팅, 편집 모드, Post-Edit Review, 노트 작성, 세션 종료 **통합 코어**
- `.claude/rules/core/_skill-router.md` — 키워드 → 로드할 규칙 파일 매핑
- `.claude/rules/core/` 나머지 — 배포 규칙 (distribution-sync, encoding-safety, juggl-style-sync, obsidian-config-safety, script-creation-approval, script-management, temp-file-management, user-guidance)
- `.claude/rules/custom/` — 사용자 개인 규칙

### 조건부 로드 (Skill Router 트리거 시)

- `.claude/rules-archive/` — 자동 주입 제외. 트리거 키워드 감지 시 `_skill-router.md` 지시에 따라 Read.

### 네임스페이스 구조

```
.claude/rules/core/       ← 배포 규칙 (동기화 대상, 자동 주입)
.claude/rules/custom/     ← 사용자 규칙 (동기화 미대상, 자동 주입)
.claude/rules-archive/    ← 자동 주입 제외, Skill Router 경유 수동 Read
.claude/commands/core/    ← 배포 스킬 (동기화 대상)
.claude/commands/custom/  ← 사용자 스킬 (동기화 미대상)
```

각 폴더의 `MANIFEST.md`에 배포 파일 목록이 명시되어 있다.

## 에이전트 필수 준수 사항

- **매 사용자 메시지 수신 시**: `_essentials.md` + `_skill-router.md` 기반 작업 판정. 트리거 키워드 감지 시 해당 규칙 파일을 Read한 후 작업 시작.
- **볼트 생성 시**: `vault-individualization.md` 규칙을 따라 이름/분류/CLAUDE.md/태그를 구체화한다.
- **멀티볼트 커스텀 설정 시**: `multivault-personalization.md`를 참조하여 사용자의 에이전트/플러그인 선택을 반영한다.
- **에이전트 진입점 파일** (`CLAUDE.md`, `CODEX.md`, `AGENT_STATUS.md`)은 볼트 개별 파일이므로 배포 동기화에 포함하지 않는다.

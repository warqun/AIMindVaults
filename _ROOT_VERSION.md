---
type: version-log
tags:
  - AIMindVault
  - root
updated: 2026-04-20
---

# Root Version Log

멀티볼트 루트 레벨 변경 이력. `.claude/`, `.antigravity/`, 루트 설정 파일 등의 변경을 추적한다.

## 배포 반영 상태 컬럼 (2026-04-15 도입)

- **Korean**: `C:\SellingVault\Korean\AIMindVaults` 배포 반영 여부
- **English**: `C:\SellingVault\English\AIMindVaults` 배포 반영 여부
- 값: `✅` 반영 완료 / `🕓` 대기 / `–` 해당 언어 배포에 무관 (원본 전용 또는 custom 규칙)
- 2026-04-15 이전 항목은 스키마 도입 전이므로 공란으로 둔다.

## 신규 스키마 (2026-04-15 이후)

| 버전 | 날짜 | Korean | English | 변경 내용 |
|------|------|--------|---------|----------|
| R067 | 2026-04-20 | 🕓 | 🕓 | **Multi-Hub Phase 1 최종 완료 — 검수 통과 + 세션 종료**. (1) `.claude/commands/core/create-vault.md` 업데이트 — Hub 선택 UX + `--hub` 옵션 예시 (CoreHub · AIHubVault) 추가. (2) 루트 `_STATUS.md` 갱신 — BasicVaults 레지스트리에 CoreHub (Core Hub, hubId=core) · AIHubVault_Minimal (Preset, hubId=minimal) 신규 등록 · AIHubVault 타입을 "Hub" → "Preset Hub (default)" 로 변경. Project_AIMindVaults 행에 Multi-Hub Phase 1 완료 기록. (3) 설계 문서 `20260419_Multi_Hub_아키텍처_설계` 헤더에 Phase 1 구현 완료 링크 추가. (4) 구현 결과 노트 `20260420_Multi_Hub_Phase1_구현_결과` 신규 작성 (Project_AIMindVaults). (5) 루트 `_SESSION_HANDOFF_CLAUDE.md` 재작성. Korean/English 배포 대기 — CoreHub/AIHubVault_Minimal 포함한 BasicVaults 전체가 deploy 시 자동 반영 예정 |
| R066 | 2026-04-20 | 🕓 | 🕓 | **Multi-Hub Phase 1 → 루트 규칙 반영**. (1) `.claude/rules/core/_skill-router.md` — Multi-Hub 트리거 행 추가 (키워드: Core Hub, Preset Hub, CoreHub, core-sync, core-sync-all, hub-source.json, hub-marker.json, create-hub, multi-hub, 프리셋 허브, 코어 허브, bump-version --broadcast, hubId, hubType, hub-resolver) → 설계 문서 + 구현 결과 노트 Read 지시. (2) `.claude/rules/core/_essentials.md § 4` — workspace 모드 섹션 전면 재작성: Multi-Hub 계층 표 (Core Hub / Preset Hub / 루트 / 볼트별), Core 편집 워크플로우 강제 (CoreHub 에서만 · bump-version --broadcast 자동 체인 · 실행 전 완료 보고 금지), Preset Hub 편집 순서, 절대 금지 규칙 (Preset/위성에서 Core 편집 · 위성에 hub-marker 수동 작성). 두 파일 상시 주입 대상이라 에이전트가 다음 세션부터 자동으로 Multi-Hub 트리거 인식 + Core 편집 규칙 강제 적용. Korean/English 배포 대기 — 배포 시 CoreHub 자체도 BasicVaults 에 포함되어 함께 배포됨 |
| R065 | 2026-04-19 | – | – | **Phase 8 설정 재검증 — bkit/MCP 누수 원인 제거**. 1차 실측 결과 Custom agents 6.3k·MCP deferred 67.3k 미감소 확인. 원인 진단: (1) `C:/AIMindVaults/.claude/settings.json`의 `bkit: true`가 전역 `false` 오버라이드 → 루트 세션에서 bkit 16개 에이전트 로드. (2) `C:/Users/c/.claude.json`의 전역 `mcpServers`에 `mcp-unity`·`serena` 등록 → 모든 세션에 주입. 조치: (1) `C:/AIMindVaults/.claude/settings.json`에서 `enabledPlugins` 블록 제거 (bkit·github 전역 false 승계). (2) `C:/Users/c/.claude.json`의 `mcpServers` 비움 (`{}`), `mcp-unity`·`serena` 제거. 백업 `~/.claude.json.backup-20260419`. (3) `C:/Dev_Game/GameBaseProject/.claude/settings.json`에 `serena` MCP 추가 (Unity 프로젝트에서만 로드). (4) `Vaults/Projects_Infra/Project_AIMindVaults/.claude/settings.json`·`Vaults/Lab_Game/CombatToolKit/.claude/settings.json`·`Vaults/Lab_Game/TileMapToolKit/.claude/settings.json` 3개 신규 — 해당 하위 볼트에서만 bkit 활성. 예상 효과: AIMindVaults 루트 세션 Custom agents 6.3k → 0, MCP deferred 중 mcp-unity(28 tools)·serena(19 tools) 제거분 ~8k 감소. 잔여 MCP deferred(~59k)는 Claude Desktop 내장 커넥터(Calendar·Gmail·MS Docs·Chrome 등)로 데스크탑 UI에서 비활성화 필요. 사용자 환경이라 배포 대상 아님 |
| R064 | 2026-04-18 | – | – | **Phase 8 MCP/Plugins 최적화 완료 — 사용자 환경 설정**. (1) 전역 `~/.claude/settings.json` 재구성: `mcpServers` 7개 → 1개(`notion`만 유지). 제거: `playwright`, `context7`, `github`(Failed). 이동: `mcp-unity`, `blender`, `youtube-transcript`. `enabledPlugins` 2개 모두 `false`로 전환(`bkit@bkit-marketplace`, `github@claude-plugins-official`). (2) AIMindVaults 프로젝트 `.claude/settings.json` 신규 — `bkit` 플러그인 프로젝트 범위 활성화(CombatToolKit/TileMapToolKit/Project_AIMindVaults 볼트 작업용), `blender`·`youtube-transcript` MCP 포함. (3) Unity 프로젝트 `C:/Dev_Game/GameBaseProject/.claude/settings.json` 신규 — `mcp-unity` MCP만 포함. 백업: `~/.claude/settings.json.backup-20260418`. 사용자 환경 변경이라 배포 대상 아님(Korean/English 모두 `–`). 예상 효과: MCP tools (deferred) 67.3k → ~15k, Custom agents 6.3k → ~0, 전체 베이스라인 170k → ~80k |
| R063 | 2026-04-18 | ✅ | ✅ | **`.forge/` 디렉토리 전면 제거**. (1) 29개 볼트(AIHubVault, BasicContentsVault, Domains/Labs/Projects 전체)에서 `.forge/` 디렉토리 삭제 — 외부 에이전트 결과물 스테이징 허브 개념 폐기. (2) 원본 `_forge`/`.forge` 참조 정리: 루트 `CLAUDE.md`, `.cursorrules`, `.codex/CODEX.md`, `.codex/rules/vault-routing.md`, `_WORKFLOW.md`, `.sync/_WORKFLOW.md`; AIHubVault `CLAUDE.md`, `_STATUS.md`, `AGENTS.md`, `CODEX.md`, `.codex/CODEX.md`, `.codex/rules/never-do.md`, `.antigravity/SESSION_RULES.md`, `.github/copilot-instructions.md`, `CORE_CONCEPTS.md`, `README.md`, `_Standards/CONTENTS_SPEC.md`, `Contents/CONTENTS_GLOSSARY.md`, `Contents/CONTENTS_AI_RULES.md`; 루트 `_Standards/Core/Script_Registry.md`(`.forge/staging/` 일회성 스크립트 2개 제거). (3) PS1 로직 수정 — `_tools/cli/pre_sync.ps1`, `sync_workspace.ps1`의 Hub 식별 마커를 `_forge/` → `.sync/.hub_marker`로 변경 (Node.js CLI와 일관). (4) Korean/English 배포본에는 이미 `.forge/` 제거 진행분(각 47개/141개)이 미커밋 상태로 존재 — 이번 R063 커밋에 포함하여 정리. 유지: 각 볼트 `_VAULT-INDEX.md`, `_WORKSPACE_VERSION.md`, Contents 계획 노트의 과거 기록 항목은 역사 보존 |
| R062 | 2026-04-18 | ✅ | ✅ | **규칙 주입 구조 개편 Phase 2-C + Phase 3 완료**. (1) Phase 2-C: `core/user-guidance.md` §5(workspace 동기화)·§8(편집 후 검증) 안내문을 _essentials.md 참조형으로 축약 — 구체 명령은 `_essentials.md § 4/§ 5`로 위임, user-guidance는 감지+핵심 한줄 유지. (2) Phase 3: `core/vault-individualization.md`(2.1k) → `rules-archive/vault-individualization.md` 이관. `commands/core/create-vault.md` 본문에 archive Read 지시 추가. `core/_skill-router.md`의 "새 볼트 생성" 행을 `/create-vault` Skill + archive Read로 전환. `core/user-guidance.md §2` 참조 경로를 rules-archive 경로로 수정. 루트 `CLAUDE.md` 상시 주입 "나머지" 목록에서 vault-individualization 제거. `.claude/rules/MANIFEST.md` 갱신 — core 테이블에서 제거, rules-archive에 Phase 3 섹션 신설. (3) Phase 2-A 잔여 bulk-edit-safe **최종 결론: 생성하지 않음** — encoding-safety·temp-file-management는 core 유지 (평시 필수 안전 규칙, Skill 트리거로는 자기교정 지연 리스크). Phase 3 예상 감축 -2.1k (Memory files 25.1k → ~23k). Korean/English 배포 모두 🕓 — vault-individualization은 범용 규칙이라 배포 대상, 경로 이관은 배포본에도 그대로 반영 필요 |
| R061 | 2026-04-18 | ✅ | ✅ | **규칙 주입 구조 개편 Phase 2-A 전체 완료 — 도메인 규칙 6개 Skill 전환**. custom/에서 rules-archive/로 6개 규칙 이관: `blender-mcp.md`, `notion-sync.md`, `serena-mcp.md`, `unity-scripting-style.md`, `unity-tools.md`, `discord-bot.md`. 대응 Skill 5개 신규(`commands/custom/`): `blender-workflow`, `meshy-workflow`, `notion-record`, `discord-admin`, `unity-dev` (unity-tools/unity-scripting-style/serena-mcp 3개 통합). `_skill-router.md` 전면 재작성 — 매핑 값을 "파일 경로 Read" → "Skill 호출"로 전환, Phase 2-A 완료 섹션 추가. `MANIFEST.md` 갱신 — custom/ 8개→2개(agent-ownership, multivault-personalization만 유지), rules-archive/ Phase 2-A 섹션에 6개 신규 엔트리. 잔존 custom 2개는 에이전트 협업/멀티볼트 개인화 규칙으로 배포 사용자도 해당 가능성 있어 유지. **bulk-edit-safe Skill은 보류** — 대상(encoding-safety, temp-file-management)이 core 안전 규칙이라 이동 시 세션 시작 단계 자기교정 실패 리스크. Phase 2-A 총 감축 예상 ~8k 토큰 (custom 12.7k 중 6개 이관). Korean/English 배포 모두 ⚠️: core/_skill-router.md가 배포되는데 6개 Skill은 custom/ 소속이라 배포 사용자 환경에선 Skill 미존재 → 배포본 분기 필요 (router 전체 행 또는 각 Skill 제작자 경로 제거). Phase 2-A 완료 = Skill 전환 원칙 검증. 다음: 신규 세션 실측 → 배포본 분기 버전 작성 → 온보딩/README 동시 반영 (프로젝트 메모리 참조) |
| R060 | 2026-04-18 | ✅ | – | **규칙 주입 구조 개편 Phase 2-A PoC — `/distribute` Skill 전환**. (1) `.claude/rules/custom/distribution-deploy.md`, `sync-version-priority.md` 2개 파일을 `.claude/rules-archive/`로 이동 (자동 주입 제외). (2) `.claude/commands/custom/distribute.md` 신규 — 다국어 배포 경로, 콘텐츠 기준 체크리스트, Git push 절차, sync 수정 시 Pre/Post-Check 통합 Skill. 트리거 키워드: 배포, SellingVault, git push, 영문 배포, distribute, deploy, cli.js sync, pre-sync 등. (3) `.claude/rules/core/_skill-router.md` 갱신 — 배포·Git push 행과 sync 기능 수정 행의 목적지를 `/distribute` Skill 호출로 전환, 하단에 Phase 2-A 진행 상태 섹션 추가. (4) `.claude/rules/MANIFEST.md` 갱신 — custom/에서 2개 제거, rules-archive/에 Phase 2-A 섹션 신설. **Korean 상태 ⚠️ 조정 필요**: core/_skill-router.md의 "배포·Git push" 및 "sync 기능 수정" 2개 행이 creator-only 경로(`/distribute` Skill + archive 파일)를 가리켜 배포 사용자 환경에서 깨진 링크가 됨. 배포 시 두 행을 제거한 슬림 버전으로 분기 관리 필요 (C안). custom 영역 변경분은 English/Korean 모두 배포 무관. Phase 2-A 목표 7개 Skill 중 첫 PoC, Unity/Blender/Meshy/Discord/Notion은 실측 후 진행 |
| R059 | 2026-04-18 | ✅ | ✅ | **규칙 주입 구조 개편 Phase 2-B 완료 — user-guidance.md D안 분할**. 원본(4.3k)을 리스크 등급별로 이층 분리: (1) `.claude/rules/core/user-guidance.md` 슬림화 — 고위험 6섹션(§2 볼트 생성 수동 복사, §4 편집 모드 혼동, §5 workspace 동기화 버전 누락, §8 편집 후 검증 BAD/INDEX, §10 무한 재귀 삭제, §11 스크립트 생성 사전 승인)만 인라인 즉시 차단용으로 유지. (2) `.claude/rules-archive/user-guidance-detail.md` 신규 — 원본 12개 섹션 전체 이관 (트리거 체계 유형 A/B/C 포함). (3) `.claude/rules/core/_skill-router.md` 확장 — "유저 질문/막힘" 행을 "유저 가이드 저위험" 행으로 변경, 트리거 키워드 확장 + 목적지를 `rules-archive/user-guidance-detail.md`로 전환. (4) `.claude/rules/MANIFEST.md` 갱신 — core/ user-guidance 설명 수정, rules-archive/에 Phase 2-B 섹션 신설. 단순 archive 이동(C안) 기각 사유: 유형 B 트리거는 감지 즉시 차단이 핵심이라 archive Read 지연 시 실수 발생 가능 |
| R058 | 2026-04-18 | ✅ | ✅ | **규칙 주입 구조 개편 Phase 1 완료**. `.claude/rules/core/_essentials.md` 신규 (보고 언어, 토큰 절약, 볼트 라우팅, 편집 모드, Post-Edit Review, 노트 작성 frontmatter/H1/파일명, 세션 종료 통합 — 8.6 KB). `.claude/rules/core/_skill-router.md` 신규 (12+ 트리거 키워드 → 규칙 파일 경로 매핑 — 3.8 KB). 흡수된 7개 파일 (`token-optimization`, `session-exit`, `note-writing`, `vault-routing`, `post-edit-review`, `edit-mode-separation`, `report-language`)을 `.claude/rules-archive/`로 이동. `.claude/rules/MANIFEST.md` 전면 재작성 (core 11개, custom 10개, archive 8개). 루트 `_STATUS.md` 볼트 레지스트리에 "경로" 컬럼 추가 (볼트 ID → 경로 lookup 일원화). 루트 `CLAUDE.md` 슬림화 12.6 KB → 6.6 KB (47% 감축) — 볼트 레지스트리 테이블 제거하고 `_STATUS.md` 참조로 전환, 키워드 추론은 "키워드 → 볼트 ID" 2컬럼 표로 간소화, 주입 구조 섹션 신설 |
| R054 | 2026-04-15 | – | – | 다국어 배포 구조 도입. `distribution-deploy.md` (custom)에 Korean/English 2경로 + 2레포 명시, GitHub Issues 트리아지 규칙 추가, 다국어 운영 섹션 신설. `_ROOT_VERSION.md` 스키마에 배포 반영 상태 컬럼(Korean/English) 추가. 원본 볼트 `Project_AIMindVaults`에 [[20260415_영문_배포판_번역_계획]] 신규, [[20260415_베타_포스팅_계획_Discord_NaverCafe]] 영문판 의존성 반영 |
| R055 | 2026-04-17 | – | – | Discord 도메인 볼트 신설 (`Vaults/Domains_Infra/Discord/`). AIMindVaults 디스코드 서버 운영 결정의 사전 정보수집 단계. 루트 `CLAUDE.md` 볼트 레지스트리·진입 프로토콜 키워드 추가, 루트 `_STATUS.md` 레지스트리 등록. 봇·채널·자동화·모더레이션 도메인 지식 축적 시작 |
| R056 | 2026-04-17 | – | – | AIMindVaults Admin Bot 운영용 custom 스킬/룰 추가 (제작자 전용, 배포 동기화 대상 아님). `.claude/commands/custom/discord-manage.md` 신규, `.claude/rules/custom/discord-bot.md` 신규. 두 MANIFEST custom 섹션에 등록 |
| R057 | 2026-04-18 | – | – | **규칙 주입 구조 개편 Phase 0 PoC**. `.claude/rules-archive/` 신설, `meshy-api.md`를 custom/에서 archive/로 이동하여 자동 주입 제외 여부 검증 준비. 루트 `CLAUDE.md`에 "아카이브된 규칙" 섹션 + 네임스페이스 구조에 rules-archive 추가. `.claude/rules/MANIFEST.md` custom에서 meshy-api 제거, "rules-archive/" 섹션 신설. `.claude/settings.local.json`에 `permissions.deny` 13개 (치명 삭제·force push·SellingVault 쓰기 차단) + `skipAutoPermissionPrompt: true` 추가. 계획 노트 `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260418_규칙_주입_구조_개편_계획.md` 신규 |

## 레거시 스키마 (2026-04-15 이전)

배포 반영 상태 컬럼 도입 전 기록. 필요 시 과거 반영 여부는 배포본 git 히스토리로 역추적한다.

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| R053 | 2026-04-13 | PS1 잔존 참조 전면 제거. Codex 스킬 3개, CODEX.md 28개, .codex/rules/ 84개, .codex/skills/session-end 27개, .github/copilot-instructions 28개, .antigravity/SESSION_RULES 28개, AGENT_ONBOARDING_CLAUDE/CODEX, .codex/rules/edit-scope, agent-ownership, Hub _WORKFLOW, Hub_Sync_Targets, TOOLS_INDEX 전면 개편 — 총 200+ 파일 Node.js CLI 참조로 전환 |
| R052 | 2026-04-13 | `docs/` 신설 (architecture, cli-reference, customization). core commands 6개 PS1→Node.js CLI 전환. AGENT_ONBOARDING.md PS1 참조 전환 + docs 연동. README.md docs 참조 추가 |
| R051 | 2026-04-13 | core/custom rules 8개 PS1→Node.js CLI 참조 전환. PS1 전체 제거. standards 커맨드 추가. Script_Registry 전면 개편 |
| R050 | 2026-04-13 | TestVault 삭제. GameDesign, Blender, Git, AI_Gen4Game 4개 볼트 루트 `CLAUDE.md` 레지스트리 + 라우팅 키워드 등록. `Domains_3D`, `Domains_VCS`, `Domains_AI_Asset` 카테고리 신설 |
| R049 | 2026-04-13 | frontmatter `tags` 표준화. 계층 태그 flatten, PascalCase→kebab-case 변환, 볼트 식별 태그 제거 (2차에 걸쳐 ~696파일). `note-writing.md` 태그 규칙 추가 — 기본 형식 + 사용자 오버라이드 구조. `AGENT_ONBOARDING.md` §8에 타입/태그 시스템 설명 섹션 추가 |
| R048 | 2026-04-13 | 빈 타입 86건 처리. `folder-index` 코어 타입 신설 (note-writing.md). Domain.md/Project.md 51건 folder-index, CombatToolKit Legacy 27건 design, Grok 로그 5건 reference, 개별 3건 (plan/knowledge/study-note) 부여 |
| R047 | 2026-04-13 | `master_index_build.ps1` Resolve-Path trailing backslash 버그 수정 (TrimEnd 추가). `/sync-all` 코어 스킬 신설 — 전체 위성 볼트 워크스페이스 일괄 동기화. MANIFEST 등록 |
| R046 | 2026-04-13 | frontmatter `type` 표준화. `note-writing.md`에 코어 타입 목록(21개) + 볼트 전용 타입 확장 규칙 추가. 동의어 통합 72개(standards→standard, knowledge-note/domain→knowledge, planning-note→plan, research-note→research), 1회성 타입 12개 흡수, 위성 볼트 EXAMPLE_JUGGL 노트 156개 제거. ObsidianDev·Unity CLAUDE.md에 전용 타입 선언 |
| R045 | 2026-04-13 | `Vaults/Domains_Dev/JavaScript/` 신규 볼트 생성. 루트 `CLAUDE.md`, `_STATUS.md`에 JavaScript 레지스트리와 라우팅 키워드 추가 |
| R044 | 2026-04-13 | `vault-individualization.md` CLAUDE.md 필수 항목에 수집 범위·경계 추가. `vault-routing.md` 라우팅 판단 시 후보 볼트 CLAUDE.md 수집 범위 참조 규칙 추가 |
| R043 | 2026-04-08 | `user-guidance.md` 코어 규칙 신설. 12개 코어 기능별 유저 혼란 상황 + 에이전트 안내 지침. MANIFEST 등록. `create-vault.md`, `open-vault.md`에 Obsidian 미등록 볼트 URI 금지 규칙 추가. `AGENT_ONBOARDING.md` §16에 볼트 등록 안내 추가 |
| R042 | 2026-04-08 | `temp-file-management.md`에 "무한 재귀 경로 삭제 (Incident Rule)" 섹션 추가. PowerShell flatten-and-delete 1순위, robocopy mirror 2순위. 실패하는 방법(7z, Remove-Item, rd, .NET Delete) 명시 |
| R041 | 2026-04-08 | `Vaults/Domain_Art/ArtInsight/` 신규 볼트 생성. 루트 `AGENTS.md`, `CLAUDE.md`, `_STATUS.md`에 ArtInsight 레지스트리와 라우팅 키워드 추가, ArtInsight 개별 진입 문서/상태 문서/콘텐츠 규칙 개별화, 첫 노트 `20260408_미적_안목을_기르는_분별의_기준.md` 작성 |
| R040 | 2026-04-08 | 콘텐츠 인덱서 우선 검색 강제 규칙 추가. `token-optimization.md` §0 신설 (인덱서 → fallback 순서), `vault-routing.md`에 첫 접근 시 인덱스 빌드 강제, `vault-individualization.md`에 생성 후 초기 빌드 단계 추가 |
| R039 | 2026-04-08 | 볼트명 변경 CodeStyle → AI_Coding. 루트 CLAUDE.md 레지스트리/라우팅, 루트 _STATUS.md 레지스트리 갱신. 볼트 내부 태그 전체 AI_Coding으로 교체 |
| R038 | 2026-04-08 | 콘텐츠 인덱싱 완료 강제 보강. AIHub `.sync/_tools/cli/post_note_edit_review.ps1`가 인덱서를 별도 PowerShell 프로세스로 실행해 성공 판정을 안정화하고, root `.codex/skills/create-video-note`, `create-article-note`, `create-pdf-note`에 `POST_EDIT_INDEX_UPDATED=1` 확인과 수동 fallback 절차를 명시 |
| R037 | 2026-04-08 | 콘텐츠 인덱싱 규칙 강화. `post-edit-review.md`에 노트 추가/편집 후 인덱싱 필수 조건(`POST_EDIT_INDEX_UPDATED=1`) 추가, `/reindex` 스킬 경로를 `.sync/_tools/cli/` 구조에 맞게 갱신 |
| R036 | 2026-04-08 | Codex 전용 소스 노트 파이프라인 추가. root `.codex/skills/create-article-note/`, `.codex/skills/create-pdf-note/` 신규 생성, `.codex/skills/create-video-note/`를 동일 기준으로 확장 |
| R035 | 2026-04-06 | `/open-notes` 스킬 custom/ → core/ 격상. 활성 볼트 판별·경로 변환·파일 존재 확인 3단계 안전장치 추가. MANIFEST 등록 |
| R034 | 2026-04-06 | `AGENT_ONBOARDING.md` 신규 — 에이전트 범용 온보딩 문서. 환경 개요, 핵심 규약 14개 압축, 규칙 파일 경로 참조 |
| R033 | 2026-04-06 | `distribution-sync.md` Juggl_StyleGuide 배포 제거, `juggl-style-sync.md` 볼트별 개별 관리로 변경. 전체 볼트 `docs/` → `.docs/` 리네임, `recent_files.txt` 삭제, `Juggl_StyleGuide/` 볼트별 `Contents/`로 이동 |
| R032 | 2026-04-05 | `/reindex` 스킬 신설 (`.claude/commands/core/reindex.md`) — 단일/전체 볼트 콘텐츠 인덱스 재빌드. MANIFEST 등록 |
| R031 | 2026-04-05 | `/open-notes` 스킬 신설 (`.claude/commands/custom/open-notes.md`) — local-rest-api로 복수 노트 새 탭 열기. 글로벌 CLAUDE.md 스킬 목록에 등록 |
| R030 | 2026-04-02 | `session-exit.md` — 볼트별 핸드오프 작성 시 루트 핸드오프에 참조 남기기 규칙 추가 |
| R029 | 2026-04-01 | 세션 핸드오프 에이전트별 분리. `_SESSION_HANDOFF.md` → `_SESSION_HANDOFF_CLAUDE.md` + `_SESSION_HANDOFF_CODEX.md`. `session-exit.md` 규칙 갱신, `CLAUDE.md` 진입 프로토콜 갱신 |
| R028 | 2026-04-01 | JissouGame 신규 볼트 생성. `Projects_Game` 카테고리 신설, 루트 `AGENTS.md`, `CLAUDE.md`, `_STATUS.md`, `.claude/rules/core/vault-individualization.md` 갱신 |
| R027 | 2026-04-01 | TileMapToolKit 신규 볼트 생성. 루트 `AGENTS.md`, `CLAUDE.md`, `_STATUS.md`에 레지스트리/라우팅 추가 |
| R026 | 2026-04-01 | `note-writing.md` — frontmatter `agent` 필드 규칙 명시: 최신 작업자만이 아니라 해당 노트에 작업한 에이전트를 누적 기록 |
| R025 | 2026-03-23 | 볼트 개별화 규칙 신설 (`.claude/rules/core/vault-individualization.md`) — 볼트 생성 시 이름/분류/CLAUDE.md/태그 표준화 |
| R024 | 2026-03-23 | 멀티볼트 개인화 규칙 신설 (`.claude/rules/custom/multivault-personalization.md`) — 에이전트/플러그인/스킬 커스텀 설정 |
| R023 | 2026-03-21 | Personal 카테고리 신설 + `Vaults/Personal/Diary/` 다이어리 볼트 생성. 루트 CLAUDE.md, _STATUS.md에 등록. 라우팅 키워드 추가 |
| R022 | 2026-03-21 | 세션 핸드오프 시스템 도입. 루트 `_SESSION_HANDOFF.md` 신규, `session-exit.md` 핸드오프 작성 규칙 추가, 루트 `CLAUDE.md` 진입 프로토콜에 핸드오프 읽기 추가 |
| R021 | 2026-03-21 | 신규 볼트 2개 생성: `Vaults/Domains_Infra/AI` (AI 도메인), `Vaults/Projects_Infra/Project_AIMindVaults` (프로젝트) — AIHubVault 콘텐츠 분리 준비 |
| R020 | 2026-03-21 | `note-writing.md` 위키링크 필수 규칙 추가 — 새 노트 생성 시 같은 볼트 내 관련 노트 위키링크 1개 이상 강제 |
| R019 | 2026-03-21 | `note-writing.md` H1 제목 규칙 추가 — URI 예약문자·이모지 금지 (강제). 파일명에도 이모지 금지 추가 |
| R018 | 2026-03-21 | `Vaults/Domains_Infra/Search/` 신규 볼트 생성. 검색 엔진·인덱싱·텍스트 매칭 도메인 지식 허브. 루트 CLAUDE.md, _STATUS.md에 등록 |
| R017 | 2026-03-21 | `Vaults/Domains_Infra/CICD/` 신규 볼트 생성. CI/CD 및 배포 동기화 도메인 지식 허브. 루트 CLAUDE.md, _STATUS.md에 등록 |
| R016 | 2026-03-21 | Codex 데스크탑 앱 전환. 루트+11볼트 `AGENTS.md` 신규 생성(2단계 라우팅+실행 구조). playbooks → `.codex/skills/` SKILL.md 형식 변환. `.antigravity/workflows/` → `.codex/skills/`로 이관. `agent-ownership.md` 충돌 방지 규칙 신규. 기존 CODEX.md, .antigravity에 deprecated 표시 |
| R015 | 2026-03-19 | `.claude/rules/vault-routing.md` 신규: 볼트 라우팅 강제 규칙. BasicContentsVault 직접 작업 금지, 콘텐츠 배치 전 볼트 레지스트리 확인 필수 |
| R014 | 2026-03-19 | 에이전트 규칙 정본 참조 방식 전환. Cursor/Codex/Antigravity 복제 규칙 8개 삭제 → `.claude/rules/` 정본 참조 + 에이전트 고유 `agent-rules` 파일로 대체. AIHubVault 내부 Codex/Antigravity 진입점에도 정본 참조 추가 |
| R013 | 2026-03-19 | 루트 `_STATUS.md` 경량 레지스트리 구조로 재설계 (Now/Next/Blocked 제거 → 볼트 타입+콘텐츠+작업 에이전트 날짜). `session-exit.md` 루트 갱신 규칙 개정. 전체 11개 볼트 등록 |
| R012 | 2026-03-18 | `Vaults/Lab_Infra/ObsidianDev/` 신규 볼트 생성. Lab 카테고리 신설 (Domain+Project 복합). 루트 CLAUDE.md Labs 섹션 추가 |
| R011 | 2026-03-18 | `.claude/commands/auto-organize.md` 신규: 노트/볼트 생성 시 폴더 자동 분류 스킬. AI 제안 → 사용자 승인 방식 |
| R010 | 2026-03-18 | `Vaults/Domains_Infra/Notion/` 신규 볼트 생성. 루트 CLAUDE.md 레지스트리 + _STATUS.md 섹션 추가 |
| R009 | 2026-03-18 | `.claude/commands/create-vault.md` 신규: 볼트 생성 스킬. BasicContentsVault 기반 복제 + 후속 작업 프로세스 정의 |
| R008 | 2026-03-18 | `note-writing.md` — 비유적/은유적 표현 금지 규칙 추가. 작업명·제목은 내용을 직접 서술 |
| R007 | 2026-03-17 | `juggl-style-sync.md` — Juggl `local:` 값은 파일명 사용 규칙 명시 (H1 제목 아님) |
| R006 | 2026-03-17 | `note-writing.md` — 마크다운 볼드+괄호 렌더링 규칙 추가. `**텍스트(괄호)**` 패턴 금지 |
| R005 | 2026-03-17 | `README.md` 신규: 멀티볼트 시스템 소개, AI 규칙 체계, 빠른 시작 가이드 (git 배포 진입점) |
| R004 | 2026-03-17 | `.claude/rules/token-optimization.md` 신규: 토큰 절약 및 실행 위임 강제 규칙 |
| R003 | 2026-03-17 | `edit-mode-separation.md`에 루트 레벨 편집 시 `_ROOT_VERSION.md` 기록 강제 규칙 추가 |
| R002 | 2026-03-17 | `.claude/rules/` 신규 3개: temp-file-management, distribution-sync, script-creation-approval |
| R001 | 2026-03-17 | `.antigravity/workflows/` 신규 2개: create-video-note, sync-distribution |

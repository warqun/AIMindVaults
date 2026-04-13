---
type: version-log
tags:
  - AIMindVault
  - root
updated: 2026-04-08
---

# Root Version Log

멀티볼트 루트 레벨 변경 이력. `.claude/`, `.antigravity/`, 루트 설정 파일 등의 변경을 추적한다.

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
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

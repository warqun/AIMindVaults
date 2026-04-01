---
type: version-log
tags:
  - AIMindVault
  - root
updated: 2026-04-01
---

# Root Version Log

멀티볼트 루트 레벨 변경 이력. `.claude/`, `.antigravity/`, 루트 설정 파일 등의 변경을 추적한다.

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
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

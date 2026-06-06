---
type: workspace-version
tags:
  - AIHubVault_Minimal
  - PresetHub
  - Multi-Hub
updated: 2026-05-31
---

# CoreHub Workspace Version

> Core 계층 버전 번호. 형식: `YYYYMMDDNNNN`.
> Preset Hub 들의 `_WORKSPACE_VERSION.md` 와 독립 관리됨.
> Core 계층 편집 후 `bump-version --broadcast` 로 자동 기록 + core-sync-all 연쇄.

| 버전 | 변경 내용 |
| ---- | -------- |
| 202605310001 | Core 전파 수신 (CoreHub 202605310001) — R156 translate-to-en.js 등록 (viz 한국어→영문 자동 변환 스크립트) |
| 202605270002 | Core 전파 수신 (CoreHub 202605270003) — R140 — Script_Registry 등록 (Viz-Snapshot.ps1 디바이스 간 점검 공유 자동화) |
| 202605270001 | Core 전파 수신 (CoreHub 202605270002) — R139 — core-sync-all 이 Preset Hub _WORKSPACE_VERSION bump (위성 sync version skip 버그 fix). R138 위성 미전파 잔여 해소. |
| 202605140001 | R119 propagation: post-edit-review fm 검증 + note-types.yaml |
| 202604240003 | CoreHub sync 런처 .sync 이동 수신 |
| 202604240002 | CoreHub sync-all npm 경고 수정 수신 |
| 202604240001 | CoreHub 수동 sync 런처 전파 수신 |
| 202604210001 | sync-workspace mergeCommunityPlugins: Hub 플러그인 폴더 존재만으로 자동 활성화 (folder-set union) — CoreHub 배포본 수신 |
| 202604200005 | Minimal CLAUDE.md 축약형 의도 가이드 (5개). 개인화 · 위성 바인딩 · rebase · Core 이동 명시 |
| 202604200004 | pre-sync.js 개선 — cli.js 해시만 비교하던 것에서 _WORKSPACE_VERSION.md 버전 비교 추가 (primary). Hub version > local version 시 무조건 Hub cli.js 로 re-exec → Hub config.js 사용 → config/lib 변경이 있어도 놓치지 않음. cli.js 해시는 fallback (dev/수동 편집용). 이로써 SYNC_EXCLUDE_FILES race condition 근본 해결 |
| 202604200003 | SYNC_EXCLUDE_FILES 에 hub-marker.json, hub-source.json, .core-sync-warning.json 추가 — Hub 정체성 파일이 위성 sync 로 잘못 복제되는 버그 수정. Project_AIMindVaults 위성 검증 시 AIHubVault 의 hub-marker.json 이 복제되어 위성이 자기를 Hub 로 오판한 문제 해결 |
| 202604200002 | CoreHub 의 cli-node·schemas bootstrap 완료 — AIHubVault 최신 (Step 1-8) 을 CoreHub 로 이관. CORE_PATHS 에서 .claude/rules/core, .claude/commands/core 제거 (루트 레벨 유지). CORE_PLUGINS 6개로 확장 (local-rest-api, advanced-uri, shellcommands, dataview, templater, linter). Custom 계층은 AIHubVault Preset 에서 관리. core-sync-all dry-run 검증: AIHubVault 를 default preset 으로 인식, CORE_PATHS 3개 정확, Custom 보호 |
| 202604200001 | CoreHub 초기화 — AIHubVault 클론 후 Custom 계층 제거. Core 6 플러그인 유지 (local-rest-api, advanced-uri, shellcommands, dataview, templater, linter). hub-marker.json (hubType=core, hubId=core) 작성. .sync/_tools, .sync/_Standards/Core, .sync/schemas 유지 |

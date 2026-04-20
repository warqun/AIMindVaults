---
type: workspace-version
tags:
  - CoreHub
  - Multi-Hub
updated: 2026-04-20
---

# CoreHub Workspace Version

> Core 계층 버전 번호. 형식: `YYYYMMDDNNNN`.
> Preset Hub 들의 `_WORKSPACE_VERSION.md` 와 독립 관리됨.
> Core 계층 편집 후 `bump-version --broadcast` 로 자동 기록 + core-sync-all 연쇄.

| 버전 | 변경 내용 |
| ---- | -------- |
| 202604200010 | Phase 2 Step 3 — Custom 보호 실증 완료 (Minimal 에 test-custom-plugin 추가 후 core-sync-all → 보존 확인). Phase 2 Step 1~3 완료 (_CORE_VERSION.md + rebase + Custom 보호). 남은 것: Step 4 배포 (사용자 승인 영역) |
| 202604200009 | Phase 2 Step 2 — aimv rebase 명령 구현 (D3 V2). 위성 볼트의 Hub 바인딩 변경: hub-source.json backup → 재작성 → 신 Hub 기준 fresh sync (Add + Prune). --dry-run 필수 선행 · Contents/ 보호 · Hub 볼트는 rebase 거부. REBASE_RESULT=OK/NOOP/DRY_RUN 환경변수 출력 |
| 202604200008 | Phase 2 Step 1 — _CORE_VERSION.md 신설 + core-sync-all 자동 append 로직 추가. 전파 이력 (버전/대상/결과/아이템수/실패수) 자동 기록. sync 판단에는 사용 안 함 (추적/감사 전용) |
| 202604200007 | create-hub.js — Step 4 추가: 생성한 Preset Hub 에 CLAUDE.md · _STATUS.md · README.md 를 Preset 전용으로 자동 재작성. 기존엔 Core Hub 복제본이 그대로 남아 잘못된 Core Hub 설명 유지됨. AIHubVault_Minimal 생성 시 발견된 결함 근본 수정. 단계를 4 → 5 로 확장 |
| 202604200006 | SYNC_EXCLUDE_DIRS 에서 node_modules 제거 — 위성이 자기 cli.js 를 실행할 때 commander/argparse/gray-matter 등 dep 가 필요함. 기존에 node_modules 가 없어 Obsidian Shell Commands 의 pre-sync 호출이 ERR_MODULE_NOT_FOUND 로 실패하던 문제 해결. node_modules 1.4MB 순수 JS 라 크로스플랫폼 안전 |
| 202604200005 | hub-resolver.js findAIMindVaultsRoot() 강화 — 'Vaults/' 만 체크하던 것을 'Vaults/BasicVaults/' 조합으로 변경. 개별 위성 볼트 내부에 Vaults/ 서브폴더가 있는 경우(예: Funding 볼트의 콘텐츠 조직용 Vaults/) findAIMindVaultsRoot 가 해당 볼트를 AIMindVaults 루트로 오판하여 scanHubs 가 빈 결과를 반환하던 버그 수정. Funding 볼트 sync 실패 사례로 발견 |
| 202604200004 | pre-sync.js 개선 — cli.js 해시만 비교하던 것에서 _WORKSPACE_VERSION.md 버전 비교 추가 (primary). Hub version > local version 시 무조건 Hub cli.js 로 re-exec → Hub config.js 사용 → config/lib 변경이 있어도 놓치지 않음. cli.js 해시는 fallback (dev/수동 편집용). 이로써 SYNC_EXCLUDE_FILES race condition 근본 해결 |
| 202604200003 | SYNC_EXCLUDE_FILES 에 hub-marker.json, hub-source.json, .core-sync-warning.json 추가 — Hub 정체성 파일이 위성 sync 로 잘못 복제되는 버그 수정. Project_AIMindVaults 위성 검증 시 AIHubVault 의 hub-marker.json 이 복제되어 위성이 자기를 Hub 로 오판한 문제 해결 |
| 202604200002 | CoreHub 의 cli-node·schemas bootstrap 완료 — AIHubVault 최신 (Step 1-8) 을 CoreHub 로 이관. CORE_PATHS 에서 .claude/rules/core, .claude/commands/core 제거 (루트 레벨 유지). CORE_PLUGINS 6개로 확장 (local-rest-api, advanced-uri, shellcommands, dataview, templater, linter). Custom 계층은 AIHubVault Preset 에서 관리. core-sync-all dry-run 검증: AIHubVault 를 default preset 으로 인식, CORE_PATHS 3개 정확, Custom 보호 |
| 202604200001 | CoreHub 초기화 — AIHubVault 클론 후 Custom 계층 제거. Core 6 플러그인 유지 (local-rest-api, advanced-uri, shellcommands, dataview, templater, linter). hub-marker.json (hubType=core, hubId=core) 작성. .sync/_tools, .sync/_Standards/Core, .sync/schemas 유지 |

---
type: workspace-version
tags:
  - AIMindVault
  - TileMapToolKit
  - Meta
updated: 2026-04-20
---

# Workspace Version

> 동기화 판정용 버전 번호. 형식: `YYYYMMDDNNNN` (날짜 + 당일 순번).
> 이 파일의 최상단 버전과 AIHubVault의 최상단 버전을 비교하여 동기화 여부를 판정합니다.
> 개발 히스토리: AIHubVault `_WORKSPACE_CHANGELOG.md` 참조 (Hub 전용, 배포 비대상).

| 버전           | 변경 내용 |
| ------------ | ----- |
| 202604200012 | Phase 3 수신 (install-hub, coreHubVersion schema, version-range lib, hub-sharing 가이드) |
| 202604200011 | Custom 플러그인 잔여 디렉토리 제거 (claudian, obsidian-time-machine). community-plugins.json 에서는 이미 제거됐으나 .obsidian/plugins/ 디렉토리가 잔존해 deploy 시 배포본에 재등장하던 문제 해결 |
| 202604200010 | Phase 2 Step 2 (aimv rebase) + Step 1 (_CORE_VERSION.md) CoreHub 에서 수신 |
| 202604200009 | create-hub.js Preset 전용 메타 자동 재작성 수정 수신 |
| 202604200008 | node_modules sync 포함 수정 수신. 27 위성에 다음 sync 시 node_modules 전파 → 각 위성에서 자체 pre-sync 실행 가능 (Obsidian Shell Commands) |
| 202604200007 | hub-resolver.js Vaults/BasicVaults 앵커 강화 수정 수신. 27 위성은 다음 sync 에서 새 config/resolver 받음 |
| 202604200006 | CLAUDE.md 에 Preset Hub 역할 명시 (hubId=default, hubType=preset, coreHub=../CoreHub). Multi-Hub 계층 표 + Core 편집 금지 섹션 + Custom 계층 편집 가능 범위 추가. 타이틀 '── AI 작업환경 설계·개선·배포 허브' → '── Default Preset Hub (Multi-Hub 아키텍처)' 변경 |
| 202604200005 | pre-sync.js 개선 (_WORKSPACE_VERSION 비교 추가) 를 CoreHub 에서 수신. 다음 위성 sync 부터 config/lib 변경도 감지 → Hub cli.js re-exec 로 최신 exclude 규칙 적용 |
| 202604200004 | config.js (SYNC_EXCLUDE_FILES 확장) 를 CoreHub 에서 수신. hub-marker.json 등 Hub 정체성 파일이 위성으로 잘못 복제되는 버그 수정 반영. 27 위성은 다음 sync 에서 새 config.js 받음 (일회적 cleanup 필요) |
| 202604200003 | AIHubVault → Preset Hub 승격 (hubId=default, coreHub=../CoreHub). hub-marker.json 작성 (hubType=preset). .hub_marker 빈 파일 유지 (하위호환). 27개 위성 볼트는 legacy scan 으로 계속 이 Preset 에 바인딩. Core 계층은 이제 CoreHub 에서 core-sync-all 로 수신. Custom 계층 (Juggl, make-md, obsidian-git, mcp-tools, quickadd, metadata-menu, global-search-and-replace, obsidian42-brat, tasks-plugin, mermaid-tools, ytranscript 등) 은 이 Preset 에서 관리 |
| 202604200002 | Multi-Hub Phase 1 Step 2-8 — lib/config.js(CORE_PATHS,CUSTOM_PATHS,CORE_PLUGINS) + schemas/hub-marker,hub-source JSON Schema + create-hub.js(Preset Hub 생성) + core-sync-all.js(Core→Preset Push) + bump-version.js(버전+--broadcast) + clone-vault.js(--hub 옵션 · hub-source.json 자동작성) + bin/cli.js 신규 3개 명령 등록(create-hub, core-sync-all, bump-version). CORE_PLUGINS/CORE_FORCE_DATA_JSON sync-workspace.js에서 config.js로 이동. 회귀 테스트 통과(Hub self, satellite sync, core-sync-all NO_TARGETS, bump-version, create-hub dry-run 856 files). |
| 202604200001 | Multi-Hub Phase 1 Step 1 — `lib/hub-resolver.js` 신설. Hub 탐색 로직을 sync-workspace.js + pre-sync.js에서 중앙화. `hub-source.json` 지원 추가 (위성 → Hub 명시적 지명). `.hub_marker` 스캔은 레거시 폴백으로 유지 (하위호환 보증). `isHub()`, `resolveHub()`, `scanHubs()`, `findHubsByType()`, `readHubMarker()`, `readHubSource()`, `getHubCliNode()` API 제공. 기존 28 satellite 동작 영향 없음 (회귀 테스트 통과: Hub self-check, satellite sync dry-run, `hub-source.json` 지명) |
| 202604190003 | sync-workspace.js 플러그인 prune 로직 추가 — Hub를 정본으로 간주. satellite의 `.obsidian/plugins/` 중 Hub에 없는 것은 제거 (CORE_PLUGINS 예외). `community-plugins.json`도 CORE ∪ Hub ids 로 재조정하고 target-unique 항목 drop. `removedCount`, `[PRUNE]`/`[DROP]` 로그 추가. Hub-Sync가 사실상 Add-only로 동작하던 결함 해결 |
| 202604190002 | 플러그인 Core/Custom 분리 · 실사용 기반 배포 번들 축소 — Core 6 (local-rest-api, advanced-uri, shellcommands, dataview, templater, linter) + Custom A 11 (juggl, mermaid-tools, make-md, obsidian-git, ytranscript, mcp-tools, quickadd, metadata-menu, global-search-and-replace, obsidian42-brat, tasks-plugin) 유지. 실사용 흔적 0~미미한 10개 제거: obsidian-excalidraw-plugin, advanced-canvas, obsidian-meta-bind-plugin, new-3d-graph, colored-tags, mermaid-themes, obsidian-tagfolder, obsidian-time-machine, share-to-notionnext, table-editor-obsidian. `PLUGIN_META_BIND.md` 동반 삭제. `community-plugins.json` 갱신 |
| 202604190001 | Claudian 플러그인 제거 — `.obsidian/plugins/claudian/` 디렉토리 삭제, `.obsidian/community-plugins.json`에서 `"claudian"` 항목 제거, `.sync/_Standards/Core/Plugins/PLUGIN_CLAUDIAN.md` 삭제. 사용자 사용 빈도 저조로 배포본 기본 번들에서 제외 |
| 202604180001 | `.forge/` 디렉토리 전면 제거 (R063). AIHubVault 내부 문서 `.forge`/`_forge` 참조 정리 — CLAUDE.md, AGENTS.md, CODEX.md, .codex/CODEX.md, .codex/rules/never-do.md, .antigravity/SESSION_RULES.md, .github/copilot-instructions.md, CORE_CONCEPTS.md, README.md, _Standards/CONTENTS_SPEC.md, Contents/CONTENTS_GLOSSARY.md, Contents/CONTENTS_AI_RULES.md, _STATUS.md. `.sync/_WORKFLOW.md`에서도 `.forge/` 나열 제거. 루트 `_tools/cli/pre_sync.ps1`, `sync_workspace.ps1`의 Hub 마커를 `_forge/` → `.sync/.hub_marker`로 변경 |
| 202604150001 | deploy 커맨드 추가 (크로스플랫폼 배포 동기화). config.js에 DEPLOY_TARGETS/PROTECTED_FILES 상수 추가 |
| 202604130013 | PS1 전체 제거 + 규칙 Node.js CLI 전환. standards 커맨드 추가. Script_Registry Node.js 기준 전면 개편 |
| 202604130012 | Shell Commands: pre_sync.ps1 → node cli.js pre-sync 전환. 크로스플랫폼 CLI 완전 전환 |
| 202604130011 | cli-node Phase 6: 보조 도구 4개 포팅 (trash-clean, open-vault, obsidian-bridge, task-router). 전체 마이그레이션 완료 |
| 202604130010 | cli-node Phase 5: clone-vault, hub-broadcast 포팅. aimv clone/broadcast 커맨드 등록 |
| 202604130009 | cli-node Phase 4: sync 엔진 포팅 (sync-workspace, pre-sync). fs-mirror에 noPrune 옵션 추가. aimv sync/pre-sync 커맨드 등록 |
| 202604130008 | cli-node Phase 3: post-edit-review 포팅 (UTF-8 검증 + 자동 인덱서 호출). aimv review 커맨드 등록 |
| 202604130007 | cli-node Phase 2: 인덱서 4개 커맨드 포팅 (index-build, index-search, master-index-build, master-index-search). bin/cli.js에 index 서브커맨드 등록 |
| 202604130006 | cli-node Phase 0+1: Node.js CLI 스캐폴딩 + lib 유틸리티 (vault-path, config, fs-mirror, frontmatter, logger). commander + gray-matter 의존성 |
| 202604130005 | nul 쓰레기 파일 Hub + 전체 위성 볼트에서 삭제 |
| 202604130004 | master_index_build.ps1 Resolve-Path trailing backslash 버그 수정 (TrimEnd 추가). vault_index_build.ps1 excludeFiles에 README.md 추가 (이전 세션 미기록분) |
| 202604130003 | master_index_build.ps1, master_index_search.ps1 신규. 22볼트 974노트 크로스볼트 검색 지원. vault_index_build.ps1에 부분 갱신 자동 호출 추가 |
| 202604130002 | 인덱서 출력 경로를 .sync\_tools\data\ → .vault_data\로 이전. 볼트별 산출물을 동기화 폴더 밖으로 분리하여 Hub 오염 근본 해결. vault_index_build/search/post_note_edit_review 3개 스크립트 경로 변경. sync_workspace.ps1의 ExcludeDirs 임시 조치 제거 |
| 202604130001 | sync_workspace.ps1에 ExcludeDirs 파라미터 추가. _tools\data\ 폴더를 Hub 동기화 제외 대상으로 설정하여 위성 볼트의 vault_index.json 오염 방지 (→ 202604130002에서 근본 해결로 대체) |
| 202604090003 | pre_sync.ps1 Hub 탐지 마커를 _forge → .sync/.hub_marker로 수정. Hub에서 Obsidian 열 때 자기참조 예외가 동작하지 않던 버그 수정 |
| 202604090002 | vault_trash_clean.ps1 신규 추가 — 볼트 .trash/ 일괄 정리 CLI (단일/복수/전체, DryRun). Script_Registry 등록 |
| 202604090001 | obsidian_ai_bridge.ps1, open_vault.ps1 경로 하드코딩(..\..\) → candidate 자동탐지 시스템 적용. open_vault의 pre_sync.ps1 참조도 .sync/ 기준 candidate로 수정. 기존 수정 완료 스크립트 3개에 candidate 로직 설명 코멘트 추가 |
| 202604080003 | Shell Commands 플러그인에 sync_workspace.ps1 자동 실행 등록 (Obsidian 시작 이벤트). coreForceDataJson에 obsidian-shellcommands 추가하여 설정 강제 전파 |
| 202604080002 | 콘텐츠 인덱싱 완료 판정 보강 — `.sync/_tools/cli/post_note_edit_review.ps1`가 `vault_index_build.ps1`를 별도 PowerShell 프로세스로 실행해 종료 코드를 안정적으로 판정하고, Codex 노트 스킬 3종에 `POST_EDIT_INDEX_UPDATED=1` 확인을 완료 조건으로 명시 |
| 202604080001 | 콘텐츠 인덱서 경로 자동탐지 수정 — `.sync/_tools/cli/` 기준으로 post_note_edit_review, vault_index_build/search 연결 복구. 노트 추가/편집 후 인덱싱 필수 규칙 반영 |
| 202604060003 | _WORKSPACE_VERSION.md를 .sync/ 내부에서 볼트 루트로 복원 (Obsidian 노출 필요), sync 경로 참조 갱신 |
| 202604060002 | Hub 식별 마커 _forge → .sync/.hub_marker 변경, _forge → .forge 리네임 (전체 볼트), 참조 경로 갱신 |
| 202604060001 | .sync/ 폴더구조 재편 — sync_workspace.ps1 폴더 미러링 리팩토링, pre_sync.ps1 경로 갱신, 배치 배열 제거, dot-prefix 자동 숨김 |
| 202604050001 | post_note_edit_review.ps1에 인덱서 증분 빌드 자동 호출 추가 (기능 A) |
| 202604010001 | TileMapToolKit 볼트 초기 개별화 — 진입점/상태/인덱스/태그 규칙 정렬, `Contents/` 구조 초기화 |
| 202603230004 | Core 플러그인 data.json 선택적 강제 — Linter만 강제, local-rest-api는 민감 데이터(API키/인증서) 포함으로 보존 |
| 202603230003 | sync_workspace.ps1 플러그인 Core/Custom 분리 — Core 4개(local-rest-api, dataview, templater, linter) 강제 동기화, 나머지 Custom |
| 202603230002 | sync_workspace.ps1 배치 Core/Custom 분리 — Juggl_StyleGuide를 Custom으로 이동, _VAULT-INDEX.md 동기화 제거 |
| 202603230001 | Linter 플러그인 활성화 — frontmatter 키 정렬, updated 자동 갱신, 저장 시 자동 lint |
| 202603210015 | sync_workspace.ps1 Invoke-ObsidianReload 쿨다운 추가 — 리로드 무한 루프 방지 (60초) |
| 202603210014 | vault_index_build.ps1, vault_index_search.ps1 신규 — 볼트 콘텐츠 인덱서 + 검색 엔진 |
| 202603210013 | pre_sync 트램펄린 패턴, Obsidian 자동 리로드, community-plugins.json 머지 |

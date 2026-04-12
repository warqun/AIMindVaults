---
type: workspace-version
tags:
  - AIMindVault
  - TileMapToolKit
  - Meta
updated: 2026-04-13
---

# Workspace Version

> 동기화 판정용 버전 번호. 형식: `YYYYMMDDNNNN` (날짜 + 당일 순번).
> 이 파일의 최상단 버전과 AIHubVault의 최상단 버전을 비교하여 동기화 여부를 판정합니다.
> 개발 히스토리: AIHubVault `_WORKSPACE_CHANGELOG.md` 참조 (Hub 전용, 배포 비대상).

| 버전           | 변경 내용 |
| ------------ | ----- |
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

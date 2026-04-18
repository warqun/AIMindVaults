---
type: standards
tags:
  - TileMapToolKit
  - Standards
  - AIMindVault
  - script-management
updated: 2026-04-13
agent: claude
---

# Script Registry — 스크립트 레지스트리

> 볼트 내 모든 스크립트의 용도·소유자·상태를 관리하는 인벤토리.
> 에이전트가 스크립트를 생성/삭제/수정할 때 이 문서를 함께 갱신해야 한다.

---

## 활성 스크립트 (Active) — Node.js CLI

2026-04-13 PS1 → Node.js 전면 전환 완료. 모든 CLI 도구는 `.sync/_tools/cli-node/` 하위에 위치.

| 커맨드 | 파일 | 용도 | 생성자 |
|--------|------|------|--------|
| `aimv index build` | `src/commands/index-build.js` | 볼트 콘텐츠 인덱서 — Contents/ 크롤링 → JSON 인덱스 생성 | claude |
| `aimv index search` | `src/commands/index-search.js` | 볼트 콘텐츠 검색 — JSON 인덱스 기반 키워드/태그/타입 검색 | claude |
| `aimv index master-build` | `src/commands/master-index-build.js` | 크로스볼트 마스터 인덱스 빌드 | claude |
| `aimv index master-search` | `src/commands/master-index-search.js` | 크로스볼트 마스터 인덱스 검색 | claude |
| `aimv review` | `src/commands/post-edit-review.js` | 노트 편집 후 UTF-8·frontmatter 검증 + 자동 인덱싱 | claude |
| `aimv sync` | `src/commands/sync-workspace.js` | 볼트 간 작업환경 동기화 (Hub-Sync) | claude |
| `aimv pre-sync` | `src/commands/pre-sync.js` | 트램펄린: cli-node 자동 최신화 + sync 실행 | claude |
| `aimv clone` | `src/commands/clone-vault.js` | 볼트 클론 (BasicContentsVault 기반) | claude |
| `aimv broadcast` | `src/commands/hub-broadcast.js` | Hub .sync/ 파일을 전체 위성 볼트에 전파 | claude |
| `aimv trash-clean` | `src/commands/trash-clean.js` | 볼트 .trash/ 일괄 정리 | claude |
| `aimv open` | `src/commands/open-vault.js` | pre-sync 후 Obsidian 볼트 열기 | claude |
| `aimv bridge` | `src/commands/obsidian-bridge.js` | Obsidian CLI 래퍼 (조회/검색/히스토리/post-review) | claude |
| `aimv route` | `src/commands/task-router.js` | 작업 설명 → 에이전트 라우팅 추천 | claude |
| `aimv standards` | `src/commands/check-standards.js` | `_Standards/` 디렉토리 구조 확인 | claude |

### 공유 라이브러리

| 파일 | 용도 |
|------|------|
| `src/lib/vault-path.js` | 볼트/AIMindVaults 루트 자동탐지 |
| `src/lib/frontmatter.js` | YAML frontmatter 파서 |
| `src/lib/fs-mirror.js` | 디렉토리 미러링 (sync 엔진) |
| `src/lib/config.js` | 설정 상수 |
| `src/lib/logger.js` | 로그 출력 |

---

## 일회성/완료 스크립트 (One-time)

특정 마이그레이션이나 수정을 위해 만들어졌고, 재사용하지 않는 스크립트.

과거 외부 에이전트 스테이징에 있던 일회성 스크립트 2건은 스테이징 허브 개념 폐기와 함께 제거됨 (2026-04-18, R063).

---

## 삭제된 스크립트 (Deleted)

| 스크립트 | 삭제일 | 사유 |
|---------|--------|------|
| `post_note_edit_review.ps1` | 2026-04-13 | Node.js CLI `aimv review`로 대체 |
| `obsidian_ai_bridge.ps1` | 2026-04-13 | Node.js CLI `aimv bridge`로 대체 |
| `task_router.ps1` | 2026-04-13 | Node.js CLI `aimv route`로 대체 |
| `sync_workspace.ps1` | 2026-04-13 | Node.js CLI `aimv sync`로 대체 |
| `pre_sync.ps1` | 2026-04-13 | Node.js CLI `aimv pre-sync`로 대체 |
| `vault_index_build.ps1` | 2026-04-13 | Node.js CLI `aimv index build`로 대체 |
| `vault_index_search.ps1` | 2026-04-13 | Node.js CLI `aimv index search`로 대체 |
| `vault_trash_clean.ps1` | 2026-04-13 | Node.js CLI `aimv trash-clean`으로 대체 |
| `clone_vault.ps1` | 2026-04-13 | Node.js CLI `aimv clone`으로 대체 |
| `check_standards.ps1` | 2026-04-13 | Node.js CLI `aimv standards`로 대체 |
| `verify_structure.ps1` | 2026-04-13 | Node.js CLI `aimv standards -d`로 대체 |
| `init_vault.ps1` | 2026-03-10 | 콘텐츠 폴더 하드코딩으로 유연성 부족. 사용자 수동 세팅으로 대체 |
| `preflight_docs_encoding.ps1` | 2026-03-09 | `post_note_edit_review.ps1`과 기능 중복 |
| `delegate-run.md` (skill) | 2026-03-09 | 위임 워크플로우 폐지 |
| `delegate-analyze.md` (skill) | 2026-03-09 | 위임 워크플로우 폐지 |
| `open_agents.ps1` | 2026-03-11 | 멀티볼트 루트에서 IDE를 한 번만 열면 되므로 불필요 |
| `create_domain.ps1` | 2026-03-17 | 일회성 스크립트, `_Standards/Domain/` 초기 생성 완료 |
| `migrate_standards.ps1` | 2026-03-17 | 일회성, `_Standards/` 구조 재편 완료 |
| `migrate_standards2.ps1` | 2026-03-17 | 일회성, `_Standards/` 하위 폴더 이동 완료 |
| `create_MakeCloneVault.bat` | 2026-03-17 | 일회성, clone_vault.ps1로 대체 |
| `GitMirrorSync_DecisionPoints.md` | 2026-03-17 | Git 미러 동기화 결정 문서, 참조 완료 |
| `RUN_OBSIDIAN_VAMSURLIKE.bat` | 2026-03-17 | 하드코딩 절대경로, Hub 배포 부적합 |

---

## 갱신 규칙

- 스크립트 생성/삭제/상태 변경 시 이 문서를 함께 갱신한다.
- 상세 생성 규칙 → [[Script_Creation_Rule]]

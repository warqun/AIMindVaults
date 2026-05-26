---
type: standards
tags:
  - Standards
  - AIMindVault
  - script-management
updated: 2026-03-17
agent: claude
---

# Script Registry — 스크립트 레지스트리

> 볼트 내 모든 스크립트의 용도·소유자·상태를 관리하는 인벤토리.
> 에이전트가 스크립트를 생성/삭제/수정할 때 이 문서를 함께 갱신해야 한다.

---

## 활성 스크립트 (Active)

현재 운영에 사용 중인 스크립트.

| 스크립트 | 위치 | 용도 | 생성자 | 사용자 |
|---------|------|------|--------|--------|
| `post_note_edit_review.ps1` | `_tools/cli/` | 노트 편집 후 인코딩·frontmatter 검증 | codex | claude, codex, antigravity |
| `obsidian_ai_bridge.ps1` | `_tools/cli/` | Obsidian CLI 래퍼 (조회/검색/히스토리/post-review) | codex | claude, codex, antigravity |
| `task_router.ps1` | `_tools/cli/` | 작업 설명 → 에이전트 라우팅 추천 | codex | user (수동) |
| `sync_workspace.ps1` | `_tools/cli/` | 볼트 간 작업환경 동기화 (Hub-Sync) — 버전 비교·파일 복사 | antigravity | claude, codex, antigravity |
| `vault_index_build.ps1` | `_tools/cli/` | 볼트 콘텐츠 인덱서 — Contents/ 크롤링 → JSON 인덱스 생성 | claude | claude, user, AI agents |
| `vault_index_search.ps1` | `_tools/cli/` | 볼트 콘텐츠 검색 — JSON 인덱스 기반 키워드/태그/타입 검색 | claude | claude, user, AI agents |
| `clone_vault.ps1` | `BasicContentsVault/.sync/` | 볼트 템플릿 미러 복사 (robocopy). 루트 _tools/ 사본 삭제됨 | codex | user |
| `hub_broadcast.ps1` | `_tools/cli/` | Hub .sync/ 내 특정 파일을 전체 위성 볼트에 즉시 전파 | claude | claude, user, AI agents |
| `setup_new_environment.ps1` | `_tools/` | 새 환경 초기 설정 (진단, 볼트 등록, 동기화, 인덱스) | claude | user, AI agents |
| `check_standards.ps1` | `_tools/` | `_Standards/` 디렉토리 구조 확인 | codex | codex, user |
| `verify_structure.ps1` | `_tools/` | `_Standards/` 상세 구조 출력 | codex | codex, user |
---

## 일회성/완료 스크립트 (One-time)

특정 마이그레이션이나 수정을 위해 만들어졌고, 재사용하지 않는 스크립트.

과거 외부 에이전트 스테이징에 있던 일회성 스크립트 2건은 스테이징 허브 개념 폐기와 함께 제거됨 (2026-04-18, R063).

---

## 삭제된 스크립트 (Deleted)

| 스크립트 | 삭제일 | 사유 |
|---------|--------|------|
| `init_vault.ps1` | 2026-03-10 | 콘텐츠 폴더 하드코딩으로 유연성 부족. 사용자 수동 세팅으로 대체. `_forge/staging/`에 참고용 보관 |
| `preflight_docs_encoding.ps1` | 2026-03-09 | `post_note_edit_review.ps1`과 기능 중복. 의존 파일(`VERIFY_ENCODING_AFTER_RESTORE.ps1`) 부재 |
| `delegate-run.md` (skill) | 2026-03-09 | 위임 워크플로우 폐지 |
| `delegate-analyze.md` (skill) | 2026-03-09 | 위임 워크플로우 폐지 |
| `open_agents.ps1` | 2026-03-11 | 멀티볼트 루트에서 IDE를 한 번만 열면 되므로 볼트별 자동 실행 불필요. Shell Commands 이벤트(on-layout-ready) 해제 권장 |
| `create_domain.ps1` | 2026-03-17 | 배포 정리 — 일회성 스크립트 제거. `_Standards/Domain/` 초기 생성은 수동으로 대체 |
| `migrate_standards.ps1` | 2026-03-17 | 배포 정리 — `_Standards/` Core/Domain 구조 재편 완료, 재사용 불필요 |
| `migrate_standards2.ps1` | 2026-03-17 | 배포 정리 — `_Standards/` 하위 폴더 이동 완료, 재사용 불필요 |
| `create_MakeCloneVault.bat` | 2026-03-17 | 배포 정리 — 일회성 배치 파일 제거. clone_vault.ps1로 대체 |
| `GitMirrorSync_DecisionPoints.md` | 2026-03-17 | 배포 정리 — Git 미러 동기화 결정 문서, 참조 완료 |
| `RUN_OBSIDIAN_VAMSURLIKE.bat` | 2026-03-17 | 하드코딩 절대경로(`C:\Dev_Game\...`), Hub 배포 부적합. cli_launchers/ 정리 |

---

## 하드코딩 경고 이력

| 스크립트 | 문제 | 해결 | 해결일 |
|---------|------|------|--------|
| `post_note_edit_review.ps1` | Root/Scope 하드코딩 | Plan B 자동탐지 적용 | 2026-03-09 |
| `obsidian_ai_bridge.ps1` | VaultName/Scope 하드코딩 | Plan B 자동탐지 적용 | 2026-03-09 |
| `fix_false_positives.ps1` | VaultRoot 하드코딩 | Plan B 자동탐지 적용 | 2026-03-09 |
| `migrate_standards.ps1` | Root 하드코딩 | 일회성이라 미수정 | — |
| `check_standards.ps1` | Root 하드코딩 | 일회성이라 미수정 | — |
| `verify_structure.ps1` | Root 하드코딩 | 일회성이라 미수정 | — |
| `create_domain.ps1` | Root 하드코딩 | 일회성이라 미수정 | — |

---

## 갱신 규칙

- 스크립트 생성/삭제/상태 변경 시 이 문서를 함께 갱신한다.
- 상세 생성 규칙 → [[Script_Creation_Rule]]

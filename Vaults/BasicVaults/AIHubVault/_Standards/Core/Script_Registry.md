---
type: standards
tags:
  - Standards
  - AIMindVault
  - script-management
updated: 2026-03-16
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
| `clone_vault.ps1` | `_tools/` | 볼트 전체 미러 복사 (robocopy) | codex | user |
| `check_standards.ps1` | `_tools/` | `_Standards/` 디렉토리 구조 확인 | codex | codex, user |
| `verify_structure.ps1` | `_tools/` | `_Standards/` 상세 구조 출력 | codex | codex, user |

---

## 일회성/완료 스크립트 (One-time)

특정 마이그레이션이나 수정을 위해 만들어졌고, 재사용하지 않는 스크립트.

| 스크립트 | 위치 | 용도 | 생성자 | 비고 |
|---------|------|------|--------|------|
| `fix_false_positives.ps1` | `_forge/staging/` | 이전 rename 스크립트 오탐 수정 | codex | 수정 완료 |
| `rename_env_prefix.ps1` | `_forge/staging/` | 환경 접두어 리네이밍 | codex | staging 스크립트 |

---

## 삭제된 스크립트 (Deleted)

| 스크립트 | 삭제일 | 사유 |
|---------|--------|------|
| `init_vault.ps1` | 2026-03-10 | 콘텐츠 폴더 하드코딩으로 유연성 부족. 사용자 수동 세팅으로 대체. `_forge/staging/`에 참고용 보관 |
| `preflight_docs_encoding.ps1` | 2026-03-09 | `post_note_edit_review.ps1`과 기능 중복. 의존 파일(`VERIFY_ENCODING_AFTER_RESTORE.ps1`) 부재 |
| `delegate-run.md` (skill) | 2026-03-09 | 위임 워크플로우 폐지 |
| `delegate-analyze.md` (skill) | 2026-03-09 | 위임 워크플로우 폐지 |
| `open_agents.ps1` | 2026-03-11 | 멀티볼트 루트에서 IDE를 한 번만 열면 되므로 볼트별 자동 실행 불필요 |
| `create_domain.ps1` | 2026-03-16 | AIHubVault 내용 하드코딩, clone_vault.ps1로 복제 시 이미 포함됨 |
| `migrate_standards.ps1` | 2026-03-16 | 일회성 마이그레이션 완료. 배포 패키지에서 제거 |
| `migrate_standards2.ps1` | 2026-03-16 | 일회성 마이그레이션 완료. 배포 패키지에서 제거 |
| `antigravity.exe.txt` | 2026-03-16 | 개인 IDE 경로 파일. 배포 패키지에서 제거 |
| `create_MakeCloneVault.bat` | 2026-03-16 | clone_vault.ps1과 기능 중복. 배포 패키지에서 제거 |
| `GitMirrorSync_DecisionPoints.md` | 2026-03-16 | 개인 Git+Syncthing 동기화 정책 문서. 배포 패키지에서 제거 |
| `cli_launchers/` (4개 bat) | 2026-03-16 | 개인 환경 실행기. 배포 패키지에서 제거 |

---

## 하드코딩 경고 이력

| 스크립트 | 문제 | 해결 | 해결일 |
|---------|------|------|--------|
| `post_note_edit_review.ps1` | Root/Scope 하드코딩 | Plan B 자동탐지 적용 | 2026-03-09 |
| `obsidian_ai_bridge.ps1` | VaultName/Scope 하드코딩 | Plan B 자동탐지 적용 | 2026-03-09 |
| `fix_false_positives.ps1` | VaultRoot 하드코딩 | Plan B 자동탐지 적용 | 2026-03-09 |
| `check_standards.ps1` | Root 하드코딩 | 일회성이라 미수정 | — |
| `verify_structure.ps1` | Root 하드코딩 | 일회성이라 미수정 | — |

---

## 갱신 규칙

- 스크립트 생성/삭제/상태 변경 시 이 문서를 함께 갱신한다.
- 상세 생성 규칙 → [[Script_Creation_Rule]]

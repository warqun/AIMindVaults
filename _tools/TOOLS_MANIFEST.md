# Tools 매니페스트

> 배포 동기화 시 이 목록의 파일만 배포 대상으로 관리한다.
> 폴더 구조는 변경하지 않고, 이 파일로 core/custom을 구분한다.

## 분류 기준

- **core**: 배포본에 포함. 볼트 기본 기능에 필수인 도구.
- **custom**: 배포 미대상. 개인 환경, 디버그, 인덱서 등 제작자 전용.
- 신규 도구는 custom에 우선 배치. 검증 후 필요하면 core로 격상.
- core로 격상 시 이 MANIFEST에 등록 + 배포 변경 로그에 기록.

## core — 배포 도구 (동기화 대상)

| 파일 | 용도 |
|------|------|
| clone_vault.ps1 | 볼트 미러 복제 |
| MakeCloneVault.bat | 볼트 복제 런처 |
| cli/obsidian_ai_bridge.ps1 | Obsidian CLI 래퍼 |
| cli/post_note_edit_review.ps1 | 노트 편집 후 품질 검증 |
| cli/sync_workspace.ps1 | Hub → 볼트 workspace 동기화 |
| cli/pre_sync.ps1 | 동기화 전 스크립트 최신화 |
| cli/task_router.ps1 | 작업 기반 에이전트 추천 |
| cli/open_vault.ps1 | Obsidian 볼트 열기 |
| cli_launchers/RUN_CLAUDE.bat | Claude CLI 실행 |
| cli_launchers/RUN_CODEX.bat | Codex CLI 실행 |
| cli_launchers/RUN_GEMINI.bat | Gemini CLI 실행 |
| TOOLS_INDEX.md | 도구 목록 문서 |
| TOOLS_MANIFEST.md | 이 파일 (배포 구분 기준) |

## custom — 개인 도구 (동기화 미대상)

| 파일 | 용도 |
|------|------|
| antigravity.exe.txt | Antigravity 실행 경로 참조 |
| open_agents.ps1 | (폐지됨) 멀티볼트 루트 IDE 실행 |
| check_standards.ps1 | _Standards 구조 확인 (디버그) |
| verify_structure.ps1 | _Standards 파일 목록 출력 (디버그) |
| cli/vault_index_build.ps1 | 볼트 인덱스 빌드 |
| cli/vault_index_search.ps1 | 볼트 인덱스 검색 |
| data/vault_index.json | 인덱스 데이터 |

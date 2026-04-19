# Tools Index

> `_tools/` 하위 도구 목록. Hub-Sync로 모든 볼트에 배포된다.

---

## 사용자용 도구

> 사용자가 직접 실행하는 도구. 더블클릭 또는 PowerShell에서 수동 호출.

| 파일                                          | 용도                           | 실행 방법                                |
| ------------------------------------------- | ---------------------------- | ------------------------------------ |
| `MakeCloneVault.bat`                        | 볼트 복제 런처 (부모경로 + 볼트명 입력)     | 더블클릭                                 |
| `clone_vault.ps1`                           | Obsidian 볼트 미러 복제 (robocopy) | `.\clone_vault.ps1 -TargetPath <경로>` |
| `cli_launchers/RUN_CLAUDE.bat`              | Claude CLI 실행                | 더블클릭                                 |
| `cli_launchers/RUN_CODEX.bat`               | Codex CLI 실행                 | 더블클릭                                 |
| `cli_launchers/RUN_GEMINI.bat`              | Gemini CLI 실행                | 더블클릭                                 |

---

## AI 에이전트 전용 도구

> AI 에이전트(Claude Code, Claudian, Codex 등)가 작업 중 자동으로 호출하는 도구. 사용자가 직접 실행할 필요 없음.

| 파일 | 용도 | 호출 예시 |
|------|------|----------|
| `cli/obsidian_ai_bridge.ps1` | Obsidian CLI 래퍼 — 검색, 읽기, 열기, 생성, 플러그인 관리 | `-Action open -Path "Contents/note.md"` |
| `cli/post_note_edit_review.ps1` | 노트 편집 후 품질 검증 (frontmatter, 인코딩 등) | 편집 완료 후 자동 실행 |
| `cli/sync_workspace.ps1` | AIHubVault → 다른 볼트 workspace 동기화 | `-NoPrune` (삭제 동기화 비활성화) |
| `cli/task_router.ps1` | 작업 텍스트 기반 담당 에이전트 추천 | `-Task "볼트 구조 검증"` |
| `cli/hub_broadcast.ps1` | Hub .sync/ 특정 파일을 전체 위성 볼트에 즉시 전파 | `-RelativePath "clone_vault.ps1" -Exclude TestVault` |

### obsidian_ai_bridge.ps1 액션 목록

| 액션 | 권한 | 설명 |
|------|------|------|
| `vault-info` | 읽기 | 볼트 정보 조회 |
| `search` | 읽기 | 텍스트 검색 |
| `search-context` | 읽기 | 컨텍스트 포함 검색 |
| `read` | 읽기 | 파일 내용 읽기 |
| `open` | 읽기 | Obsidian에서 노트 열기 |
| `append` | 쓰기 | 파일 끝에 내용 추가 |
| `create` | 쓰기 | 새 파일 생성 |
| `history` | 읽기 | 파일 히스토리 목록 |
| `history-read` | 읽기 | 히스토리 버전 읽기 |
| `history-restore` | 쓰기 | 히스토리 버전 복원 |
| `diff` | 읽기 | 버전 간 차이 비교 |
| `plugins-list` | 읽기 | 설치된 플러그인 목록 |
| `plugin-install` | 쓰기 | 플러그인 설치 |
| `post-review` | 읽기 | 편집 후 품질 검증 실행 |

---

## 참조 파일

| 파일 | 설명 |
|------|------|
| `antigravity.exe.txt` | Antigravity 실행 파일 경로 참조 |
| `open_agents.ps1` | (폐지됨) 멀티볼트 루트 IDE 1회 실행으로 대체 |
| `check_standards.ps1` | `_Standards/` 구조 확인 (디버그용) |
| `verify_structure.ps1` | `_Standards/` 파일 목록 출력 (디버그용) |

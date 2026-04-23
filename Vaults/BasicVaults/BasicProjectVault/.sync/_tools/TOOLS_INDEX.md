# Tools Index

> `_tools/` 하위 도구 목록. Hub-Sync로 모든 볼트에 배포된다.

---

## Node.js CLI (`cli-node/`)

> 모든 자동화 도구의 통합 진입점. Node.js 기반 크로스플랫폼 CLI.

**실행**: `node ".sync/_tools/cli-node/bin/cli.js" <command> [options]`

| 커맨드 | 용도 | 예시 |
|--------|------|------|
| `review` | 노트 편집 후 품질 검증 (frontmatter, 인코딩) | `aimv review -r . -s Contents` |
| `bridge` | Obsidian local-rest-api 래퍼 (검색, 읽기, 열기) | `aimv bridge -a search -q "keyword"` |
| `sync` | AIHubVault → 위성 볼트 workspace 동기화 | `aimv sync -r .` |
| `pre-sync` | Obsidian 기동 시 자동 동기화 (트램펄린) | `aimv pre-sync -r .` |
| `broadcast` | Hub 특정 파일을 전체 위성 볼트에 즉시 전파 | `aimv broadcast -p "file.md"` |
| `index build` | 볼트 콘텐츠 인덱스 빌드 | `aimv index build -r .` |
| `index search` | 인덱스 기반 키워드/태그/타입 검색 | `aimv index search -q "검색어"` |
| `route` | 작업 텍스트 기반 볼트/에이전트 라우팅 | `aimv route -t "task"` |
| `clone` | 볼트 미러 복제 (robocopy 기반) | `aimv clone -t <path> -n <name>` |
| `standards` | `_Standards/` 구조 검증 | `aimv standards -r .` |
| `trash-clean` | Obsidian 휴지통 정리 | `aimv trash-clean -r .` |

### bridge 액션 목록

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

## 사용자용 도구

> 사용자가 직접 실행하는 런처.

| 파일 | 용도 | 실행 방법 |
|------|------|----------|
| `cli_launchers/RUN_CLAUDE.bat` | Claude CLI 실행 | 더블클릭 |
| `cli_launchers/RUN_CODEX.bat` | Codex CLI 실행 | 더블클릭 |
| `cli_launchers/RUN_GEMINI.bat` | Gemini CLI 실행 | 더블클릭 |

---

## 상세 CLI 레퍼런스

전체 14개 커맨드 상세: `docs/cli-reference.md` (루트)

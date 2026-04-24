---
type: standard
updated: 2026-03-08
tags:
  - TileMapToolKit
  - AIMindVault
---

# Plugins README — 플러그인 운영 표준 인덱스

## 이 볼트의 플러그인 구성

이 볼트는 AI 에이전트 협업, 지식 그래프 시각화, 자동화를 위한 Obsidian 플러그인 세트를 사용한다.

### 커뮤니티 플러그인 (28개)

| 플러그인 | ID | 용도 | 카테고리 |
|---------|-----|------|---------|
| Advanced Canvas | `advanced-canvas` | 캔버스 확장 기능 | 시각화 |
| Advanced Tables | `table-editor-obsidian` | 마크다운 테이블 편집 | 편집 |
| BRAT | `obsidian42-brat` | 베타 플러그인 설치/관리 | 관리 |
| Claudian | `claudian` | Claude AI 연동 (BRAT) | AI |
| Colored Tags | `colored-tags` | 태그 색상 구분 | 시각화 |
| Dataview | `dataview` | 데이터 쿼리/뷰 | 데이터 |
| Git | `obsidian-git` | Git 버전 관리 | 관리 |
| Global Search and Replace | `global-search-and-replace` | 전체 검색/치환 | 편집 |
| Juggl | `juggl` | 인터랙티브 지식 그래프 | 시각화 |
| Linter | `obsidian-linter` | 마크다운 포맷 정리 | 편집 |
| Local REST API | `obsidian-local-rest-api` | REST API로 볼트 접근 | AI |
| make.md | `make-md` | 파일 브라우저 확장 | 편집 |
| MCP Tools | `mcp-tools` | MCP 프로토콜 서버 | AI |
| Mermaid Themes | `mermaid-themes` | Mermaid 다이어그램 테마 | 시각화 |
| Mermaid Tools | `mermaid-tools` | Mermaid 다이어그램 도구 | 시각화 |
| Meta Bind | `obsidian-meta-bind-plugin` | 메타데이터 바인딩 UI | 데이터 |
| Metadata Menu | `metadata-menu` | Frontmatter 메타데이터 관리 | 데이터 |
| New 3D Graph | `new-3d-graph` | 3D 그래프 뷰 | 시각화 |
| QuickAdd | `quickadd` | 빠른 노트/템플릿 추가 | 자동화 |
| Share to NotionNext | `share-to-notionnext` | NotionNext 블로그 배포 | 배포 |
| Shell Commands | `obsidian-shellcommands` | 쉘 명령 실행 | 자동화 |
| Smart Connections | `smart-connections` | AI 임베딩 기반 유사 노트 | AI |
| TagFolder | `obsidian-tagfolder` | 태그 기반 가상 폴더 | 탐색 |
| Tasks | `obsidian-tasks-plugin` | 작업/할일 관리 | 데이터 |
| Templater | `templater-obsidian` | 고급 템플릿 엔진 | 자동화 |
| Time Machine | `obsidian-time-machine` | 노트 히스토리 (BRAT) | 관리 |
| YTranscript | `ytranscript` | YouTube 자막 추출 (BRAT) | AI |
| Obsidian Sync | (코어) | 동기화 | 관리 |

### BRAT 재설치 필요 플러그인

미러 복제 시 아래 플러그인은 BRAT을 통해 재설치해야 한다.

| 플러그인 | 리포지토리 | 설치 링크 |
|---------|-----------|----------|
| Time Machine | `dsebastien/obsidian-time-machine` | https://github.com/dsebastien/obsidian-time-machine |
| YTranscript | `lstrzepek/obsidian-yt-transcript` | https://github.com/lstrzepek/obsidian-yt-transcript |
| Claudian | `YishenTu/claudian` | https://github.com/YishenTu/claudian |

### 활성화된 코어 플러그인

File explorer, Global search, Quick switcher, Graph view, Backlink, Canvas, Outgoing links, Tag pane, Properties, Page preview, Daily notes, Templates, Note composer, Command palette, Editor status, Bookmarks, Outline, Word count, File recovery, Sync, Bases

### 비활성화된 코어 플러그인

Footnotes, Slash commands, Markdown importer, Zettelkasten prefixer, Random note, Slides, Audio recorder, Workspaces, Publish, Web viewer

---

## 볼트 설정

### 앱 설정 (`app.json`)

- `alwaysUpdateLinks`: true — 파일명 변경 시 링크 자동 갱신

### 테마·외관 (`appearance.json`)

- 테마: `obsidian` (기본 다크)
- 활성 CSS 스니펫 (8개):
  - `vis-callouts` — 콜아웃 스타일
  - `vis-codeblocks` — 코드블록 스타일
  - `vis-emphasis` — 강조 스타일
  - `vis-headings` — 제목 스타일
  - `vis-mermaid-fix` — Mermaid 렌더링 보정
  - `vis-tables` — 테이블 스타일
  - `vis-tags-links` — 태그/링크 스타일
  - `vis-typography` — 타이포그래피

> 참고: `header-colors.css`는 설치되어 있으나 비활성 상태.

### 단축키 (`hotkeys.json`)

| 단축키 | 명령 |
|--------|------|
| `F12` | 3D Graph 열기 |
| `Ctrl+Shift+Y` | Shell Command 실행 |

### 프로퍼티 타입 (`types.json`)

- Tasks 플러그인 전용 TQ_ 접두사 프로퍼티 17개 정의 (checkbox/text)
- 기본: `aliases`, `cssclasses`, `tags`

---

## 카테고리별 플러그인 역할

### AI 에이전트 연동 (4개)

| 플러그인 | 역할 |
|---------|------|
| Claudian | Obsidian 내에서 Claude AI 직접 호출 |
| MCP Tools | MCP 프로토콜 서버 — 외부 AI 도구가 볼트에 접근 |
| Local REST API | REST API로 볼트 읽기/쓰기 (자동화용) |
| Smart Connections | 임베딩 기반 유사 노트 추천 |

### 시각화 (5개)

| 플러그인 | 역할 |
|---------|------|
| Juggl | 인터랙티브 지식 그래프 (노트 관계 시각화) |
| New 3D Graph | 3D 그래프 뷰 |
| Mermaid Tools | Mermaid 다이어그램 편집/미리보기 |
| Mermaid Themes | Mermaid 테마 커스터마이징 |
| Advanced Canvas | 캔버스 확장 |

### 자동화 (3개)

| 플러그인 | 역할 |
|---------|------|
| Templater | 고급 템플릿 (JavaScript 지원) |
| QuickAdd | 매크로/빠른 추가 |
| Shell Commands | CLI 명령 실행 (post-edit review 등) |

### 데이터 관리 (4개)

| 플러그인 | 역할 |
|---------|------|
| Dataview | 노트 쿼리/목록/테이블 생성 |
| Metadata Menu | Frontmatter 필드 관리 |
| Meta Bind | 메타데이터 인라인 바인딩 |
| Tasks | 할일/작업 추적 |

---

## 플러그인별 상세 문서

### 공통 문서

- `PLUGIN_CAPABILITIES_FOR_AI.md`: 플러그인 기능 맵
- `PLUGIN_TASK_ROUTING.md`: 작업별 도구 선택 기준
- `MERMAID_JUGGL_SYNTAX.md`: Mermaid/Juggl 문법 레퍼런스
- `RENDERING_SKILL_DRILLS.md`: 렌더/문법 숙련 훈련 시트

### 개별 문서

- `PLUGIN_CLAUDIAN.md`
- `PLUGIN_CHATGPT_MD.md`
- `PLUGIN_SMART_CONNECTIONS.md`
- `PLUGIN_MCP_TOOLS.md`
- `PLUGIN_SHELL_COMMANDS.md`
- `PLUGIN_TEMPLATER.md`
- `PLUGIN_QUICKADD.md`
- `PLUGIN_DATAVIEW.md`
- `PLUGIN_METADATA_MENU.md`
- `PLUGIN_META_BIND.md`
- `PLUGIN_TASKS.md`
- `PLUGIN_LINTER.md`
- `PLUGIN_JUGGL.md`
- `PLUGIN_MERMAID_TOOLS.md`

---

## 운용 순서

1. 작업 목표 정의
2. `PLUGIN_TASK_ROUTING.md`에서 1순위 플러그인 선택
3. 해당 플러그인 개별 문서 절차로 실행
4. 결과를 `_STATUS.md`/`AGENT_STATUS.md`에 기록

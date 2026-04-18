# AIMindVault

> AI 작업환경 설계·개선·배포를 위한 Obsidian 볼트.
> Multi-agent orchestration (Claude · Codex · Copilot), 지식 그래프 시각화, 자동화 스크립트, AI 에이전트 운영 표준 문서 포함.

## 이 볼트가 포함하는 것

- **AI 에이전트 협업 설정** — Claude Code, Codex, Copilot Agent 설정 파일 및 규칙
- **`_Standards/`** — Frontmatter 규칙, 플러그인 운영 표준, 인코딩/편집 안전 가이드
- **`Contents/`** — 볼트 콘텐츠 (Domain: 지식 축적, Project: 작업 관리)
- **Juggl 스타일 가이드** — 지식 그래프 시각화 표준

---

## Prerequisites

- **Obsidian** v1.5 이상
- **(선택)** Git — obsidian-git을 통한 자동 버전 관리 사용 시

---

## Quick Start

### 1단계: 볼트 받기

**ZIP 다운로드 (간편)**

1. 이 페이지에서 **Code → Download ZIP** 클릭
2. 압축 해제 후 원하는 위치에 폴더 이동

**Git Clone (권장)**

```bash
git clone https://github.com/warqun/AIMindVault.git
```

---

### 2단계: Obsidian에서 열기

1. Obsidian 실행 → **Open folder as vault**
2. `AIMindVault` 폴더 선택

> **첫 실행 시**: "커뮤니티 플러그인 사용" 팝업 → **Turn on community plugins** 클릭

---

### 3단계: 플러그인 설치

볼트는 플러그인 바이너리를 포함하지 않습니다. 아래 순서로 직접 설치하세요.

#### ① 일반 커뮤니티 플러그인 (24개)

`Settings → Community plugins → Browse`에서 검색·설치·활성화:

| 플러그인명                     | 플러그인 용도 |
| ------------------------- | ------- |
| Advanced Canvas           | 캔버스 고급 기능 확장 (카드 색상, 엣지 스타일, 그룹 등) |
| Advanced Tables           | 마크다운 표 자동 정렬 및 키보드 편집 지원 |
| BRAT                      | 베타·미출시 플러그인 GitHub URL로 설치·관리 |
| Colored Tags              | 태그에 색상 적용해 시각적 구분 |
| Dataview                  | 노트를 데이터베이스처럼 쿼리·테이블·리스트로 표시 |
| Git                       | Git 자동 커밋·푸시·풀 (버전 관리) |
| Global Search and Replace | 볼트 전체 텍스트 일괄 검색·치환 |
| Juggl                     | 인터랙티브 지식 그래프 시각화 |
| Linter                    | 노트 형식 자동 교정 (frontmatter, 공백, 줄바꿈 등) |
| Local REST API            | 외부 도구(Claude 등)에서 Obsidian에 HTTP API로 접근 |
| make.md                   | 파일 관리·Spaces·스마트 폴더 UI 제공 |
| MCP Tools                 | MCP 서버 연동 — AI 에이전트와 Obsidian 연결 |
| Mermaid Themes            | Mermaid 다이어그램 테마 커스터마이징 |
| Mermaid Tools             | Mermaid 다이어그램 작성 보조 도구 |
| Meta Bind                 | 노트 내 인터랙티브 위젯 (버튼·슬라이더·입력창) |
| Metadata Menu             | 프론트매터 메타데이터 관리 UI |
| New 3D Graph              | 3D 지식 그래프 시각화 |
| QuickAdd                  | 빠른 노트 생성·템플릿·매크로 실행 |
| Share to NotionNext       | 노트를 Notion 페이지로 내보내기 |
| Shell Commands            | 터미널 명령어를 Obsidian 내에서 직접 실행 |
| Smart Connections         | AI 기반 노트 의미 유사도 연결 추천 |
| TagFolder                 | 태그 기반 가상 폴더 뷰 제공 |
| Tasks                     | 할 일 목록·마감일·필터·반복 일정 관리 |
| Templater                 | 고급 템플릿 작성 및 자동화 (JS 스크립팅 지원) |

#### ② 베타 버전 플러그인 (3개)

BRAT 설치 및 활성화 후, `Settings → BRAT → Add Beta plugin`에서 아래 URL 입력:

| 플러그인         | GitHub URL                                          | 플러그인 용도 |
| ------------ | --------------------------------------------------- | ------- |
| Claudian     | https://github.com/YishenTu/claudian                | Claude AI 에이전트를 Obsidian 내에서 직접 실행 |
| Time Machine | https://github.com/dsebastien/obsidian-time-machine | 노트 편집 히스토리·스냅샷 조회 및 복원 |
| YTranscript  | https://github.com/lstrzepek/obsidian-yt-transcript | YouTube 영상 자막 추출·노트 삽입 |

> 상세 설치 방법 → [`_Standards/Plugins/Installed_Plugins_Index.md`](./_Standards/Plugins/Installed_Plugins_Index.md)

---

## 볼트 구조

```
AIMindVault/
├── Contents/              # 볼트 콘텐츠
│   ├── Domain/            # 지식 축적 (가이드, 리서치, 프롬프트)
│   └── Project/           # 작업 관리 (아이디어, 계획)
├── _Standards/            # Vault 일관성 기준 및 플러그인 운영 표준
├── _tools/                # 자동화 스크립트 (PowerShell CLI)
├── Juggl_StyleGuide/      # Juggl 그래프 스타일 가이드
├── Tags/                  # 태그 정의 노트
├── _VaultReview/          # 에이전트 검토 보고서
├── _STATUS.md             # 현재 작업 상태 (세션 시작 시 확인)
├── _VAULT-INDEX.md        # 전체 문서 위치 인덱스
└── .claude/               # Claude Code 설정 (rules, commands)
```

---

## AI 에이전트 연동

| 에이전트 | 설정 파일 위치 |
|---------|-------------|
| Claude Code | `.claude/CLAUDE.md`, `.claude/rules/`, `.claude/commands/` |
| Codex | `.codex/` |
| GitHub Copilot | `.github/copilot-instructions.md` |

각 AI 도구의 workspace로 이 볼트 경로를 지정하면 `_Standards/`의 규칙을 자동으로 참조합니다.

---

## 플러그인 상세 정보

→ [`_Standards/Plugins/README.md`](./_Standards/Plugins/README.md)

---

## License

MIT

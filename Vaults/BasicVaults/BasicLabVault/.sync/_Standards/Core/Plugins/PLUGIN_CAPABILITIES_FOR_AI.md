---
tags:
  - TileMapToolKit
type: standard
updated: 2026-03-05
---

# PLUGIN_CAPABILITIES_FOR_AI — AI용 플러그인 기능 정의

## 목적

- AI 에이전트가 플러그인별 "무엇을 할 수 있는지"를 빠르게 판단한다.
- 동일 작업에 대해 도구 선택을 일관되게 유지한다.

## 핵심 원칙

1. 파일 I/O와 대량 수정은 CLI 우선.
2. 플러그인은 "시각화/상호작용/메타데이터 편집/자동화 트리거" 보완 용도로 사용.
3. 결과는 반드시 문서(`_STATUS.md`, `AGENT_STATUS.md`)에 기록.

## 플러그인별 기능

| 플러그인 | AI 관점 핵심 기능 | 추천 사용 상황 |
|---|---|---|
| `claudian` | Obsidian 내부에서 Claude 대화/문서작업 | 기획 문서 초안, 빠른 수정 |
| `chatgpt-md` | Obsidian 내부 LLM 대화/에이전트 프리셋 운용 | 로컬 Ollama 기반 초안/분업 작업 |
| `smart-connections` | 유사 노트 탐색/연결 추천 | 관련 노트 찾기, 참조 누락 보완 |
| `mcp-tools` | MCP 기반 외부 도구 호출 연결 | 브라우저/깃허브/외부 시스템 연동 |
| `obsidian-shellcommands` | 스크립트 실행 트리거 | ~~`_tools/open_agents.ps1` 자동 실행~~ (폐지) |
| `templater-obsidian` | 템플릿 기반 노트 생성 | 이슈/회의록/스펙 표준 생성 |
| `quickadd` | 캡처/명령/템플릿 자동화 | 반복 생성 작업 단축 |
| `dataview` | 메타데이터 쿼리/목록화 | 이슈 대시보드, 상태 목록 |
| `metadata-menu` | frontmatter 편집 UI | 우선순위/상태 일괄 입력 |
| `obsidian-meta-bind-plugin` | 폼 UI와 메타데이터 바인딩 | 사람+AI 협업 입력 폼 |
| `obsidian-tasks-plugin` | 태스크 쿼리/스케줄 관리 | 데일리 TODO, 마감 추적 |
| `obsidian-linter` | 문서 포맷 규칙 자동 정리 | frontmatter/헤더/링크 정리 |
| `juggl` | 노트 링크 관계 시각화/구조 점검 | 지식 그래프 공백 탐지 |
| `mermaid-tools` | Mermaid 편집/렌더 보조 | 다이어그램 작성/검토 |

## 주의사항

- 플러그인 UI 상태는 로컬 사용자 설정 영향을 받는다.
- 플러그인별 고급 기능은 버전에 따라 차이가 날 수 있으므로, 기능 이름이 다르면 동일 목적의 최신 메뉴를 사용한다.

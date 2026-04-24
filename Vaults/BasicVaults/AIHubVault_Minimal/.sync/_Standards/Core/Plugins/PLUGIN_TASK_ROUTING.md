---
tags:
  - TileMapToolKit
type: standard
updated: 2026-03-05
---

# PLUGIN_TASK_ROUTING — 작업별 플러그인 사용 기준

## 목적

- "어떤 작업에 어떤 플러그인을 쓰는가"를 고정해 시행착오를 줄인다.

## 라우팅 표

| 작업 유형 | 1순위 | 2순위 | 비고 |
|---|---|---|---|
| 로컬 LLM 기반 초안 생성 | `chatgpt-md` | `claudian` | Ollama 연결 시 로컬 우선 |
| 노트 생성(표준 양식) | `templater-obsidian` | `quickadd` | 반복 노트는 QuickAdd로 단축 |
| 노트 대량 수정 | CLI | `obsidian-shellcommands` | 파일/정규식 작업은 CLI 우선 |
| 관련 문서 탐색 | `smart-connections` | `dataview` | 의미 기반 탐색 + 메타 쿼리 |
| 상태/우선순위 관리 | `metadata-menu` | `obsidian-meta-bind-plugin` | UI 편집 + 입력 폼 |
| TODO/마감 추적 | `obsidian-tasks-plugin` | `dataview` | 실행 목록은 Tasks 우선 |
| 문서 정리/정합성 | `obsidian-linter` | CLI | 자동 정리 후 검토 |
| 구조 시각화 | `juggl` | `mermaid-tools` | 그래프/흐름 관점 분리 |
| 다이어그램 작성 | `mermaid-tools` | `templater-obsidian` | 코드블록 템플릿화 권장 |
| Obsidian 내부 AI 편집 | `claudian` | `chatgpt-md` | 모델/에이전트별 역할 분리 가능 |
| 외부 시스템 연동 | `mcp-tools` | CLI | GitHub/브라우저 자동화 등 |

## 작업 절차 (공통)

1. 작업 목표 정의: 결과 파일, 종료 조건, 검증 방법 명시
2. 라우팅 선택: 위 표 기준으로 1순위 도구 결정
3. 실행: 필요 시 2순위 도구로 보완
4. 검증: 링크/메타데이터/쿼리 결과 확인
5. 기록: `_STATUS.md` + 자기 `AGENT_STATUS.md` 업데이트

## 예시

### 예시 1: 신규 이슈 노트 생성 + 상태 대시보드 반영

1. `templater-obsidian`으로 이슈 노트 생성
2. `metadata-menu`로 `status`, `priority`, `epic` 입력
3. `dataview` 쿼리 노트에서 표시 확인

### 예시 2: 복잡한 시스템 관계 파악

1. `juggl`로 링크 공백/고립 노트 확인
2. 필요한 관계를 위키링크로 보강
3. 핵심 흐름은 `mermaid` 다이어그램으로 고정

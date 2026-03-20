---
type: standard
tags:
  - AIMindVault
  - core
updated: 2026-03-11
---

# VAULTTYPE_PROJECT — 프로젝트 볼트 스펙

> 목표 달성·작업 관리 목적의 볼트 원형.
> 사용자가 이 스펙을 참고하여 수동으로 세팅한다.

## 목적

- 측정 가능한 목표를 향해 작업을 기획·실행·추적한다.
- 기획→설계→구현→검토의 PDCA 사이클을 지원.
- 정보 저장보다 **결과물 생산과 진행 추적**이 핵심.

## 폴더 구조

```
{VaultName}/
├── Contents/
│   └── Project/       # 목표 달성·작업 관리 (하위 구조는 볼트마다 자유 설계)
├── _Standards/
│   ├── Core/          # 글로벌 공통 운영 표준 (최상단에서 동기화)
│   ├── Contents/      # 이 볼트 전용 커스텀 규칙
│   └── CONTENTS_SPEC.md  # 볼트 정체성·콘텐츠 범위 정의
├── Tags/              # 태그 관리
├── Juggl_StyleGuide/  # Juggl 매핑 가이드
├── _STATUS.md         # 현재 작업 상태
└── _VAULT-INDEX.md    # 볼트 구조 인덱스
```

> **`Contents/Project/` 하위 구조**는 볼트마다 다를 수 있다.
> 예를 들어 게임 개발 볼트는 `docs/design/`, `src/` 등을 가질 수 있고,
> 일반 업무 프로젝트는 `tasks/`, `issues/`, `milestones/` 등을 가질 수 있다.
> 각 볼트는 `CONTENTS_SPEC.md`에 자체 콘텐츠 범위와 폴더 구조를 정의하고,
> `Contents/CONTENTS_AI_RULES.md`로 AI 에이전트가 콘텐츠 접근 시 참조할 규칙을 명시한다.

## Juggl 운용 방식

- **노드 분류**: 작업(task), 마일스톤(milestone), 이슈(issue), 결정(decision), 문서(doc)
- **레이아웃**: 계층(hierarchy) + 의존 그래프 (task → milestone)
- **핵심 관계**: 의존 관계(`depends-on`), 블로킹(`blocks`), 참조(`ref`)
- **Juggl 임베드**: 마일스톤 노트에 의존 그래프 삽입

## AI 에이전트 구성

모든 볼트는 멀티볼트 루트의 **공유 작업환경**을 사용한다.

| 구성 요소 | 위치 | 설명 |
|-----------|------|------|
| 글로벌 진입점 | 루트 `CLAUDE.md` / `CODEX.md` / `ANTIGRAVITY.md` | 볼트 레지스트리 + 라우팅 |
| 글로벌 공통 규칙 | 루트 `.claude/rules/` | 인코딩, 편집 모드 분리 등 강제 규칙 |
| 볼트 로컬 진입점 | `{VaultPath}\CLAUDE.md` | 볼트 전용 세션 규칙 + 역할 명시 |
| 볼트 에이전트 상태 | `{VaultPath}\.antigravity\AGENT_STATUS.md` 등 | 에이전트별 마지막 작업 상태 |

- 에이전트(Claude, Codex, Antigravity 등)는 **최상단에서 공통 관리**되며, 볼트 진입 시 글로벌 규칙 → 로컬 규칙 순서로 적용된다.
- 볼트 내부에 `.claude/`, `.codex/`, `.antigravity/` 폴더가 존재할 수 있으며, 이는 **볼트별 로컬 설정 오버라이드** 용도이다.
- 실제 어떤 에이전트를 활성 사용할지는 볼트별 CLAUDE.md / SESSION_RULES.md에서 명시한다.

## 노트 템플릿

볼트별 콘텐츠 성격에 맞는 템플릿을 자유롭게 구성한다.
프로젝트 볼트에 적합한 예시:

| 파일 | 용도 |
|------|------|
| `TEMPLATE_TaskNote.md` | 작업 노트 (목표, 완료 조건, 진행) |
| `TEMPLATE_Milestone.md` | 마일스톤 (목표치, 달성 기준, 기간) |
| `TEMPLATE_DecisionLog.md` | 의사결정 기록 (선택지, 이유, 결과) |
| `TEMPLATE_Retrospective.md` | 회고 (잘한 것, 개선점, 다음 행동) |

## 권장 플러그인 활용

| 플러그인 | 활용 방식 |
|----------|-----------|
| Templater | Task·Milestone 자동 삽입 |
| Juggl | 작업 의존 그래프 시각화 |
| Dataview | 진행 중 작업 목록, 마일스톤 달성률 |
| Tasks | 체크박스 작업 추적·필터 |
| Kanban | 작업 상태 보드 (To Do → In Progress → Done) |

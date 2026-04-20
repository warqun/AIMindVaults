---
type: standard
tags:
  - TileMapToolKit
  - AIMindVault
  - core
updated: 2026-03-11
---

# VAULTTYPE_DOMAIN — 도메인 볼트 스펙

> 특정 분야·주제의 지식을 축적하는 볼트 원형 (PKM).
> 사용자가 이 스펙을 참고하여 수동으로 세팅한다.

## 목적

- 일상 기록, 독서, 학습, 아이디어 등 정보를 수집·연결·정착시킨다.
- 시간이 지날수록 밀도가 높아지는 두 번째 뇌(Second Brain).
- 목표 달성보다 **정보 축적과 연결**이 핵심.

## 폴더 구조

```
{VaultName}/
├── Contents/
│   └── Domain/        # 지식 축적 (하위 구조는 볼트마다 자유 설계)
├── _Standards/
│   ├── Core/          # 글로벌 공통 운영 표준 (최상단에서 동기화)
│   ├── Contents/      # 이 볼트 전용 커스텀 규칙
│   └── CONTENTS_SPEC.md  # 볼트 정체성·콘텐츠 범위 정의
├── Tags/              # 태그 관리
├── Juggl_StyleGuide/  # Juggl 매핑 가이드
├── _STATUS.md         # 현재 작업 상태
└── _VAULT-INDEX.md    # 볼트 구조 인덱스
```

> **`Contents/Domain/` 하위 구조**는 볼트마다 다를 수 있다.
> 각 볼트는 `CONTENTS_SPEC.md`에 자체 콘텐츠 범위와 폴더 구조를 정의하고,
> `Contents/CONTENTS_AI_RULES.md`로 AI 에이전트가 콘텐츠 접근 시 참조할 규칙을 명시한다.

## Juggl 운용 방식

- **노드 분류**: 주제(topic), 인물(person), 날짜(daily), 수집(inbox), 출처(reference)
- **레이아웃**: 주제 클러스터 + 시간축 (daily 노드 선형 배열)
- **핵심 관계**: `[[링크]]` 기반 연결, 주제→개념 계층
- **Juggl 임베드**: 각 topic 노트 상단에 `local:` 뷰

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
도메인 볼트에 적합한 예시:

| 파일 | 용도 |
|------|------|
| `TEMPLATE_DailyNote.md` | 일일 기록 (오늘 배운 것, 한 일, 생각) |
| `TEMPLATE_InboxCapture.md` | 빠른 정보 수집 (나중에 분류) |
| `TEMPLATE_ConceptCard.md` | 개념 정리 카드 (정의, 연결, 예시) |
| `TEMPLATE_BookNote.md` | 독서 노트 (요약, 인용, 행동 포인트) |

## 권장 플러그인 활용

| 플러그인 | 활용 방식 |
|----------|-----------|
| Templater | DailyNote·InboxCapture 자동 삽입 |
| Juggl | 주제 클러스터 시각화 |
| Dataview | inbox 목록, 미처리 노트 추적 |
| Calendar | daily 노트 달력 탐색 |
| Smart Connections | 의미적 노트 연결 추천 |

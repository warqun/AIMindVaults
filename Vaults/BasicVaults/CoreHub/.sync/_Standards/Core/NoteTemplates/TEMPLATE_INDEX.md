---
aliases:
  - "템플릿 목록"
  - "노트 템플릿 인덱스"
tags:
  - TileMapToolKit
  - Standards
  - Meta
  - AIMindVault
type: standards
updated: 2026-03-08
agent: claude
---

# NoteTemplates 인덱스

## Common/ (모든 볼트 공통)

| 파일 | 용도 | 비고 |
|------|------|------|
| [[Common/TEMPLATE_DelegatedTaskPacket]] | 멀티 에이전트 작업 지시 패킷 | 에이전트 분업용 |
| [[Common/TEMPLATE_FinalDecisionLite]] | 최종 결론 요약 템플릿 | 에이전트 결과 회수용 |
| [[Common/TEMPLATE_ClaudeTokenLitePrompt]] | Claude 토큰 절약용 요청 템플릿 | 범용 |
| [[Common/TEMPLATE_JugglNote]] | Juggl 포함 일반 노트 템플릿 | 범용 |

## Domain/ (도메인 볼트 전용)

| 파일 | 용도 |
|------|------|
| [[Domain/TEMPLATE_DailyNote]] | 일일 기록 (오늘 배운 것, 한 일, 생각) |
| [[Domain/TEMPLATE_InboxCapture]] | 빠른 정보 수집 (나중에 분류) |
| [[Domain/TEMPLATE_ConceptCard]] | 개념 정리 카드 (정의, 연결, 예시) |
| [[Domain/TEMPLATE_BookNote]] | 독서 노트 (요약, 인용, 행동 포인트) |

## Project/ (프로젝트 볼트 전용)

| 파일 | 용도 |
|------|------|
| [[Project/TEMPLATE_TaskNote]] | 작업 노트 (목표, 완료 조건, 진행) |
| [[Project/TEMPLATE_Milestone]] | 마일스톤 (목표치, 달성 기준, 기간) |
| [[Project/TEMPLATE_DecisionLog]] | 의사결정 기록 (선택지, 이유, 결과) |
| [[Project/TEMPLATE_Retrospective]] | 회고 (잘한 것, 개선점, 다음 행동) |

## 사용 규칙
1. 템플릿을 복사한 뒤 플레이스홀더를 실제 값으로 교체한다.
2. 생성 후 updated 날짜를 당일로 맞춘다.
3. 관련 인덱스/상태 문서를 함께 갱신한다.
4. 오케스트레이션 프롬프트 템플릿은 `../Orchestration/README.md`를 참조한다.
5. Templater 설정: Template folder → `_Standards/Core/NoteTemplates`

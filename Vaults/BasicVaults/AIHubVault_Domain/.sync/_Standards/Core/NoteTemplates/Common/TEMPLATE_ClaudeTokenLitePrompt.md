---
aliases:
  - "Claude Token Lite Prompt"
  - "클로드 토큰 절약 프롬프트"
tags:
  - TileMapToolKit
  - Standards
  - Template
  - AIMindVault
  - Claude
  - Token
type: template
updated: 2026-03-04
agent: codex
---

# TEMPLATE_ClaudeTokenLitePrompt

```juggl
local: TEMPLATE_ClaudeTokenLitePrompt
```

## 목적
- Claude 입력을 짧고 정확하게 유지해 토큰 소모를 줄인다.

## 템플릿
```md
목표:
- (이번 요청의 단일 목표 1개)

맥락(최소):
- 프로젝트/경로:
- 현재 상태 2~3줄:

입력 데이터:
- 필요한 파일/로그만 (최대 3개)

출력 형식:
- 체크리스트 / 조치 / 10줄 요약 중 선택

제약:
- 길이: 최대 N줄
- 범위: 이번 작업만

완료 기준:
- 무엇이 바뀌면 완료인지 1~2개
```

## 짧은 예시
```md
목표: SkillSystem 이슈 1개 원인 추정
맥락: docs/issues/systems/Logic_ISSUE_INDEX_SkillSystem.md 검토 중
입력 데이터: ISSUE 노트 + 최근 로그 10줄
출력 형식: 원인 2개 + 즉시 액션 1개
제약: 총 8줄 이내
완료 기준: 다음 실험 1개가 명확할 것
```

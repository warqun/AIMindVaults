---
type: agent-status
agent: antigravity
updated: 2026-03-10
---

# Antigravity Agent Status

> Antigravity가 세션마다 갱신하는 상태 파일.
> Claude/Codex/사람이 읽기 쉬운 **고정 포맷**을 유지한다.

## 볼트 전환 공지 (2026-03-08)

- 이 볼트는 **AI 작업환경 설계·개선·배포 허브**로 전환 완료.
- 게임 개발/기획 작업은 이 볼트에서 수행하지 않음.
- 이전 게임 전용 설정(ANTIGRAVITY.md, issue-workflow 등)은 삭제됨.
- 게임 관련 Unity/C# 작업은 별도 프로젝트(`C:/Dev_Game/GameBaseProject/`)에서 수행할 것.

## 편집 모드 분리 (강제)

- **`[Contents]` 모드**: `Contents/**` 콘텐츠만 수정. workspace 파일 수정 금지.
- **`[workspace]` 모드**: 볼트 인프라(`_Standards/`, `_tools/`, `.claude/`, `.codex/`, `_forge/`, `Tags/`, vault 루트 파일) 수정. `Contents/**` 본문 수정 금지.
- 작업 시작 시 모드 선언 필수. 전환 시 명시적 선언.
- 상세 규칙: `_WORKFLOW.md` § 6)

## 이번 세션 요약

- (볼트 전환으로 이전 게임 작업 이력은 더 이상 유효하지 않음)

## 결정 사항 (Decisions)

- 없음

## 다음에 할 일 (Next)

- 볼트 전환 후 첫 작업 지시 대기

## 막힌 것 / 질문 (Blocked)

- 없음

## 참고 링크

- [[_STATUS]]
- [[_VAULT-INDEX]]
- `_WORKFLOW.md` § 6) 편집 모드 분리

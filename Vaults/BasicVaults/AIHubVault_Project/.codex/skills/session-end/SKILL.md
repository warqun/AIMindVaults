---
name: session-end
description: 세션 종료 시 post-review, AGENT_STATUS 갱신, _STATUS.md 병합을 순차 수행하는 절차
---

# 세션 종료

> 사용 시점: 작업 완료 후 Codex 세션 종료 전

## Step 1 — post-review (문서 수정이 있었던 경우)

```bash
node ".sync/_tools/cli-node/bin/cli.js" review -r . -s Contents
```

`POST_EDIT_REVIEW_BAD=0` 확인. 실패 시 복구 후 다시 확인.

## Step 2 — AGENT_STATUS.md 갱신

`.codex/AGENT_STATUS.md` 업데이트:

```markdown
## 이번 세션 요약
- 작업 범위: [한 줄]
- 완료: [항목 목록]
- 보류/리스크: [있을 경우]

## 이번 세션에서 한 일 (Done)
- [파일별 변경 내용]

## 다음에 할 일 (Next)
- [다음 세션 진입점]

## 막힌 것 / 질문 (Blocked)
- [없음 또는 항목]
```

## Step 3 — _STATUS.md 병합 판단

아래 중 하나에 해당하면 _STATUS.md 업데이트:
- 다음 작업을 다른 에이전트가 이어서 할 예정
- 파일 수정 작업이 미완료 상태로 종료
- 불일치 감지

해당 없으면 병합 생략 (AGENT_STATUS만 갱신).

## Step 4 — 루트 _STATUS.md 갱신

루트 `_STATUS.md` 볼트 레지스트리에서 작업 에이전트를 `codex / YYYY-MM-DD`로 갱신.

## 체크리스트

```
[ ] post-review BAD_COUNT=0 확인
[ ] AGENT_STATUS.md 갱신 완료
[ ] 볼트 _STATUS.md 병합 여부 판단
[ ] 루트 _STATUS.md 작업 에이전트 갱신
[ ] 인덱스/링크 무결성 확인
```

# /status-update — 상태 갱신

> 볼트 `_STATUS.md`를 최신 상태로 갱신하고, 루트 `_STATUS.md`에 반영한다.
> 멀티볼트: 대상 볼트를 인자로 지정하거나 자동 감지.

인자: $ARGUMENTS (볼트명 | `all` | 생략)

- 생략 시: 현재 작업 중인 볼트 자동 감지
- `all`: 모든 활성 볼트 순회
- 인자 없이 실행: 루트 `_STATUS.md` 전체를 보여주고 각 볼트 `_STATUS.md`와 대조

## 실행 순서

1. 대상 볼트 결정 (인자 또는 자동 감지, `all`이면 모든 활성 볼트 순회)
2. `{볼트경로}/_STATUS.md` 읽기 (현재 상태 확인)
3. 이번 세션 작업 내용 기반으로 `{볼트경로}/_STATUS.md` 갱신
   - Now / Next / Blocked / Decisions 업데이트
4. 루트 `_STATUS.md` 해당 볼트 섹션 갱신
   - Now / Last Agent / Next / Blocked 반영
5. (선택) AGENT_STATUS 갱신이 필요하면 `{볼트경로}/.claude/AGENT_STATUS.md` 갱신
6. 출력
   - "STATUS 갱신 완료" + 남은 Blocked/Decisions 3줄 요약

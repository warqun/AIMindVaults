# Codex Agent Comms

> Codex 전용 `_AGENT_COMMS` 인박스 운용 규칙.
> 상세 프로토콜은 복제하지 않고 공통 정본을 참조한다.

## 정본

- 공통 프로토콜 정본: `../../_AGENT_COMMS/README.md`
- 에이전트 소유권 및 큐 분류 SOP 정본: `../../.claude/rules/custom/agent-ownership.md` `§ 에이전트 간 소통 (_AGENT_COMMS)`
- 이 파일은 Codex 전용 적용 범위만 명시한다. 정본과 충돌하면 정본을 우선한다.

## Codex 인박스

- Codex 수신함: `../../_AGENT_COMMS/to_codex/`
- Codex 발신함: `../../_AGENT_COMMS/to_claude/`
- `to_claude/`는 Codex가 보낸 요청의 응답·archive 상태 확인 또는 사용자가 명시한 경우에만 본다.
- `threads/`는 사용자가 명시하거나, 같은 주제가 3회 이상 왕복될 때만 사용한다.

## 세션 시작 스캔

1. `to_codex/`의 모든 `.md` frontmatter를 확인한다.
2. `status`, `from`, `to`, `created`, `updated`를 기준으로 `open`, `in-progress`, `resolved`, `archived`를 분류한다.
3. 파일이 3건 이상이거나 git pull 직후라면 추정 보고 금지. frontmatter 일괄 확인 후 분류한다.
4. `open` 또는 `in-progress`가 있으면 사용자에게 목록만 보고한다.
5. 사용자가 "처리해", "읽어봐", "확인해"처럼 명시하기 전에는 큐 내용을 실행하지 않는다.

## 분류 원칙

- `from != codex` + `to: codex` + `status: open`: Codex 신규 작업 큐
- `from: codex` + `to: codex`: Codex self-memo
- 파일명 끝 `_완료.md` + `status: open`: 완료 트리거
- `from: user` 또는 외부 발신: 사용자 메시지 큐
- `status: resolved` 또는 `archived`: 미처리 큐로 보고하지 않는다.

## 처리 원칙

- 처리 시작 시 원본 파일의 `status`를 `in-progress`로 바꾸고 `updated`를 갱신한다.
- 답변은 같은 파일 하단의 `## 응답` 섹션에 추가한다.
- 완료 시 `status: resolved`로 바꾼다.
- 의존 작업 완료 보고가 필요한 경우 `to_claude/`에 완료 트리거 파일을 새로 만든다.

## 금지

- frontmatter 확인 없이 "큐잉됨"으로 추정 보고하지 않는다.
- `resolved` 또는 `archived` 파일을 신규 작업처럼 취급하지 않는다.
- `_AGENT_COMMS/`에 콘텐츠 노트, 도메인 지식, 계획서를 저장하지 않는다.
- token, API key 등 민감값을 평문으로 쓰지 않는다.

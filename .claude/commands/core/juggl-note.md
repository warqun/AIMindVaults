# /juggl-note — Juggl 포함 표준 노트 생성

> 멀티볼트: 대상 볼트를 인자에 포함하거나, 현재 작업 중인 볼트에 생성.

목표: $ARGUMENTS

아래 순서로 실행:

1) 대상 볼트 결정 + 제목/위치 결정
- 볼트가 명시되지 않으면 현재 작업 중인 볼트 사용.
- 제목이 없으면 사용자 입력에서 핵심 명사구로 제목 1개를 만든다.
- 위치는 기본 `{볼트경로}/Contents/Domain/temp/`로 하되, 사용자가 경로를 주면 해당 경로 사용.

2) 노트 생성
- 파일명: `[Title].md`
- Frontmatter 기본값:
```yaml
---
tags:
  - AIMindVault
  - [DomainTag]
type: note
updated: YYYY-MM-DD
agent: claude
---
```

3) 본문 골격 작성
- H1 제목 1개
- 제목 바로 아래 Juggl 임베드:
```juggl
local: [Title]
```
- 섹션:
  - `## Context`
  - `## Key Points`
  - `## Decision / Action`
  - `## Links`

4) 링크 처리 규칙
- 관련 노트 1~3개를 `[[WikiLink]]`로 추가
- 확실하지 않은 링크는 빈칸으로 남기지 말고 "추후 연결" 한 줄 메모를 둔다

5) 템플릿 우선 규칙
- 가능하면 `{볼트경로}/_Standards/NoteTemplates/TEMPLATE_JugglNote.md`를 우선 사용한다.

6) 종료 안내
- 생성 경로를 사용자에게 1줄로 보고
- 필요 시 `/note-link` 사용을 안내

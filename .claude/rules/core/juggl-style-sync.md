# Juggl Style Sync (Mandatory)

> 모든 볼트에 동일 적용.

## 규칙

- Juggl 스타일(모양/색/강조) 변경 시 graph.css와 스타일 가이드(README.md, README_KR.md)를 동시에 갱신한다.
- 예시 노트는 `Juggl_StyleGuide/Examples/**` 전용으로 유지한다.

## Juggl 작성 규칙

- 일반 노트는 제목 바로 아래에 Juggl 임베드를 넣는다.
- 형식:
```juggl
local: 파일명_without_extension
```
- `local:` 값은 **파일명** (확장자 제외)을 사용한다. H1 헤더 제목이 아니다.
  - 올바른 예: `local: 20260317_Obsidian_AI_Platform` (파일명)
  - 잘못된 예: `local: Obsidian AI Platform — 에이전트 팀 구성 플랫폼` (H1 제목)
- 예외: `_STATUS.md`, `_VAULT-INDEX.md`, `.claude/commands/*`, `.claude/rules/*`.

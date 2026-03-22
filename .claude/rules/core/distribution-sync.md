# 배포 동기화 (Mandatory)

> 모든 볼트에 동일 적용.

## 규칙

- 공통 규칙(`.claude/rules/`), 공통 스킬(`.claude/commands/`), 워크스페이스(`_Standards/`, `_tools/`, `Juggl_StyleGuide/`) 변경 시 배포 반영 대상인지 확인한다.
- 배포 반영 대상 변경 완료 시, `AIHubVault/Contents/Project/plan/AIMindVaults_plan/20260317_배포_동기화_규칙.md` 하단 변경 로그에 기록한다.
- 실제 배포 동기화는 Antigravity가 `sync-distribution` 워크플로우로 수행한다. Claude Code가 직접 배포 경로에 접근하지 않는다.
- `Contents/` 내 개인 노트, 추가 볼트(Unity, VamSurLike 등), `.obsidian/` 설정은 배포 대상이 아니다.

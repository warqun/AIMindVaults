# 멀티볼트 개인화 (Custom)

> 이 멀티볼트의 Custom 영역 workspace 설정을 돕는 규칙.
> 배포 동기화 대상이 아님 — 사용자마다 다른 설정.

## 에이전트 구성

- 사용할 에이전트를 결정하고, 해당 에이전트의 진입점 파일만 볼트에 배치한다.
  - Claude Code → `CLAUDE.md`
  - Codex → `CODEX.md`
  - 기타 → 해당 에이전트 규격에 맞는 진입점
- 사용하지 않는 에이전트의 진입점 파일은 생성하지 않는다.

## Custom 플러그인 선택

- Hub(AIHubVault)에 설치된 Custom 플러그인 중 사용할 것을 선택한다.
- 불필요한 Custom 플러그인은 볼트별 override로 제외 가능.
- Core 플러그인(local-rest-api, dataview, templater, linter)은 제외 불가.

## Custom 스킬/규칙

- 루트 `.claude/commands/custom/`에 개인 스킬을 추가할 수 있다.
- 루트 `.claude/rules/custom/`에 개인 규칙을 추가할 수 있다 (이 파일 포함).
- custom/ 내용은 배포 동기화 대상이 아니므로 자유롭게 관리.

## 볼트 레지스트리 커스터마이징

- `_STATUS.md` 볼트 레지스트리에서 자신의 볼트 구성을 관리한다.
- 불필요한 볼트는 비활성화(dormant) 처리.
- 새 도메인/프로젝트에 맞는 볼트를 자유롭게 추가.

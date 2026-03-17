# 편집 모드 분리 (Mandatory)

> 모든 볼트에 동일 적용.

## 규칙

- 모든 편집은 `[Contents]` 모드 또는 `[workspace]` 모드 중 하나로 수행한다.
- `[Contents]` 모드: `Contents/**` 콘텐츠만 수정 가능. `_Standards/`, `_tools/`, `.codex/`, `.claude/`, 볼트 루트 파일 수정 금지.
- `[workspace]` 모드: `_Standards/`, `_tools/`, `.codex/`, `.claude/`, 볼트 루트만 수정 가능. `Contents/**` 수정 금지.
- Contents 모드 내부: `[Contents/Domain]`(지식 축적) 또는 `[Contents/Project]`(작업 관리)로 분기 선언.
- 모드 전환 시 명시적 선언 필수. 한 작업 안에서 두 모드 혼합 금지.

## [workspace] 모드 — AIHubVault 전용 (강제)

- **workspace 편집은 AIHubVault에서만 수행한다.** 다른 볼트의 workspace 파일은 `sync_workspace.ps1`로 자동 전파된다.
- workspace 파일 수정 후 반드시 AIHubVault의 `_WORKSPACE_VERSION.md`에 버전을 기록한다.

1. 당일 최대 버전 번호 확인 → +1로 새 버전 생성 (형식: `YYYYMMDDNNNN`)
2. 변경 내용을 테이블 최상단에 추가

**버전 기록 없이 workspace 작업을 완료 보고하지 않는다.**

## 루트 레벨 편집 — 버전 기록 (강제)

- 멀티볼트 루트(`.claude/`, `.antigravity/`, 루트 설정 파일 등) 변경 시 반드시 `_ROOT_VERSION.md`에 버전을 기록한다.
- 버전 형식: `R` + 순번 3자리 (예: `R001`, `R002`)
- 변경 내용을 테이블 최상단에 추가한다.

**버전 기록 없이 루트 레벨 편집을 완료 보고하지 않는다.**

## 참조

- 상세 규칙: 각 볼트의 `_WORKFLOW.md` § 5) 편집 모드 분리

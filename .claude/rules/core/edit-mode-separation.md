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
- **Obsidian 플러그인 설치/설정도 workspace 편집이다.** `.obsidian/plugins/` 변경은 AIHubVault에서 수행 → 동기화로 전파한다. 개별 볼트에 직접 플러그인을 설치하지 않는다.
- workspace 파일을 수정하면 **즉시** AIHubVault의 `_WORKSPACE_VERSION.md`에 버전을 기록한다. 테스트·배포·후속 작업보다 버전 기록이 먼저다.

**workspace 편집 순서 (강제):**
1. 파일 수정
2. **즉시** `_WORKSPACE_VERSION.md`에 버전 기록 (당일 최대 번호 +1, 형식: `YYYYMMDDNNNN`)
3. 그 다음 테스트·배포·동기화 등 후속 작업 진행

**버전 기록 없이 다음 단계로 넘어가지 않는다.**

## 루트 레벨 편집 — 버전 기록 (강제)

- 멀티볼트 루트(`.claude/`, `.antigravity/`, 루트 설정 파일 등) 변경 시 반드시 `_ROOT_VERSION.md`에 버전을 기록한다.
- 버전 형식: `R` + 순번 3자리 (예: `R001`, `R002`)
- 변경 내용을 테이블 최상단에 추가한다.

**버전 기록 없이 루트 레벨 편집을 완료 보고하지 않는다.**

## 참조

- 상세 규칙: 각 볼트의 `_WORKFLOW.md` § 5) 편집 모드 분리

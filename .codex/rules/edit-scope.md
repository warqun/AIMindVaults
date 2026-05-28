# Codex Root Edit Scope

> Root `.codex` defines the boundary between hub work and vault work.

## Root Scope

- Allowed direct root edits: `CODEX.md`, `.codex/`, `CLAUDE.md`, `.claude/`, `docs/`
- Do not edit files inside `Vaults/**` until the target vault is selected

## Vault Scope

- After entering a vault, follow that vault's `_WORKFLOW.md` and `.codex/CODEX.md`
- Do not treat root routing rules as a replacement for vault-local rules
- Keep root hub edits and vault edits logically separated in the same task

## [workspace] 모드 — Multi-Hub 정본 우선 (강제)

- workspace 편집 전 파일을 정본(source of truth), 전파본(synced copy), 생성물(generated/install artifact)로 분류한다.
- Core 계층(`.sync/_tools/`, `.sync/_Standards/Core/`, `.sync/schemas/`, Core 플러그인)은 CoreHub 정본에서 수정한다.
- Custom/Preset 계층은 해당 Preset Hub에서 수정한다.
- 루트 공통 규칙과 스킬은 AIMindVaults 루트에서 수정한다.
- 전파본과 생성물은 직접 편집하지 않는다. 정본·템플릿·installer/sync 로직을 고치고 재생성한다.
- 동기화 구조에서 편집·검증·재생성이 가장 쉬운 위치와 방식을 우선 선택한다.
- 이 원칙을 위반하는 편이 더 이득이라고 판단되면, 이유·영향 범위·대안을 사용자에게 먼저 보고하고 확인을 받는다.

1. 정본 위치를 확인한다.
2. 정본 또는 생성 로직을 수정한다.
3. 필요한 버전 신호를 기록한다.
   - CoreHub: `bump-version --broadcast`
   - Preset Hub: 해당 `_WORKSPACE_VERSION.md` bump
   - 루트: `_ROOT_VERSION.md` R번호 추가
4. 최종 설치 위치, 삭제되어야 하는 옛 파일, idempotent 재실행을 검증한다.

**버전 기록과 최종 위치 검증 없이 workspace 작업을 완료 보고하지 않는다.**

## 세션 종료 시 상태 갱신 (강제)

1. **`_STATUS.md` 갱신 (필수)**: 볼트 `_STATUS.md`를 직접 갱신 (Now/Next/Blocked/Decisions). `_STATUS.md` 갱신 없이 세션을 종료하지 않는다.
2. **루트 `_STATUS.md` 갱신 (필수)**: 루트 `_STATUS.md`의 해당 볼트 섹션 갱신.
3. **AGENT_STATUS 갱신 (권장)**: `.codex/AGENT_STATUS.md` — 복잡한 작업이나 맥락 전달 필요 시 갱신. 단순 작업이면 생략 가능.

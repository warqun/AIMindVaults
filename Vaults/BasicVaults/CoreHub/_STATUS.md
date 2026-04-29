---
type: status
tags:
  - CoreHub
  - Multi-Hub
agent: codex
updated: 2026-04-25
last_session: codex / 2026-04-25 (Sync This Vault 런처 .sync 내부 이동 · 40볼트 재검증)
---

# CoreHub 상태

> Multi-Hub 아키텍처의 Core Hub. Core 계층 정본 관리.

## Now

- 수동 sync 런처 `.sync/` 내부 이동 완료 (2026-04-25)
  - 볼트 루트 `Sync This Vault.bat/.command/.sh` 제거, `<vault>/.sync/Sync This Vault.*` 로 재설치
  - `install-launchers`/`sync-all`/`sync-workspace` 가 Hub 템플릿 기준으로 설치하도록 보강하여 stale 로컬 템플릿 재사용 방지
  - 6 Preset Hub `_WORKSPACE_VERSION.md` 수동 bump 후 전체 40볼트 sync 재검증 성공
- 수동 sync 런처 도입 (2026-04-24)
  - CoreHub CLI `sync-all` 명령 추가: AIMindVaults 루트의 모든 cli-node 보유 볼트 순회, `node_modules` 누락 시 `npm install --no-audit --no-fund`, `pre-sync`, 루트 `sync.log` append, 성공/실패 요약
  - CoreHub CLI `install-launchers` 명령 추가: 루트 `Sync All Vaults.*`, 볼트별 `Sync This Vault.*` 설치
  - `.sync/_tools/launchers/` 템플릿 추가: Windows `.bat`, macOS `.command`, Linux `.sh`
  - `sync-workspace` PULL/VERIFY/PLUGIN_ONLY 이후 볼트 루트 런처 자동 설치 연결
- Multi-Hub Phase 1 MVP 구현 완료 (hub-resolver, create-hub, core-sync-all, bump-version, clone --hub, schemas)
- CoreHub 볼트 초기화 완료 (2026-04-20)

## Next

- `/register-vaults` 및 `Setup New Device.*` 후속 Phase 와 연결
- 배포 동기화 시 SellingVault Korean/English 에 루트 런처와 BasicVaults 템플릿 반영

## Blocked

- 없음

## Decisions

- (2026-04-25) `Sync This Vault.*` 는 볼트 루트가 아니라 `<vault>/.sync/` 내부에 설치한다. 로그도 `<vault>/.sync/sync.log` 에 append한다
- (2026-04-25) 런처 설치는 가능하면 Hub 템플릿을 기준으로 수행한다. 위성 로컬 템플릿이 stale 인 상태에서 기존 런처를 되살리는 일을 막기 위함이다
- (2026-04-24) 수동 sync 런처는 CoreHub `.sync/_tools/launchers/` 템플릿을 정본으로 두고, 루트 파일 및 볼트별 `.sync/` 파일은 `install-launchers` 및 `sync-workspace` 후처리로 설치한다
- (2026-04-24) 전체 sync 런처는 Node.js 외 의존성을 추가하지 않으며, PowerShell 호출 없이 `node`/`npm`/플랫폼 셸만 사용한다
- (2026-04-24) 배포 대상에는 루트 `Sync All Vaults.*`와 BasicVaults 내 CoreHub CLI/템플릿을 포함하는 것이 맞다. 실제 SellingVault 반영은 별도 배포 작업에서 수행한다
- (2026-04-20) Core 계층은 `.sync/_tools/` · `.sync/_Standards/Core/` · `.sync/schemas/` · Core 6 플러그인으로 제한. `.claude/rules/core/` · `.claude/commands/core/` 는 AIMindVaults 루트 유지 (CWD ancestry 로 자동 상속)
- (2026-04-20) Core Hub 는 직접 위성 갖지 않음. 위성은 Preset Hub 에 바인딩

## 참조

- CLAUDE.md — 이 볼트 역할·규칙
- 설계 문서: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`

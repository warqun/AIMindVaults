---
type: status
tags:
  - CoreHub
  - Multi-Hub
agent: claude
updated: 2026-04-20
last_session: claude / 2026-04-20 (CoreHub 초기화 · Multi-Hub Phase 1)
---

# CoreHub 상태

> Multi-Hub 아키텍처의 Core Hub. Core 계층 정본 관리.

## Now

- Multi-Hub Phase 1 MVP 구현 완료 (hub-resolver, create-hub, core-sync-all, bump-version, clone --hub, schemas)
- CoreHub 볼트 초기화 완료 (2026-04-20)
- AIHubVault → Preset "default" 로 승격 예정

## Next

- AIHubVault 에 `hub-marker.json` (preset, default, coreHub=../CoreHub) 작성
- `core-sync-all --dry-run` 으로 AIHubVault 가 Preset 으로 인식되는지 검증
- _skill-router.md 에 Multi-Hub 트리거 추가
- 28 satellite 에 대한 영향 점검

## Blocked

- 없음

## Decisions

- (2026-04-20) Core 계층은 `.sync/_tools/` · `.sync/_Standards/Core/` · `.sync/schemas/` · Core 6 플러그인으로 제한. `.claude/rules/core/` · `.claude/commands/core/` 는 AIMindVaults 루트 유지 (CWD ancestry 로 자동 상속)
- (2026-04-20) Core Hub 는 직접 위성 갖지 않음. 위성은 Preset Hub 에 바인딩

## 참조

- CLAUDE.md — 이 볼트 역할·규칙
- 설계 문서: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`

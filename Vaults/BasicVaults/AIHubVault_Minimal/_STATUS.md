---
type: status
tags:
  - AIHubVault_Minimal
  - PresetHub
  - Multi-Hub
agent: claude
updated: 2026-04-20
last_session: claude / 2026-04-20 (AIHubVault_Minimal 초기 생성 · Multi-Hub Phase 1 T7)
---

# AIHubVault_Minimal 상태

> Minimal Preset Hub. Core 6 플러그인만 · Custom 없음. 현재 바인딩된 위성 없음.

## Now

- AIHubVault_Minimal 초기 상태 — `create-hub -t ... --hub-id minimal` 로 CoreHub 에서 파생 생성 완료 (2026-04-20)
- hub-marker.json 작성됨 (hubType=preset, hubId=minimal, coreHub=../CoreHub)
- Core 6 플러그인 유지 · Custom 계층 없음

## Next

- 바인딩할 위성 있을 때 `aimv clone --hub AIHubVault_Minimal` 또는 기존 위성의 `hub-source.json` 수정
- Custom 오버레이 필요 시 이 볼트의 `.obsidian/plugins/` 등에 추가 후 bump-version

## Blocked

- 없음

## Decisions

- (2026-04-20) Minimal Preset 으로 초기 생성 · Core 6 유지 · Custom 비움 (사용자가 필요시 추가)

## 참조

- CLAUDE.md — 이 볼트 역할·규칙
- 설계 문서: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`

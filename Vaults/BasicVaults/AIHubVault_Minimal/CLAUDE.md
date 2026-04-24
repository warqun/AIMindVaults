---
type: vault-entry
tags:
  - AIHubVault_Minimal
  - PresetHub
  - Multi-Hub
  - Minimal
agent: claude
created: 2026-04-20
updated: 2026-04-20
---

# AIHubVault_Minimal — Minimal Preset Hub

> Multi-Hub 아키텍처의 **Minimal Preset Hub**. Core 계층만 포함된 최소 Preset · Custom 번들 없음.

## 이 볼트의 역할

**hubId="minimal"**, **hubType="preset"**, **coreHub="../CoreHub"**.

Core 6 플러그인 (`obsidian-local-rest-api`, `obsidian-advanced-uri`, `obsidian-shellcommands`, `dataview`, `templater-obsidian`, `obsidian-linter`) 만 포함. 사용자가 Custom 오버레이 (플러그인·규칙·스킬) 를 직접 추가하여 가벼운 작업 환경 구축 가능.

## Multi-Hub 계층

| Hub | 경로 | 역할 |
|-----|------|------|
| **CoreHub** | `../CoreHub/` | Core 계층 정본 (CLI, 표준, 스키마, Core 6 플러그인) · `core-sync-all` 로 이 볼트에 전파 |
| **AIHubVault_Minimal** (이 볼트) | `./` | Core 수신 · Custom 없음 |
| AIHubVault (Default Preset) | `../AIHubVault/` | Core + Custom A 번들 · 27 위성 바인딩 중 |

## Core 편집은 CoreHub 에서만

`.sync/_tools/`, `.sync/_Standards/Core/`, `.sync/schemas/`, Core 6 플러그인 편집 금지. CoreHub 에서 `bump-version --broadcast` 로 자동 수신.

## 이 볼트에 Custom 추가하려면

- `.obsidian/plugins/` 에 Custom 플러그인 설치
- `.claude/rules/custom/` · `.claude/commands/custom/` 에 개인 규칙·스킬 추가 (볼트 내부 사용 시)
- 추가 후 이 볼트의 `_WORKSPACE_VERSION.md` 에 bump-version 기록

## 위성 바인딩

위성 볼트가 Minimal Preset 에 바인딩하려면 자기 `.sync/hub-source.json` 에:

```json
{
  "hubPath": "../../BasicVaults/AIHubVault_Minimal",
  "hubId": "minimal",
  "bindAt": "2026-04-20"
}
```

또는 `aimv clone --hub <Minimal 경로>` 로 생성 시 자동 작성.

## 참조

- 설계 문서: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`
- 구현 결과: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260420_Multi_Hub_Phase1_구현_결과.md`
- Core Hub: `../CoreHub/`

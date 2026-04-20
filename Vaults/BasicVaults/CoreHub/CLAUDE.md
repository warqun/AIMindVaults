---
type: vault-entry
tags:
  - CoreHub
  - Multi-Hub
  - Core
agent: claude
created: 2026-04-20
updated: 2026-04-20
---

# CoreHub — AIMindVaults Core 계층 정본 허브

> Multi-Hub 아키텍처의 **Core Hub**. Core 계층 (CLI, _Standards/Core, schemas, Core 6 플러그인) 의 유일 정본. `core-sync-all` 로 모든 Preset Hub 에 Push 전파.

## 이 볼트의 역할

- **Core CLI (`.sync/_tools/cli-node/`)** — 멀티볼트 전체 CLI 도구 정본
- **Core 표준 (`.sync/_Standards/Core/`)** — Core 운영 표준 문서
- **Multi-Hub 스키마 (`.sync/schemas/`)** — `hub-marker.json` · `hub-source.json` JSON Schema draft-07
- **Core 6 플러그인** — `.obsidian/plugins/` 에 `obsidian-local-rest-api`, `obsidian-advanced-uri`, `obsidian-shellcommands`, `dataview`, `templater-obsidian`, `obsidian-linter` 만 포함

## Core 계층 경계 (CORE_PATHS)

`core-sync-all` 전파 대상 (Hub 볼트 상대 경로):

```
.sync/_tools/
.sync/_Standards/Core/
.sync/schemas/
.obsidian/plugins/{Core 6 플러그인}
```

## Core 계층 밖 (전송 대상 아님)

- `.claude/rules/core/` · `.claude/commands/core/` — **AIMindVaults 루트** 에 상주. Claude Code CWD ancestry 로 모든 볼트에 자동 상속. `deploy` 명령으로 SellingVault 배포.

## 운영 규칙

### Core 편집 → 자동 전파 (D1 강제)

Core 계층 편집 후 반드시:

```bash
node .sync/_tools/cli-node/bin/cli.js bump-version -m "변경 내용" --broadcast
```

`--broadcast` 가 `core-sync-all` 을 자동 체인 → 모든 Preset Hub 에 Push.

### Custom 계층 금지

이 볼트에는 **Custom 플러그인/규칙 추가 금지**. Custom 은 Preset Hub 에서 관리. CoreHub 에 Custom 이 섞이면 모든 Preset 으로 의도치 않게 전파됨.

### 위성 없음

Core Hub 는 직접 위성을 갖지 않는다. 위성은 Preset Hub (예: AIHubVault — hubId="default") 에 바인딩.

## 참조

- 설계 문서: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`
- Preset Hub: `../AIHubVault/` (hubId="default")
- 스키마: `.sync/schemas/` README 참조

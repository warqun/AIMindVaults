---
type: vault-entry
tags:
  - AIHubVault_Project
  - PresetHub
  - Multi-Hub
agent: claude
created: 2026-04-20
updated: 2026-04-20
---

# Project Preset Hub — Preset Hub

> Multi-Hub 아키텍처의 **Preset Hub**. `hubId="project"`, `coreHub="../CoreHub"`.

## 이 볼트의 역할

PARA 기반 프로젝트 실행 Preset — Core 6 + Custom 5 (tasks-plugin, metadata-menu, mermaid-tools, obsidian-git, mcp-tools). 9 타입 (idea/plan/spec/design/task/decision/issue/report/retro). 대상: Projects_Game, Projects_Infra.

## Core 편집은 Core Hub 에서만

`.sync/_tools/`, `.sync/_Standards/Core/`, `.sync/schemas/`, Core 6 플러그인 편집 금지. Core Hub (`../CoreHub`) 에서 `bump-version --broadcast` 로 자동 수신.

## 이 볼트에서 편집 가능한 것 (Custom 계층)

- `.obsidian/plugins/` 에 Custom 플러그인 설치
- `.claude/rules/custom/` · `.claude/commands/custom/` 에 개인 규칙·스킬 (볼트 내부 사용 시)
- 편집 후 이 볼트의 `_WORKSPACE_VERSION.md` 에 bump-version 기록

## 위성 바인딩

위성 볼트가 이 Preset 에 바인딩하려면 자기 `.sync/hub-source.json` 에:

```json
{
  "hubPath": "<상대경로 to AIHubVault_Project>",
  "hubId": "project",
  "bindAt": "2026-04-20"
}
```

또는 `aimv clone --hub <이 볼트 경로>` 로 생성.

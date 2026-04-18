---
type: reference
tags:
  - AIMindVault
  - Meta
updated: 2026-03-15
---

# AIMindVaults 핵심 개념

> 멀티볼트 시스템을 처음 접하는 사용자를 위한 핵심 개념 안내.

---

## 1. Hub & Spoke — 단일 원본 구조

```
        ┌─────────────────┐
        │   AIHubVault     │
        │  (Single Source   │
        │   of Truth)      │
        └────────┬────────┘
                 │ workspace 파일 배포
        ┌────────┴────────┐
        │                  │
   ┌────▼─────┐     ┌─────▼────┐
   │ Contents  │     │  Other   │
   │  Vault    │     │  Vault   │
   │ (받기만)   │     │ (받기만)  │
   └──────────┘     └──────────┘
```

- **AIHubVault**가 유일한 원본(Hub). `_Standards/Core/`, `_tools/`, `_WORKFLOW.md` 등 workspace 파일은 여기서만 편집.
- 다른 볼트(Spoke)는 이 파일들을 받기만 한다. 직접 수정하면 다음 동기화 시 덮어씌워짐.
- Hub 식별 마커: `.sync/.hub_marker` 파일 (AIHubVault에만 존재).

---

## 2. Hub-Sync — 자동 동기화

```
  Obsidian에서 볼트 열기
         │
         ▼
  Shell Commands 플러그인
  (on-layout-ready 이벤트)
         │
         ▼
  sync_workspace.ps1 실행
         │
         ▼
  _WORKSPACE_VERSION.md 비교
         │
    ┌────┴────┐
    │ 같음     │ 다름
    │          │
    ▼          ▼
  SKIP      Batch 동기화
            (Hub → 이 볼트)
```

- 볼트를 열 때마다 자동으로 Hub와 버전을 비교.
- 차이가 있으면 4단계 Batch로 동기화:
  1. Guides (`Juggl_StyleGuide/`)
  2. Rules & Standards (`_Standards/Core/`, `_WORKFLOW.md`, `_VAULT-INDEX.md`) — 실패 시 3단계 중단
  3. Scripts (`_tools/`)
  4. Version Record (`_WORKSPACE_VERSION.md`)
- 동기화 대상 목록: `_Standards/Core/Hub_Sync_Targets.md`
- **명시된 것만 동기화. 나머지는 볼트 고유.**

---

## 3. 편집 모드 분리

```
  ┌─────────────────────────────────────────┐
  │              볼트 내부                    │
  │                                          │
  │  ┌──────────────┐  ┌──────────────────┐ │
  │  │ [Contents]   │  │ [workspace]      │ │
  │  │              │  │                  │ │
  │  │ Contents/    │  │ _Standards/      │ │
  │  │  ├ Domain/   │  │ _tools/          │ │
  │  │  └ Project/  │  │ _WORKFLOW.md     │ │
  │  │              │  │ .claude/         │ │
  │  │ 지식·작업     │  │ 규칙·도구·설정    │ │
  │  └──────────────┘  └──────────────────┘ │
  │                                          │
  │     ❌ 한 작업에서 두 모드 혼합 금지       │
  └─────────────────────────────────────────┘
```

- **Contents 모드**: `Contents/**`만 수정. 지식 축적, 작업 관리.
- **Workspace 모드**: `_Standards/`, `_tools/`, `.claude/` 등만 수정. 규칙·도구 관리.
- 한 작업 안에서 두 모드를 섞지 않는다. 전환 시 명시적으로 선언.

---

## 4. 볼트 라우팅

```
  에이전트 세션 시작
         │
         ▼
  루트 진입점 읽기
  (CLAUDE.md / CODEX.md)
         │
         ▼
  대상 볼트 식별
  (명시 지정 / 키워드 추론 / 사용자 확인)
         │
         ▼
  볼트 진입 프로토콜
  ┌──────────────────┐
  │ 1. 볼트 CLAUDE.md │
  │ 2. 볼트 _STATUS.md│
  │ 3. 작업 시작       │
  └──────────────────┘
```

- AI 에이전트는 **멀티볼트 루트(`AIMindVaults/`)에서 시작**.
- 루트의 라우팅 허브(`CLAUDE.md`, `CODEX.md`)가 볼트 레지스트리를 제공.
- 사용자의 요청에서 대상 볼트를 판별하고, 해당 볼트의 규칙 파일을 읽은 후 작업 시작.

---

## 5. Sync Targets — 명시 대상만 동기화

```
  AIHubVault (Hub)
  ┌────────────────────────────────────┐
  │                                    │
  │  동기화됨 (Spoke로 전파)            │
  │  ├── Juggl_StyleGuide/             │
  │  ├── _Standards/Core/              │
  │  ├── _WORKFLOW.md                  │
  │  ├── _VAULT-INDEX.md               │
  │  ├── _tools/                       │
  │  └── _WORKSPACE_VERSION.md         │
  │                                    │
  │  동기화 안 됨 (Hub 전용)            │
  │  ├── Contents/          ← 볼트 고유 │
  │  ├── _Standards/Contents/← 볼트 고유│
  │  ├── .claude/           ← 볼트 고유 │
  │  ├── .antigravity/      ← 볼트 고유 │
  │  └── ...                           │
  └────────────────────────────────────┘
```

- `Hub_Sync_Targets.md`에 명시된 파일/폴더**만** 동기화.
- 목록에 없는 것은 전부 볼트 고유 — 동기화되지 않음.

---

## 6. 멀티 에이전트 — 상태 공유로 충돌 방지

```
  ┌──────────┐  ┌──────────┐  ┌──────────────┐
  │ Claude   │  │  Codex   │  │ Antigravity  │
  │  Code    │  │          │  │              │
  └────┬─────┘  └────┬─────┘  └──────┬───────┘
       │              │               │
       │   각자 상태 파일 갱신          │
       │              │               │
       ▼              ▼               ▼
  ┌─────────────────────────────────────────┐
  │           볼트 내부 상태 파일              │
  │                                          │
  │  _STATUS.md          ← 통합 현황          │
  │  .claude/AGENT_STATUS.md  ← Claude 전용   │
  │  .codex/AGENT_STATUS.md   ← Codex 전용    │
  │  .antigravity/SESSION_RULES.md ← AG 전용  │
  └─────────────────────────────────────────┘
```

- 여러 AI 에이전트가 같은 볼트에서 작업할 수 있음.
- 각 에이전트는 세션 종료 시 자기 상태 파일(`AGENT_STATUS.md`)을 갱신.
- `_STATUS.md`는 통합 현황. 다른 에이전트의 마지막 작업을 확인하고 충돌 방지.
- 세션 시작 시 `_STATUS.md`를 먼저 읽어 현재 상황을 파악한 후 작업 시작.

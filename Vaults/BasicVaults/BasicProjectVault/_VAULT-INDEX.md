---
aliases:
  - "Vault 인덱스"
  - "Project Preset 템플릿 지도"
tags: [BasicProjectVault, Template, Multi-Hub, Project, PARA, Meta]
type: _VAULT-INDEX
updated: 2026-04-22
agent: claude
---

# _VAULT-INDEX — BasicProjectVault 작업환경 인덱스

> Project Preset Hub 클론 소스 템플릿의 구조 지도.
> 멀티볼트 루트 진입점은 루트 `CLAUDE.md` 또는 `CODEX.md`.

## 1. 볼트 루트 구조

```
BasicProjectVault/
├── CLAUDE.md              ← Claude 진입점 (Project Preset 규칙)
├── CODEX.md               ← Codex 진입점
├── _STATUS.md             ← 볼트 상태 허브
├── _VAULT-INDEX.md        ← 이 파일
├── _WORKSPACE_VERSION.md  ← 작업환경 버전 추적
├── Dashboard.md           ← Dataview 대시보드 (Now/Next/Blocked/Decisions)
├── README.md              ← 볼트 한줄 소개
├── _Templates/            ← Templater 9 종 (idea·plan·spec·design·task·decision·issue·report·retro)
├── _Standards/            ← 볼트 일관성 기준 (Hub 동기화)
├── Tags/                  ← 태그 규칙 (TAGS.md · TAG_MASK.md)
├── Contents/              ← 프로젝트 실행 콘텐츠 (PARA + 9 타입)
├── .sync/                 ← Hub-Sync 워크스페이스
├── .obsidian/             ← Obsidian 설정 (Core 6 + Custom 5)
├── .claude/               ← Claude 설정 (rules, commands)
└── .codex/                ← Codex 설정
```

## 2. Contents/ 구조 (PARA + 9 타입)

| 경로 | 용도 | Dataview FROM |
|------|------|---------------|
| `Projects/` | PARA: 활성 프로젝트 | - |
| `Areas/` | PARA: 지속 영역 | - |
| `Resources/` | PARA: 참고 자료 | - |
| `Archive/` | PARA: 종료·보류 | - |
| `00_Idea/` | idea 타입 | `"00_Idea"` |
| `01_Plan/` | plan 타입 | `"01_Plan"` |
| `02_Spec/` | spec 타입 | `"02_Spec"` |
| `03_Design/` | design 타입 | `"03_Design"` |
| `04_Task/` | task 타입 | `"04_Task"` |
| `05_Decision/` | decision (ADR) | `"05_Decision"` |
| `06_Issue/` | issue 타입 | `"06_Issue"` |
| `07_Report/` | report 타입 | `"07_Report"` |
| `08_Retro/` | retro 타입 | `"08_Retro"` |
| `_AI_Drafts/` | AI 단독 생성 격리 | `"_AI_Drafts"` |
| `_archive/` | 종료 phase 아카이빙 | - |

## 3. _Templates/

| 파일 | 타입 | 폴더 바인딩 (위성에서 설정) |
|------|------|------|
| `idea.md` | idea | `00_Idea/` |
| `plan.md` | plan | `01_Plan/` |
| `spec.md` | spec | `02_Spec/` |
| `design.md` | design | `03_Design/` |
| `task.md` | task | `04_Task/` |
| `decision.md` | decision | `05_Decision/` |
| `issue.md` | issue | `06_Issue/` |
| `report.md` | report | `07_Report/` |
| `retro.md` | retro | `08_Retro/` |

Templater 폴더 바인딩은 Obsidian 설정 (`.obsidian/plugins/templater-obsidian/data.json`) 에서 위성 볼트 복제 후 구성.

## 4. _Standards/ 일관성 기준

> `BasicContentsVault` 로부터 미러링된 Core Standards. Hub 동기화 대상. 상세 항목 목록은 `_Standards/Core/` 하위 참조.

## 5. 참조

- Project Hub 명세: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260421_Project_Hub_명세.md`
- Multi-Hub 설계: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`
- 루트 `_STATUS.md` 볼트 레지스트리

> 이 파일은 BasicProjectVault 고유 인덱스로, Hub 동기화 대상이 아니다 (볼트 개별 파일).

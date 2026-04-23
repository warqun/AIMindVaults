---
aliases:
  - "Vault 인덱스"
  - "ZK 지도"
tags: [Meta, BasicDomainVault, Zettelkasten]
type: folder-index
updated: 2026-04-22
agent: claude
---

# _VAULT-INDEX — Domain Preset 작업환경 지도

> 에이전트가 이 Domain 볼트에서 "무엇이 어디 있는지" 파악하기 위한 맵.
> 콘텐츠는 Zettelkasten (fleeting/literature/permanent/moc/synthesis) 기반.
> Domain Preset 명세: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260421_Domain_Hub_명세.md`.

## 1. Vault 루트 구조

```
{DomainVaultName}/
├── CLAUDE.md              ← 볼트 전용 Claude 진입점 (ZK 규약)
├── CODEX.md               ← 볼트 전용 Codex 진입점
├── _VAULT-INDEX.md         ← 이 파일
├── _STATUS.md              ← 마스터 진행 현황
├── _WORKSPACE_VERSION.md   ← 작업환경 버전 추적
├── Dashboard.md           ← Dataview 대시보드 (fleeting 적체·고아·thin·재활성화)
├── _Templates/            ← Templater ZK 템플릿 5종
├── _Standards/            ← Vault 일관성 기준
├── Tags/                  ← 태그 노트
├── Contents/              ← ZK 콘텐츠 (아래 2절)
├── .obsidian/             ← 플러그인 · 설정
├── .claude/               ← Claude Code 설정
├── .codex/                ← Codex 설정
└── .sync/                 ← 동기화 도구 · 워크플로우
```

## 2. Contents/ — Zettelkasten 구조

| 폴더 | 타입 | 역할 |
|------|------|------|
| `00_Fleeting/` | fleeting | inbox 캡처 · 하루 내 처리 |
| `01_Literature/` | literature | 외부 자료 요약 + 내 해석 |
| `02_Permanent/` | permanent | 원자적 주장 (메인) |
| `03_MOC/` | moc | 개념 지도 허브 |
| `04_Synthesis/` | synthesis | 크로스커팅 통찰 |
| `05_Pattern/` | pattern (선택) | 반복 트렌드 · 도메인별 선택 사용 |
| `_AI_Drafts/` | (격리) | AI 단독 생성 노트 · 재구성 후 상위 폴더로 이동 |
| `_archive/` | (아카이브) | legacy 콘텐츠 · `legacy-YYYY-MM/` 하위로 |
| `_log.md` | 로그 | 주간 append 연대기 |
| `_index.md` | 카탈로그 | 월간 rebuild 마스터 인덱스 |

## 3. _Templates/ — Templater 폴더 바인딩

Templater "Folder Templates" 로 바인딩 (사용자 수동 설정):

| 폴더 | 템플릿 |
|------|--------|
| `Contents/00_Fleeting/` | `_Templates/fleeting.md` |
| `Contents/01_Literature/` | `_Templates/literature.md` |
| `Contents/02_Permanent/` | `_Templates/permanent.md` |
| `Contents/03_MOC/` | `_Templates/moc.md` |
| `Contents/04_Synthesis/` | `_Templates/synthesis.md` |

## 4. 플러그인 (Domain Preset)

- Core 6: local-rest-api · advanced-uri · shellcommands · dataview · templater · linter
- Custom 5 (Domain): quickadd · metadata-menu · juggl · global-search-and-replace · obsidian42-brat

플러그인 바이너리는 Hub rebase 시 AIHubVault_Domain 에서 전파된다 (현재 이 템플릿에 포함된 바이너리는 BasicContentsVault 에서 복사된 것이라 rebase 후 정합화됨).

## 5. _Standards/ 일관성 기준

상세는 `_Standards/Core/` 폴더의 기준 파일들 참조. 이 템플릿은 BasicContentsVault 의 `_Standards/` 를 그대로 상속하며, 복제 후 볼트가 ZK 규약에 맞게 선택적으로 갱신한다.

> 이 파일은 **허브 동기화 대상**입니다. AIHubVault_Domain 이 원본.
> 구조 변경 시 이 파일도 함께 업데이트.

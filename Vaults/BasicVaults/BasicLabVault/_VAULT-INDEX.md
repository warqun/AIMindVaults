---
aliases:
  - "Lab 템플릿 인덱스"
tags:
  - Meta
  - BasicLabVault
  - Lab
type: _VAULT-INDEX
updated: 2026-04-22
agent: claude
---

# _VAULT-INDEX — BasicLabVault 작업환경 인덱스

> Lab Preset 클론 템플릿의 작업환경 지도. 실제 콘텐츠는 복제된 위성에서 관리.

## 1. 루트 구조

```
BasicLabVault/
├── CLAUDE.md             ← 볼트 전용 Claude 진입점 (Lab 규약)
├── CODEX.md              ← 볼트 전용 Codex 진입점
├── AGENTS.md             ← 에이전트 공통 메모
├── README.md             ← 볼트 소개
├── _STATUS.md            ← 상태 (템플릿)
├── _VAULT-INDEX.md       ← 이 파일
├── _WORKSPACE_VERSION.md ← 동기화 버전 추적
├── Dashboard.md          ← Lab Dataview 대시보드
├── _Templates/           ← Templater 9 템플릿 (idea, literature, permanent, moc, experiment, failure-log, plan, report, decision)
├── _Standards/           ← 일관성 기준 (BasicContentsVault 상속)
├── Tags/                 ← 태그 노트
├── Contents/             ← 9 타입 폴더 구조
├── .claude/              ← Claude 설정
├── .codex/               ← Codex 설정
├── .obsidian/            ← Obsidian 설정 + 플러그인 (Hub 동기화 대상)
└── .sync/                ← 동기화 설정
```

## 2. Contents/ 9 타입 폴더

| 폴더 | 타입 | 용도 |
|------|------|------|
| `00_Idea/` | idea | 실험 아이디어 inbox |
| `01_Literature/` | literature | 외부 자료 요약 |
| `02_Permanent/` | permanent | 원자적 주장 · Domain 승격 후보 |
| `03_MOC/` | moc | 도구·영역 지도 |
| `04_Experiment/` | experiment | 가설·시도·결과 (메인) |
| `05_Failure/` | failure-log | 실패 원인·재현·우회 |
| `06_Plan/` | plan | Phase 로드맵 |
| `07_Report/` | report | Phase 결과 보고 |
| `08_Decision/` | decision | ADR |
| `_AI_Drafts/` | (mixed) | AI 단독 생성 격리 |
| `_archive/` | (mixed) | 아카이빙 |

## 3. _Templates/ 템플릿 매핑

| 템플릿 | 폴더 | 타입 |
|--------|------|------|
| `idea.md` | 00_Idea/ | idea |
| `literature.md` | 01_Literature/ | literature |
| `permanent.md` | 02_Permanent/ | permanent |
| `moc.md` | 03_MOC/ | moc |
| `experiment.md` | 04_Experiment/ | experiment |
| `failure-log.md` | 05_Failure/ | failure-log |
| `plan.md` | 06_Plan/ | plan |
| `report.md` | 07_Report/ | report |
| `decision.md` | 08_Decision/ | decision |

## 4. Dashboard.md 쿼리

- Running experiments
- Experiment result distribution (90일)
- Unresolved failures
- 재발 실패 클러스터 (180일)
- Iteration 계보
- Permanent · Domain 승격 후보
- Phase 진행률
- `_AI_Drafts` 모니터링
- 최근 7일 실험 요약

## 참조

- Lab 스펙: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260421_Lab_Hub_명세.md`

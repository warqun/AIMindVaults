---
type: guide
tags: [BasicLabVault, Template, Multi-Hub, Lab, RnD]
agent: claude
updated: 2026-04-22
---

# BasicLabVault — Lab Preset 클론 템플릿

> 이 볼트는 **Lab Preset Hub (AIHubVault_Lab · hubId=lab)** 에 바인딩될 신규 위성을 만들 때 사용되는 **clone 템플릿**이다.
> Hub 가 아니며 실제 콘텐츠 작업 대상도 아니다.
> 사용자가 `Vaults/BasicVaults/MakeCloneVault.bat` 실행 → Lab Hub 선택 → CLI 가 이 볼트를 source 로 복제 → 새 Lab 위성 생성.

## 볼트명이 BasicLabVault인 경우

- **복제 소스 템플릿** — 직접 콘텐츠 작업 금지.
- workspace 변경은 **AIHubVault_Lab** 에서 수행 후 `sync` 로 전파한다.
- 관련 스킬: `/create-vault` (Lab Preset 선택).

## 볼트명이 BasicLabVault가 아닌 경우

이 볼트는 복제 후 아직 초기 설정이 안 된 상태이다. **즉시 아래를 수행한다:**
1. 이 CLAUDE.md의 제목·역할·태그를 실제 Lab 위성 용도에 맞게 수정
2. `_STATUS.md`의 역할 문구도 동일하게 수정
3. 루트 `_STATUS.md` 볼트 레지스트리에 이 볼트 등록 (미등록 시)
4. Lab Preset Hub 경로를 확인하고 첫 `pre-sync` 수행

## Lab Preset 설계 원칙 (요약)

1. **3축 하이브리드** — Iteration (반복 실험) + Knowledge (지식 축적) + Phase (시간·실행).
2. **실험 반복 가능성 (Reproducibility)** — 모든 experiment 는 git commit 기록·재현 조건 명시. `obsidian-git` 필수.
3. **실패는 자산 (Failure as data)** — `failure-log` 를 독립 타입으로 격상.
4. **외부 도구 집약** — Unity MCP · Blender MCP · Meshy. `mcp-tools` · `shellcommands` 필수.
5. **Lab 내부 permanent → Domain 승격** — 일반화된 주장은 해당 Domain 볼트로 이관. Lab 내부 장기 축적 금지.
6. **Domain (ZK) + Project (PARA) 재사용 + Lab 고유 2 타입** — 전체 9 타입.
7. **관계는 본문 inline field** — Frontmatter 에 wikilink list 금지.

## 대상 위성 (총 4개)

- **Lab_Infra**: ObsidianDev
- **Lab_Game**: CombatToolKit · TileMapToolKit
- **Lab_Content**: CookingLab

## 폴더 구조 (Contents/)

```
Contents/
├── 00_Idea/               ← inbox · 24~72h 내 승격
├── 01_Literature/         ← 외부 자료
├── 02_Permanent/          ← 원자적 주장 · Domain 승격 후보
├── 03_MOC/                ← 도구·영역 지도
├── 04_Experiment/         ← 실험 (메인 · iteration 축)
├── 05_Failure/            ← 실패 로그 (Lab 고유)
├── 06_Plan/               ← Phase 로드맵
├── 07_Report/             ← Phase 종료·결과
├── 08_Decision/           ← ADR · 도구 선택
├── _AI_Drafts/            ← AI 단독 생성 격리 (14일 review)
├── _archive/              ← 아카이빙
├── _log.md                ← 연대기
└── _index.md              ← 마스터 카탈로그
```

## 타입 체계 (9 종)

| # | 타입 | 폴더 | 역할 |
|---|------|------|------|
| 1 | `idea` | 00_Idea/ | 실험 아이디어 inbox |
| 2 | `literature` | 01_Literature/ | 외부 자료 요약·인용 |
| 3 | `permanent` | 02_Permanent/ | 원자적 주장 · Domain 승격 후보 |
| 4 | `moc` | 03_MOC/ | 도구·영역 지도 |
| 5 | `experiment` | 04_Experiment/ | 가설·시도·결과·회고 (iteration 단위) · Lab 고유 |
| 6 | `failure-log` | 05_Failure/ | 실패 원인·재현·우회 · Lab 고유 |
| 7 | `plan` | 06_Plan/ | Phase 로드맵 |
| 8 | `report` | 07_Report/ | Phase 종료·결과 |
| 9 | `decision` | 08_Decision/ | ADR · 도구 선택 |

## Frontmatter 공통 7 필드

```yaml
---
id: YYYYMMDDHHmm                  # idea 제외 모든 타입 필수
type: idea|literature|permanent|moc|experiment|failure-log|plan|report|decision
status: draft|active|running|completed|failed|blocked|done|archived
created: YYYY-MM-DD HH:mm
updated: YYYY-MM-DD
tags: [lab]
agent: claude
---
```

타입별 확장 필드 (Lab 스펙 § 6.2 참조):
- `literature`: `source_type`, `author`, `year`
- `experiment`: `hypothesis`, `iteration`, `tools`, `phase`, `result`
- `failure-log`: `severity`, `repro_rate`, `resolved`
- `plan` · `report`: `phase`
- `decision`: `supersedes`

## 실험 루프 규약

1. **아이디어** → `00_Idea/` (idea) · 72h 내 experiment 또는 literature 로 승격
2. **가설 세팅** → `04_Experiment/` (experiment) · `status: running` · iteration 1
3. **실행** → Setup·Execution 섹션에 도구·명령·파라미터 전부 명시 (AI 실행 blackbox 방지)
4. **실패 발생 시** → 즉시 `05_Failure/` (failure-log) 작성 · experiment 의 `caused-failure::` 에 링크
5. **결과 기록** → experiment 의 Result·Learning 채우고 `status: completed` + `result: success|fail|inconclusive`
6. **일반화** → 반복에서 일반 주장 도출 → `02_Permanent/` (permanent) · `generalizes-to::` 에 Domain 후보 표시
7. **Phase 종료** → `07_Report/` (report) 로 정리 · 획득한 permanent 목록 기록
8. **결정** → 도구 선택·접근법 결정 시 `08_Decision/` (decision) · design 대신 decision

## AI 경계

### 허용

- 실험 설계 보조 (가설 명확화, control 변수 제안, iteration 변이 추천)
- 실패 패턴 클러스터링 (여러 failure-log 공통 원인 탐지)
- 관련 literature 자동 추천
- Experiment 자동 실행 (MCP 도구 연동) · 재현 시도 대행
- Weekly digest 초안
- Domain 승격 후보 탐지

### 금지

- 실험 결과 해석 단독 (데이터 요약·통계는 OK · "이것은 X 를 의미한다" 해석은 사람)
- Permanent 의 일반화 주장 AI 단독 작성
- Failure 의 `root_cause` 단정 (증거 제시까지)
- Decision 최종 판단 (options 나열까지)

### 격리

- AI 자동 생성물은 `_AI_Drafts/` 로 수집 · 14일 Lint flag (Domain 30일보다 짧음)
- AI 가 자동 실행한 experiment 는 `agent: claude` 확인 후 사람이 Result·Learning 섹션 채워야 `_AI_Drafts` 밖으로 이동

## 태그 규칙

- 모든 노트에 `lab` 태그 기본 포함.
- 타입별 보조 태그: `idea`, `literature`, `experiment`, `failure`, `moc`, `plan`, `report`, `decision`, `adr`.
- 볼트 식별 태그 불필요 (인덱서 `vault` 필드 사용).

## 템플릿

루트 `_Templates/` 에 9 종 배치 (Templater 폴더 바인딩 권장: 9 폴더 ↔ 9 템플릿 1:1).

## 대시보드

루트 `Dashboard.md` — Running experiments · Unresolved failures · Phase 진행률 · AI_Drafts 모니터링.

## Weekly Lint 체크

- Idea 적체 (72h `draft`)
- Running experiment 14일 초과
- 결과 미기록 experiment (`completed` 인데 Result 비어있음)
- Unresolved failure 30일 초과
- 재발 failure (같은 root_cause 3+ 회 → permanent 승격 고려)
- Domain 승격 후보 (`evergreen` 인데 `generalizes-to` 없음)
- `_AI_Drafts` 14일+ 방치
- Experiment ↔ Failure 링크 누락

## 참조

- Lab 스펙 원본: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260421_Lab_Hub_명세.md`
- Multi-Hub 아키텍처: `20260419_Multi_Hub_아키텍처_설계.md`
- 공통 규칙: AIMindVaults 루트 `.claude/rules/`

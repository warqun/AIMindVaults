---
type: workflow
tags: [BasicProjectVault, Template, Multi-Hub, Project, PARA]
agent: claude
updated: 2026-04-22
---

# BasicProjectVault — Project Preset 클론 템플릿

> 이 볼트는 **AIHubVault_Project (Project Preset Hub)** 에 바인딩될 위성을 만들 때 사용되는 **clone source 템플릿** 이다.
> 직접 콘텐츠 작업 금지. 실제 프로젝트 작업은 복제된 위성 볼트 (Projects_Game · Projects_Infra 하위) 에서 수행한다.
> 사용자가 `Vaults/BasicVaults/MakeCloneVault.bat` 실행 → Project Hub 선택 시 이 볼트가 source 로 지정된다.

## 볼트명이 BasicProjectVault 인 경우

복제 소스 템플릿. 수정 가능한 것은 아래 두 축뿐:
- 템플릿 자체 개선 (폴더 구조, `_Templates/*.md`, `Dashboard.md` 쿼리, CLAUDE.md 본문 등)
- workspace 는 AIHubVault_Project 에서 동기화

콘텐츠 노트 생성 금지. 샘플 노트도 넣지 않는다.

## 볼트명이 BasicProjectVault 가 아닌 경우

복제 후 초기 설정이 안 된 상태. **즉시 아래를 수행한다:**

1. 이 CLAUDE.md 의 "역할" 을 실제 프로젝트 이름·범위로 교체
2. `_STATUS.md` 의 Now/Next/Blocked/Decisions 초기화
3. 루트 `_STATUS.md` 볼트 레지스트리에 이 볼트 등록 (미등록 시)
4. `Contents/_AI_Drafts/` 를 AI 단독 생성 노트 격리 전용으로 유지
5. `Dashboard.md` 는 그대로 두고 Obsidian 에서 빠른 접근 경로로 활용

## 정체성

| 항목 | 값 |
|------|------|
| hubBinding | `AIHubVault_Project` (hubId=`project`, hubType=`preset`) |
| 철학 | PARA (Projects·Areas·Resources·Archive) + ADR (Architecture Decision Record) |
| 축 | 시간·실행 (Domain 은 개념축, Diary 는 일자축) |
| 타입 수 | 9 (idea · plan · spec · design · task · decision · issue · report · retro) |
| 대상 위성 | Projects_Game (JissouGame) · Projects_Infra (Project_AIMindVaults) · 향후 VamSurLike 등 |

## 폴더 구조

```
Contents/
├── Projects/     ← PARA: 활성 프로젝트 (phase 기간 내)
├── Areas/        ← PARA: 지속 영역 (유지 책임)
├── Resources/    ← PARA: 참고 자료
├── Archive/      ← PARA: 종료·보류
├── 00_Idea/      ← 아이디어 inbox · 24~72h 내 승격
├── 01_Plan/      ← 계획·phase 로드맵
├── 02_Spec/      ← 요구사항 명세
├── 03_Design/    ← 설계·아키텍처 (ADR 컨테이너)
├── 04_Task/      ← 실행 단위·체크리스트
├── 05_Decision/  ← ADR · 주요 결정
├── 06_Issue/     ← 버그·장애·제약
├── 07_Report/    ← Phase 종료 보고
├── 08_Retro/     ← 주간·Phase 회고
├── _AI_Drafts/   ← AI 단독 생성 노트 격리 (14일 방치 flag)
└── _archive/     ← 종료된 phase 아카이빙
```

타입별 폴더 (`00_~08_`) 는 Dataview 쿼리와 Templater 폴더 바인딩의 기준점. PARA 폴더는 프로젝트 lifecycle 분류용 (상위 메타).

## 타입 체계 (9 종)

| # | type | 폴더 | 역할 | 주요 확장 필드 |
|---|------|------|------|---------------|
| 1 | `idea` | 00_Idea/ | 아이디어 inbox, 24~72h 내 승격 | - |
| 2 | `plan` | 01_Plan/ | 계획·phase 로드맵 | `phase` |
| 3 | `spec` | 02_Spec/ | 요구사항·성공 기준 | - |
| 4 | `design` | 03_Design/ | 대안 분석·구현 접근 | - |
| 5 | `task` | 04_Task/ | 실행 단위·체크리스트 | `due` · `priority` · `phase` |
| 6 | `decision` | 05_Decision/ | ADR · 왜 그 결정인가 | `supersedes` |
| 7 | `issue` | 06_Issue/ | 버그·장애·제약 | `severity` · `repro` |
| 8 | `report` | 07_Report/ | Phase 종료 결과 | `phase` |
| 9 | `retro` | 08_Retro/ | 주간·Phase 회고 | `phase` |

Domain 타입 (knowledge, permanent, concept 등) 은 Project 에서 생성 금지. 원자적 지식이 생기면 Domain 볼트로 승격.

## 흐름 원칙

### Task · Decision · Issue · Retro 루프

- **spec → task**: spec 의 성공 기준을 task 체크리스트로 분해. task 는 `from-spec::` inline field 로 역참조.
- **design → decision**: design 에 3 개 이상 옵션이 있으면 decision 필수 생성. ADR 로 "왜 이 옵션인가" 기록. Lint 로 "decision 없는 design" 탐지.
- **blocker → issue**: task 에서 진행 불가 사유 발견 시 issue 생성 → task 의 `blocked-by::` 에 wikilink. 7일 + blocked 방치 Lint.
- **phase 종료 → report + retro 세트**: report 는 결과·지표, retro 는 학습·next. 둘 중 하나만 쓰는 것 금지. Phase 경계 Lint.

### 24~72h Idea 승격

`00_Idea/` 의 `status: draft` 노트는 72h 초과 시 Lint flag. plan / spec / task 중 하나로 승격하거나 `Archive/` 로 이동.

### AI 격리

AI 단독 생성 노트는 반드시 `_AI_Drafts/` 에만 생성. 사용자 검토 후 수동으로 타입별 폴더로 이동하며 `status: draft → active`. 14일 방치 Lint (Domain 의 30일보다 짧음 — Project 는 흐름이 빨라야).

### Decision 의 AI 경계

AI 는 options 나열·context 정리·Consequences 초안까지만. "이 옵션으로 결정했다" 의 최종 선택은 반드시 사람. Retro 의 learning 문장도 사람이 규정.

## Frontmatter 표준

공통 7 필드 (모든 타입):

```yaml
---
id: YYYYMMDDHHmm            # idea 제외 필수
type: idea|plan|spec|design|task|decision|issue|report|retro
status: draft|active|review|done|blocked|archived
created: YYYY-MM-DD HH:mm
updated: YYYY-MM-DD
tags: [project, <type>]
agent: claude
---
```

관계는 **본문 inline field** 로만 기록. frontmatter 에 wikilink list 금지.

```markdown
## Relations
- related:: [[plan-xxx]]
- blocks:: [[task-yyy]]
- blocked-by:: [[issue-zzz]]
- decides:: [[spec-www]]
- supersedes:: [[decision-older]]
```

상세: `Contents/Project/plan/architecture/20260421_Project_Hub_명세.md` (Project_AIMindVaults 볼트) § 6.

## 태그 규칙

- **공통**: 모든 노트 `project` 태그 필수
- **타입 태그**: type 과 동일 (`task`, `decision`, `issue` 등) — Dataview `FROM` 절과 이중 보장
- **decision 은 `adr` 추가 태그**
- **볼트 고유 태그**: 위성 볼트 복제 후 각 볼트가 자신의 프로젝트명 태그 추가 (예: `JissouGame`, `AIMindVaults`)
- Flat 전용. `/` 계층 금지. kebab-case. 단수형.

## 플러그인

### Core 6 (상속)

local-rest-api · advanced-uri · shellcommands · dataview · templater · linter

### Custom 5 (Project 전용)

tasks-plugin · metadata-menu · mermaid-tools · obsidian-git · mcp-tools

### Custom 선택

quickadd · make-md · Juggl (템플릿 볼트에는 Custom 5 만 base 로 포함, 나머지는 위성 볼트 개별 선택)

## 금지 사항

- Domain 타입 (knowledge, permanent, concept) 생성 — 원자적 지식은 Domain 볼트로 승격
- Frontmatter 에 wikilink list — 관계는 inline field
- `_AI_Drafts/` 외 경로에 AI 단독 생성 노트 배치
- AI 가 decision 최종 선택 · retro learning 확정

## 참조

- Project Hub 명세 (Spec 전체): `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260421_Project_Hub_명세.md`
- Dashboard 쿼리 본체: `Dashboard.md`
- 템플릿 9 종: `_Templates/{idea|plan|spec|design|task|decision|issue|report|retro}.md`
- 루트 `_STATUS.md` 볼트 레지스트리

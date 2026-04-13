# AIMindVaults 사용자 커스터마이징 가이드

이 문서는 AIMindVaults를 자신의 환경에 맞게 확장하고 조정하는 방법을 설명합니다.
기본 제공 구성(AIHubVault + BasicContentsVault)을 출발점으로, 필요한 만큼 추가·변경할 수 있습니다.

---

## 1. 볼트 추가

새로운 주제나 프로젝트가 생기면 볼트를 추가해 지식을 분리 관리합니다.

### 볼트 생성

`BasicContentsVault`를 템플릿으로 복제합니다.

```bash
node cli.js clone -t "<대상경로>" -n "<볼트명>"
```

예시:

```bash
node cli.js clone -t "Vaults/Domains_Dev/Python" -n "Python"
```

수동 폴더 복사(`Copy-Item`, `cp`, `xcopy`)는 사용하지 않습니다. 플러그인 설정, 동기화 폴더 처리, 인덱서 초기화 등 자동 처리 단계가 누락됩니다.

### 카테고리 선택

볼트의 성격에 맞는 상위 폴더를 선택합니다.

| 분류 | 경로 | 기준 |
|------|------|------|
| Domains_* | `Vaults/Domains_<영역>/` | 특정 주제의 지식 축적 (도구, 언어, 기법 등) |
| Lab_* | `Vaults/Lab_<영역>/` | 지식 축적 + 실제 개발/실험 복합 |
| Projects_* | `Vaults/Projects_<영역>/` | 실전 프로젝트 실행 및 작업 관리 |
| Personal | `Vaults/Personal/` | 개인 기록, 다이어리, 회고 |

예: Python 언어 지식 → `Vaults/Domains_Dev/Python/`, 게임 개발 프로젝트 → `Vaults/Projects_Game/MyGame/`

### 생성 후 필수 작업

볼트를 생성한 뒤 아래 6단계를 순서대로 완료합니다.

**1. CLAUDE.md 개별화**

볼트 루트의 `CLAUDE.md`를 열고 역할, 수집 범위, 태그 규칙을 해당 볼트에 맞게 작성합니다.
작성 방법은 아래 [5. 볼트 CLAUDE.md 작성 가이드](#5-볼트-claudemd-작성-가이드)를 참고합니다.

**2. _STATUS.md 초기화**

볼트 루트의 `_STATUS.md`를 열고 현재 상태(Now, Next, Blocked)를 초기 상태로 기입합니다.

**3. 루트 CLAUDE.md 볼트 레지스트리에 등록**

`C:\AIMindVaults\CLAUDE.md`의 볼트 레지스트리 테이블에 새 볼트를 추가합니다.

```markdown
| MyVault | `Vaults/Domains_Dev/MyVault/` | 역할 설명 | active |
```

**4. 루트 CLAUDE.md 라우팅 키워드 추가**

같은 파일의 "볼트 진입 프로토콜 > 키워드 추론" 섹션에 이 볼트를 찾아올 수 있는 키워드를 추가합니다.

```markdown
- "Python", "파이썬", "pandas", "pip" → Vaults/Domains_Dev/Python
```

**5. Obsidian 볼트 매니저에서 등록**

Obsidian 앱 > 볼트 매니저 > "보관함 폴더 열기" > 볼트 경로 선택.
`obsidian://open?path=` URI로 미등록 볼트를 여는 것은 앱 속도가 매우 느리므로 사용하지 않습니다.

**6. 초기 인덱스 빌드**

볼트 내 노트 검색이 가능하도록 인덱스를 빌드합니다.

```bash
node cli.js index build -r "<볼트경로>"
```

예시:

```bash
node cli.js index build -r "Vaults/Domains_Dev/Python"
```

---

## 2. 규칙 커스터마이징

에이전트(Claude Code 등)가 따르는 행동 규칙을 추가하거나 조정할 수 있습니다.

### core vs custom

| 위치 | 경로 | 성격 |
|------|------|------|
| core 규칙 | `.claude/rules/core/` | 시스템 핵심 규칙. 업데이트 시 덮어쓰기 가능. 수정 비권장. |
| custom 규칙 | `.claude/rules/custom/` | 사용자 전용. 배포 동기화 대상이 아님. 자유롭게 추가/수정 가능. |

업데이트를 받아도 자신의 설정이 유지되어야 한다면 반드시 `custom/`에 작성합니다.

### custom 규칙 추가 방법

`.claude/rules/custom/` 안에 마크다운 파일을 생성합니다.

파일 형식:

```markdown
# 규칙 제목 (Mandatory 또는 Optional)

> 적용 범위 설명.

## 규칙

- 구체적 규칙 내용
- 구체적 규칙 내용
```

`Mandatory`는 에이전트가 반드시 따르는 규칙, `Optional`은 권장 사항입니다.

예시 — MCP 서버 연동 규칙 (`mcp-notion.md`):

```markdown
# Notion MCP 활용 (Mandatory)

> Notion 관련 작업 시 적용.

## 규칙

- 페이지 읽기/쓰기는 Notion MCP 도구를 우선 사용한다.
- API 직접 호출은 MCP 도구로 불가능한 경우에만 허용한다.
```

예시 — 프로젝트별 코딩 스타일 (`python-style.md`):

```markdown
# Python 코딩 스타일 (Mandatory)

> Python 코드 작성 시 적용.

## 규칙

- 타입 힌트를 모든 함수 파라미터와 반환값에 명시한다.
- docstring은 Google 스타일로 작성한다.
- 파일 상단에 모듈 설명 docstring을 포함한다.
```

---

## 3. 스킬 커스터마이징

스킬은 Claude Code에서 `/스킬명`으로 호출하는 slash command입니다.
자주 쓰는 작업 흐름을 스킬로 만들어두면 반복 지시를 줄일 수 있습니다.

### core vs custom

| 위치 | 경로 | 성격 |
|------|------|------|
| core 스킬 | `.claude/commands/core/` | 시스템 핵심 스킬. 수정 비권장. |
| custom 스킬 | `.claude/commands/custom/` | 사용자 전용. 자유롭게 추가 가능. |

### custom 스킬 추가 방법

`.claude/commands/custom/` 안에 마크다운 파일을 생성합니다.
파일명이 스킬명이 됩니다. `/my-skill` → `my-skill.md`

예시 — 주간 회고 스킬 (`weekly-review.md`):

```markdown
# /weekly-review — 주간 회고 작성

Vaults/Personal/Diary/에 이번 주 회고 노트를 생성한다.

## 절차

1. 이번 주 날짜 범위 확인 (월요일~일요일)
2. 파일명: `YYYY-MM-DD_주간회고.md` (월요일 날짜 기준)
3. frontmatter: type=memo, tags=[diary, weekly-review]
4. 섹션: 이번 주 한 일 / 잘된 점 / 개선할 점 / 다음 주 계획
5. post_note_edit_review 실행
```

---

## 4. 태그 규칙 오버라이드

기본 태그 형식은 시스템 전역에 적용되지만, 볼트별로 다른 형식을 사용할 수 있습니다.

### 기본 태그 형식

- 일반 키워드: kebab-case (소문자 + 하이픈) — `skill-system`, `game-design`
- 고유명사 (제품명, 프레임워크명): 원래 표기 유지 — `Unity`, `Notion`, `AI`
- 계층 태그(`/` 구분자) 사용 금지
- 단수형 원칙 — `systems` X → `system` O

### 볼트별 오버라이드

볼트 `CLAUDE.md`에 `## 태그 규칙` 섹션을 추가하면 해당 볼트에서는 그 규칙이 우선 적용됩니다.

```markdown
## 태그 규칙

- PascalCase 사용 (예: `GameDesign`, `SkillSystem`)
- 계층 태그 허용 (예: `unity/dots`, `design/system`)
- 볼트 식별 태그: `GameDesign` (모든 노트에 필수)
```

선언한 섹션이 없으면 시스템 기본 태그 형식이 적용됩니다.

---

## 5. 볼트 CLAUDE.md 작성 가이드

볼트의 `CLAUDE.md`는 에이전트가 해당 볼트 진입 시 가장 먼저 읽는 파일입니다.
볼트 역할을 명확히 정의할수록 에이전트가 올바른 위치에 콘텐츠를 배치합니다.

### 필수 섹션

```markdown
# <볼트명>

## 이 볼트의 역할

이 볼트는 <주제>에 관한 지식을 축적합니다.
<1~2줄로 역할을 명확히 서술>

## 수집 범위

이 볼트에 들어와야 하는 콘텐츠:

- <수집 대상 1>
- <수집 대상 2>
- <수집 대상 3>

## 수집하지 않는 것

아래 콘텐츠는 다른 볼트로 라우팅합니다:

- <제외 대상> → <대상 볼트명>
- <제외 대상> → <대상 볼트명>

## 디렉토리 구조

Contents/
  Domain/         <- 도메인 지식 노트
    <주제폴더>/
  Project/        <- 프로젝트 관련 노트 (선택)

## 태그 규칙

- 볼트 식별 태그: `<볼트태그>` (모든 노트에 필수)
- 그 외 태그는 시스템 기본 형식 적용

## 세션 진입 규칙

1. `_STATUS.md` 읽기 (현재 진행 상황 파악)
2. 작업 대상 폴더 확인
```

### 전용 타입 선언

코어 타입(study-note, knowledge, design, plan 등)으로 분류가 어려운 콘텐츠가 있으면 전용 타입을 선언합니다.

```markdown
## 전용 타입

| 타입 | 용도 |
|------|------|
| `recipe` | 레시피 문서 |
| `experiment` | 요리 실험 기록 |
```

코어 타입과 이름이 겹치지 않아야 합니다.

### 예시 템플릿 — 도메인 볼트

```markdown
# Python

## 이 볼트의 역할

Python 언어와 관련 생태계의 지식을 축적합니다.
문법, 패턴, 표준 라이브러리, 주요 패키지 활용법을 다룹니다.

## 수집 범위

- Python 언어 문법 및 동작 원리
- 표준 라이브러리 활용 (os, pathlib, dataclasses 등)
- 주요 패키지 (pandas, numpy, requests 등) 사용법
- Python 기반 스크립트 패턴

## 수집하지 않는 것

- AI/ML 모델 훈련, 데이터 과학 분석 → AI 볼트 또는 별도 프로젝트 볼트
- 웹 프레임워크 (FastAPI, Django) → 별도 볼트로 분리 고려
- 코딩 스타일, 클린 코드 원칙 → AI_Coding 볼트

## 디렉토리 구조

Contents/
  Domain/
    Syntax/         <- 언어 문법
    StdLib/         <- 표준 라이브러리
    Packages/       <- 외부 패키지
    Patterns/       <- 코드 패턴

## 태그 규칙

- 볼트 식별 태그: `Python` (모든 노트에 필수)
- 그 외 태그는 시스템 기본 형식 적용

## 세션 진입 규칙

1. `_STATUS.md` 읽기
2. 해당 주제 폴더 확인
```

---

## 6. 에이전트 구성

사용할 AI 에이전트를 결정하고, 해당 에이전트의 진입점 파일만 볼트에 배치합니다.

### 에이전트별 진입점 파일

| 에이전트 | 진입점 파일 |
|----------|------------|
| Claude Code | `CLAUDE.md` |
| Codex | `CODEX.md` |

사용하지 않는 에이전트의 파일은 생성하지 않습니다.
예: Claude Code만 사용하면 `CLAUDE.md`만 있으면 됩니다.

### 멀티 에이전트 사용 시

두 에이전트를 함께 사용하면 같은 파일을 동시에 수정하는 충돌이 발생할 수 있습니다.
아래 소유권 분리를 권장합니다.

| 에이전트 | 담당 영역 |
|----------|----------|
| Claude Code | 볼트 구조 변경, 스크립트 개발, 규칙/스킬 작성, 복수 볼트 작업 |
| 보조 에이전트 | 단일 볼트 내 노트 편집, 반복 작업, 백그라운드 정리 |

아래 파일은 한 에이전트만 수정해야 합니다. 동시 수정 시 데이터 손실 위험이 있습니다.

- `_STATUS.md`
- `_WORKSPACE_VERSION.md`
- `.obsidian/**`
- `_VAULT-INDEX.md`

---

## 7. 플러그인 관리

Obsidian 플러그인은 AIHubVault에서 중앙 관리하고 동기화로 전체 볼트에 전파합니다.

### 플러그인 설치/변경 원칙

- 플러그인 설치·삭제·설정 변경은 **AIHubVault에서만** 수행합니다.
- 개별 볼트의 `.obsidian/plugins/`에 직접 설치하지 않습니다.
- 변경 후 동기화를 실행하면 나머지 볼트에 자동으로 전파됩니다.

### Core 플러그인 (제거 불가)

아래 플러그인은 시스템 기능에 필수입니다.

| 플러그인 | 역할 |
|----------|------|
| local-rest-api | 에이전트와 Obsidian 간 통신 |
| dataview | 데이터 쿼리 및 뷰 |
| templater | 노트 템플릿 |
| linter | 노트 형식 자동 정리 |

### Custom 플러그인 추가

위 Core 플러그인 외에 필요한 플러그인을 자유롭게 추가할 수 있습니다.

1. Obsidian에서 AIHubVault 열기
2. 설정 > 커뮤니티 플러그인 > 플러그인 설치
3. 동기화 실행하여 다른 볼트에 전파

특정 볼트에서 특정 플러그인을 비활성화하고 싶으면, 해당 볼트 `CLAUDE.md`에 명시합니다.

```markdown
## 플러그인 예외

- Excalidraw: 이 볼트에서는 사용하지 않음 (비활성화)
```

---

## 8. 배포 동기화 이해

시스템 업데이트를 받을 때 내 설정이 덮어쓰기 되지 않도록 구분을 알아두어야 합니다.

### core vs custom 네임스페이스

```
.claude/rules/core/      <- 업데이트 시 덮어쓰기 가능 (시스템 규칙)
.claude/rules/custom/    <- 업데이트 대상 아님 (내 설정 보존)

.claude/commands/core/   <- 업데이트 시 덮어쓰기 가능 (시스템 스킬)
.claude/commands/custom/ <- 업데이트 대상 아님 (내 스킬 보존)
```

**내가 추가하거나 수정한 모든 파일은 `custom/`에 넣어야 업데이트 후에도 유지됩니다.**

### 볼트 개별 파일 (배포 동기화 대상 아님)

아래 파일은 볼트마다 내용이 다르므로 업데이트가 덮어쓰지 않습니다.

- `CLAUDE.md` (볼트별 역할 정의)
- `_STATUS.md` (볼트별 진행 상태)
- `_VAULT-INDEX.md` (볼트별 폴더 구조)
- `_Standards/CONTENTS_SPEC.md` (볼트별 콘텐츠 범위)

### 업데이트 시 권장 순서

1. 업데이트 받기 (core/ 파일 갱신)
2. `_ROOT_VERSION.md` 확인하여 변경 사항 파악
3. custom/ 파일과 충돌 여부 검토
4. 필요하면 custom/ 파일 조정

---

## 참고

- 볼트 라우팅 키워드: 루트 `CLAUDE.md` > 볼트 진입 프로토콜
- 노트 작성 규칙: `.claude/rules/core/note-writing.md`
- 볼트 생성 상세 규칙: `.claude/rules/core/vault-individualization.md`
- 세션 종료 루틴: `.claude/rules/core/session-exit.md`

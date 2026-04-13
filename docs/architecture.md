# AIMindVaults 시스템 아키텍처

> 작성 기준: 2026-04-13
> 대상: 협업자 및 구매 사용자

---

## 1. 시스템 개요

AIMindVaults는 Obsidian 기반 멀티볼트 지식관리 시스템이다. 단일 지식 저장소가 아니라 도메인별로 분리된 볼트(vault)를 하나의 루트 디렉토리 아래 관리하며, AI 에이전트(Claude Code, Codex, Cursor 등)와 협업하는 구조로 설계되어 있다.

핵심 원칙은 세 가지다:

- **단일 원본(Hub)**: AIHubVault가 유일한 워크스페이스 원본. 공통 설정과 도구는 Hub에서 전파된다.
- **도메인 분리**: 지식은 주제별 볼트에 분산 저장. 볼트 간 경계를 명확히 유지한다.
- **에이전트 협업**: 규칙 파일(`CLAUDE.md`, `.claude/rules/`)이 에이전트 행동을 제어한다.

---

## 2. 볼트 체계

### 디렉토리 구조

```
C:\AIMindVaults\
├── Vaults\
│   ├── BasicVaults\          ← 시스템 볼트
│   ├── Domains_Game\         ← 게임 도메인
│   ├── Domains_Video\        ← 영상 도메인
│   ├── Domains_Infra\        ← 인프라/도구 도메인
│   ├── Domains_3D\           ← 3D 도메인
│   ├── Domains_VCS\          ← 버전 관리 도메인
│   ├── Domains_AI_Asset\     ← AI 에셋 제작 도메인
│   ├── Domains_Dev\          ← 개발 언어/스타일 도메인
│   ├── Domains_Business\     ← 비즈니스 도메인
│   ├── Domains_Life\         ← 라이프 도메인
│   ├── Domain_Art\           ← 아트 도메인
│   ├── Lab_Infra\            ← 도메인+프로젝트 복합
│   ├── Lab_Game\             ← 게임 개발 도구 Lab
│   ├── Lab_Content\          ← 콘텐츠 제작 Lab
│   ├── Projects_Game\        ← 게임 개발 프로젝트
│   ├── Projects_Infra\       ← 인프라 프로젝트
│   └── Personal\             ← 개인 기록
├── References\               ← 참조 전용 (readonly)
├── Archives\                 ← 비볼트 자료 보관
├── Backup\                   ← 백업
├── docs\                     ← 시스템 문서 (이 파일)
├── _STATUS.md                ← 루트 볼트 레지스트리
└── CLAUDE.md                 ← 루트 에이전트 진입점
```

### 카테고리 분류 기준

| 카테고리 | 역할 | 배치 기준 |
|----------|------|----------|
| `BasicVaults/` | 시스템 볼트 (Hub, 클론 템플릿) | AIHubVault, BasicContentsVault만 배치 |
| `Domains_*/` | 특정 주제의 도메인 지식 축적 | 외부 자료 학습, 경험 기반 지식 정리 |
| `Lab_*/` | 도메인 지식 + 실제 개발 복합 | 플러그인 개발, 연구 목적 실험 |
| `Projects_*/` | 특정 목표를 가진 프로젝트 작업물 | 게임 개발, 인프라 구축 등 결과물 관리 |
| `Personal/` | 개인 기록 | 다이어리, 회고, 성장 로그 |
| `References/` | 외부 공식 문서 조회 전용 | 수정 불가, 조회 목적으로만 사용 |

### 기본 제공 볼트

시스템에는 두 개의 볼트가 기본 제공된다.

- **AIHubVault** (`Vaults/BasicVaults/AIHubVault/`): 워크스페이스 원본(Hub). 공통 도구, 설정, 규칙의 유일한 편집 지점.
- **BasicContentsVault** (`Vaults/BasicVaults/BasicContentsVault/`): 새 볼트 생성 시 사용하는 클론 템플릿. 직접 콘텐츠를 작성하지 않는다.

사용자는 필요에 따라 `aimv clone`으로 BasicContentsVault를 클론하여 볼트를 추가한다.

---

## 3. Hub-Sync 동기화 아키텍처

### 핵심 원칙

AIHubVault가 유일한 원본이다. 공통 워크스페이스 파일(스크립트, 규칙, 플러그인 설정)은 Hub에서만 편집하고, 나머지 볼트(위성 볼트)는 동기화를 통해 전파받는다.

### 동기화 식별 구조

- **Hub 식별**: `.sync/.hub_marker` 파일이 존재하는 볼트가 Hub. 위성 볼트에는 없다.
- **동기화 단위**: `.sync/` 폴더 전체가 Hub → 위성으로 미러링된다.
- **버전 추적**: `_WORKSPACE_VERSION.md` 파일이 버전 번호를 기록한다. 형식: `YYYYMMDDNNNN` (날짜 + 4자리 일련번호).

### 동기화 흐름

```
Obsidian 볼트 열기
    ↓
Shell Commands: on-layout-ready 이벤트
    ↓
node cli.js pre-sync (위성 볼트의 로컬 사본)
    ↓
[트램펄린] Hub의 cli.js 해시 비교
    → 버전 불일치: Hub 버전으로 재실행
    → 일치: 계속 진행
    ↓
_WORKSPACE_VERSION.md 버전 비교
    → Hub 버전 > 로컬 버전: 파일 미러링 실행
    → 동일: 동기화 스킵
    ↓
파일 미러링 + 플러그인 설정 머지
```

### 트램펄린 패턴

pre-sync 스크립트 자체가 Hub의 최신 버전으로 자동 교체되는 구조다. 위성 볼트의 `cli.js`가 Hub의 `cli.js`와 해시가 다르면 Hub 버전을 복사 후 재실행한다. 이를 통해 동기화 스크립트 자체의 버전 관리가 자동으로 이루어진다.

### 동기화 대상 / 비대상

| 대상 | 동기화 포함 여부 |
|------|----------------|
| `.sync/_tools/cli-node/` | 포함 (공통 CLI 도구) |
| `.sync/_Standards/Core/` | 포함 (공통 운영 표준) |
| `.claude/rules/core/` | 포함 (공통 AI 규칙) |
| `.claude/commands/core/` | 포함 (공통 스킬) |
| `CLAUDE.md` | 비포함 (볼트별 개별 파일) |
| `_STATUS.md` | 비포함 (볼트별 상태 파일) |
| `Contents/**` | 비포함 (볼트별 콘텐츠) |
| `vault_index.json` | 비포함 (볼트별 인덱스) |
| `.claude/rules/custom/` | 비포함 (사용자 개인 규칙) |

---

## 4. 편집 모드 분리

모든 편집은 두 모드 중 하나로 수행한다. 한 작업에서 두 모드를 혼합하지 않는다.

### Contents 모드

편집 범위: `{볼트}/Contents/**`

콘텐츠(노트) 작성 및 수정에 해당한다. 내부에서 두 가지로 분기한다:

- `[Contents/Domain]`: 도메인 지식 축적. 학습 정리, 경험 기반 지식, 레퍼런스.
- `[Contents/Project]`: 프로젝트 작업 관리. 계획, 설계, 이슈 추적.

`_Standards/`, `_tools/`, `.claude/`, 볼트 루트 파일은 Contents 모드에서 수정할 수 없다.

### Workspace 모드

편집 범위: `_Standards/`, `_tools/`, `.claude/`, 볼트 루트 파일 (`_STATUS.md`, `_WORKSPACE_VERSION.md`, `CLAUDE.md` 등)

**AIHubVault에서만 수행한다.** 다른 볼트에서 Workspace 파일을 직접 수정하면 동기화 충돌이 발생한다.

Workspace 편집 시 필수 절차:
1. 파일 수정
2. `_WORKSPACE_VERSION.md`에 버전 번호 기록 (당일 최대 번호 + 1)
3. 이후 테스트 및 동기화 진행

버전 기록 없이 다음 단계로 넘어가지 않는다.

### 루트 레벨 편집

멀티볼트 루트(`.claude/`, `.antigravity/`, 루트 설정 파일 등) 변경 시 `_ROOT_VERSION.md`에 버전을 기록한다. 형식: `R` + 3자리 순번 (`R001`, `R002`).

---

## 5. 볼트 내부 구조

### 표준 볼트 구조

```
{볼트}/
├── Contents/
│   ├── Domain/                    ← 도메인 지식 노트
│   ├── Project/                   ← 프로젝트 작업물 노트
│   │   ├── plan/
│   │   └── idea/
│   ├── CONTENTS_SPEC.md           ← 이 볼트의 콘텐츠 범위 정의
│   ├── CONTENTS_AI_RULES.md       ← 볼트별 AI 행동 규칙
│   └── CONTENTS_GLOSSARY.md       ← 볼트별 용어집
├── _Standards/
│   └── Core/
│       ├── CONTENTS_SPEC.md       ← 공통 콘텐츠 스펙
│       └── Script_Registry.md     ← 스크립트 등록부
├── _STATUS.md                     ← Now/Next/Blocked/Decisions
├── _VAULT-INDEX.md                ← 폴더 구조 맵
├── _WORKSPACE_VERSION.md          ← 동기화 버전
├── CLAUDE.md                      ← 에이전트 진입점 (볼트 전용 규칙)
└── .sync/
    ├── .hub_marker                ← Hub에만 존재
    ├── _Standards/Core/           ← Hub에서 전파되는 공통 표준
    └── _tools/cli-node/           ← Node.js CLI 도구
        ├── bin/cli.js             ← 진입점 (aimv)
        ├── src/commands/          ← 커맨드 모듈 14개
        ├── src/lib/               ← 공유 라이브러리
        └── package.json
```

### 볼트 개별 파일 vs. 동기화 파일

| 파일 | 성격 | 설명 |
|------|------|------|
| `CLAUDE.md` | 볼트 개별 | 볼트마다 내용이 다름 |
| `_STATUS.md` | 볼트 개별 | 볼트별 현재 상태 |
| `_VAULT-INDEX.md` | 볼트 개별 | 볼트별 폴더 구조 |
| `_WORKSPACE_VERSION.md` | 동기화 추적 | Hub와 위성의 버전 비교에 사용 |
| `.sync/_tools/` | 동기화 파일 | Hub에서 전파, 직접 편집 금지 |

---

## 6. AI 규칙 체계

### 3단계 규칙 계층

```
루트 .claude/rules/     ← 전 볼트 공통 적용
    ↓
{볼트}/CLAUDE.md        ← 볼트 전용 규칙 (공통 규칙 오버라이드 가능)
    ↓
{볼트}/_WORKFLOW.md     ← 작업 단계별 세부 절차
```

### 네임스페이스 구조

```
.claude/rules/core/      ← 배포 대상, 전 볼트 자동 적용
.claude/rules/custom/    ← 사용자 개인 규칙, 배포 미대상
.claude/commands/core/   ← 배포 대상 스킬
.claude/commands/custom/ ← 사용자 개인 스킬, 배포 미대상
```

### core 규칙 목록 (15개)

| 규칙 파일 | 역할 |
|-----------|------|
| `encoding-safety.md` | 인코딩 안전 (한국어 Mojibake 방지) |
| `edit-mode-separation.md` | Contents/Workspace 편집 모드 분리 |
| `post-edit-review.md` | 편집 후 검증 및 인덱싱 |
| `script-management.md` | 스크립트 중복 방지 및 등록 |
| `script-creation-approval.md` | 스크립트 생성 사전 승인 |
| `juggl-style-sync.md` | Juggl 그래프 스타일 동기화 |
| `note-writing.md` | 노트 작성 패턴 (Frontmatter, 타입, 태그) |
| `vault-routing.md` | 볼트 라우팅 및 콘텐츠 배치 규칙 |
| `session-exit.md` | 세션 종료 시 상태 갱신 |
| `token-optimization.md` | 토큰 절약 및 인덱서 우선 검색 |
| `temp-file-management.md` | 임시 파일 관리 |
| `distribution-sync.md` | 배포 동기화 규칙 |
| `obsidian-config-safety.md` | Obsidian 설정 파일 안전 편집 |
| `vault-individualization.md` | 볼트 생성 시 개별화 규칙 |
| `user-guidance.md` | 에이전트 사용자 안내 룰북 |

### 규칙 신규 추가 절차

신규 규칙은 `custom/`에 우선 생성 → 검증 후 필요하면 `core/`로 격상 → `MANIFEST.md`에 등록 + 배포 변경 로그에 기록.

---

## 7. 콘텐츠 인덱서

### 역할

각 볼트의 `Contents/**/*.md`를 크롤링하여 `vault_index.json`을 생성한다. AI 에이전트는 파일을 직접 탐색하기 전에 인덱서를 먼저 사용한다.

### 추출 필드

| 필드 | 설명 |
|------|------|
| `path` | 볼트 내 상대 경로 |
| `title` | H1 제목 |
| `type` | Frontmatter type |
| `tags` | Frontmatter tags |
| `headings` | H2/H3 목록 |
| `summary` | 본문 앞부분 요약 |
| `links_to` | 이 노트에서 링크하는 파일 |
| `links_from` | 이 노트를 링크하는 파일 |
| `mtime` | 마지막 수정 시각 |
| `hash` | 내용 해시 (증분 빌드용) |

### 빌드 방식

- **전체 빌드**: 모든 파일 크롤링
- **증분 빌드**: `mtime`/`hash` 비교로 변경된 파일만 업데이트
- **크로스볼트 마스터 인덱스**: 여러 볼트를 통합한 인덱스도 지원

### 검색 우선순위 (강제)

```
1단계: vault_index_search.js — 인덱스 기반 키워드/태그/타입 검색
2단계: 결과 불충분 시에만 → Grep, Glob 등 직접 파일 탐색
```

인덱서를 거치지 않고 전체 볼트 파일 스캔에 바로 진입하지 않는다.

---

## 8. 상태 관리 체계

### 파일별 역할

| 파일 | 위치 | 역할 |
|------|------|------|
| `_STATUS.md` | 각 볼트 루트 | Now/Next/Blocked/Decisions — 볼트별 현재 작업 상태 |
| `_STATUS.md` | 멀티볼트 루트 | 볼트 레지스트리 — 볼트명, 타입, 작업 에이전트, 최근 작업 날짜 |
| `_SESSION_HANDOFF_{에이전트}.md` | 각 볼트 루트 | 세션 간 맥락 전달 (최신 1회분만 유지) |
| `_WORKSPACE_VERSION.md` | 각 볼트 루트 | Hub-Sync 버전 추적 |

### 세션 종료 시 필수 갱신 항목

1. 볼트 `_STATUS.md` — Now/Next/Blocked/Decisions 갱신
2. 루트 `_STATUS.md` — 해당 볼트의 작업 에이전트 날짜 갱신
3. `_SESSION_HANDOFF_CLAUDE.md` (또는 해당 에이전트 파일) — 덮어쓰기

세 항목 중 하나라도 빠지면 세션 종료 불완전으로 처리한다.

### 에이전트 소유권

동일 볼트에서 여러 에이전트가 작업할 경우 파일 충돌 방지를 위해 소유권을 분리한다.

| 에이전트 | 주 작업 영역 |
|---------|------------|
| Claude Code | 멀티볼트 구조 변경, 스크립트 개발, 규칙/스킬 작성, `.obsidian/` 설정 |
| Codex | 단일 볼트 내 노트 편집, 반복 작업, 배포 동기화 실행 |

동시 수정 금지 파일: `_STATUS.md`, `_WORKSPACE_VERSION.md`, `.obsidian/**`, `_VAULT-INDEX.md`

---

## 9. 노트 체계

### Frontmatter 필수 항목

모든 노트는 아래 항목을 포함한 YAML Frontmatter로 시작한다.

```yaml
---
type: knowledge          # 타입 (코어 타입 목록에서 선택)
tags: [Unity, game-system]  # 태그
agent: claude            # 작업 에이전트 (누적 기록)
created: 2026-04-13      # 생성일 (또는 updated)
---
```

### 타입 시스템

타입은 케밥-케이스(kebab-case), 단수형, `-note` 접미사 금지 원칙을 따른다.

**콘텐츠 타입 (11개)**

| 타입 | 용도 |
|------|------|
| `study-note` | 외부 자료 학습 정리 |
| `knowledge` | 도메인 지식 — 경험 기반 |
| `design` | 시스템/구조 설계 문서 |
| `plan` | 계획서, 로드맵 |
| `research` | 조사, 분석, 비교 |
| `reference` | 외부 레퍼런스 정리 |
| `report` | 작업 결과 보고서 |
| `spec` | 기능/시스템 상세 명세 |
| `guide` | 설치/운영/사용법 안내 |
| `concept` | 초기 아이디어, 방향 탐색 |
| `memo` | 짧은 메모 |

**이슈 관리 타입 (6개)**: `issue`, `issue-index`, `issue-spec`, `issue-design`, `issue-report`, `debug-design`

**임시 타입 (2개)**: `temp-draft`, `temp-review`

**볼트 구조 타입 (2개)**: `standard`, `folder-index`

볼트 전용 타입이 필요하면 해당 볼트의 `CLAUDE.md`에 선언한다. 미등록 타입을 임의로 사용하지 않는다.

### 태그 규칙

- 기본: kebab-case 소문자 (`skill-system`, `game-design`)
- 고유명사: 원래 표기 유지 (`Unity`, `AI`, `Obsidian`, `Blender`)
- Flat 구조: 계층 구분자(`/`) 사용 금지
- 단수형 원칙

볼트 `CLAUDE.md`의 `## 태그 규칙` 섹션에 다른 형식을 선언하면 해당 볼트에서 우선 적용된다.

### 노트 작성 규칙

- **WikiLink 필수**: 새 노트 생성 시 같은 볼트 내 관련 노트에 `[[WikiLink]]`를 1개 이상 포함한다.
- **Juggl 임베드**: 제목 바로 아래에 삽입. `local:` 값은 파일명(확장자 제외).
  ```juggl
  local: 20260413_파일명
  ```
- **H1 제목 제약**: URI 예약문자(`#`, `%`, `&`, `?`, `+`) 및 이모지 금지.
- **파일명 제약**: URI 예약문자 및 이모지 사용 금지. 가독성은 `aliases`로 유지.

---

## 10. 볼트 생성 절차

새 볼트는 BasicContentsVault를 클론하여 생성한다. 수동 폴더 복사(`Copy-Item`, `cp` 등)를 사용하지 않는다.

### 생성 절차

1. **클론 실행**

   ```bash
   node {BasicContentsVault경로}/.sync/_tools/cli-node/bin/cli.js clone \
     -t {대상경로} \
     -n {볼트명}
   ```

   클론 스크립트가 처리하는 항목:
   - `.git`, 캐시, 동기화 폴더 제외 복사
   - 디바이스별 플러그인 설정 자동 제거
   - make-md systemName 자동 갱신

2. **CLAUDE.md 개별화**: 볼트 역할, 수집 범위, 수집 제외 항목, 디렉토리 구조, 태그 규칙 작성

3. **루트 `_STATUS.md` 레지스트리 등록**: 볼트명, 카테고리, 역할, 상태 추가

4. **루트 `CLAUDE.md` 볼트 진입 프로토콜 키워드 추가**

5. **콘텐츠 인덱스 초기 빌드**:

   ```bash
   node {볼트경로}/.sync/_tools/cli-node/bin/cli.js index build -r {볼트경로}
   ```

6. **Obsidian에 등록**: Obsidian 볼트 매니저 → "보관함 폴더 열기" → 볼트 경로 선택

---

## 11. 편집 후 검증 (Post-Edit Review)

노트 편집 완료 후 아래 검증을 실행한다.

```bash
node {볼트경로}/.sync/_tools/cli-node/bin/cli.js review -r {볼트경로}
```

완료 조건:
- `POST_EDIT_REVIEW_BAD=0`: Frontmatter 오류, 인코딩 문제 없음
- `POST_EDIT_INDEX_UPDATED=1`: 콘텐츠 인덱스 갱신 완료

`POST_EDIT_INDEX_UPDATED=0` 또는 `POST_EDIT_INDEX_SKIPPED=1`이면 수동 인덱싱 후 완료 처리:

```bash
node {볼트경로}/.sync/_tools/cli-node/bin/cli.js index build -r {볼트경로} -i
```

---

## 12. 배포 동기화

### 배포 대상

`.claude/rules/core/`, `.claude/commands/core/`, `.sync/_tools/`, `.sync/_Standards/Core/`의 변경사항이 배포 대상이다.

### 배포 흐름

```
AIHubVault (원본 편집)
    ↓
sync-distribution 워크플로우
    ↓
BasicContentsVault (배포본 클론 템플릿)
    ↓
SellingVault (C:\SellingVault\Korean\AIMindVaults)
    ↓
git commit + push (github.com/warqun/AIMindVaults)
```

에이전트가 직접 배포 경로에 접근하지 않는다. 배포 + git push는 사용자가 명시적으로 요청한 경우에만 수행한다.

### 배포본 기준

배포본(SellingVault)은 구매자/신규 사용자 기준으로 작성한다. 제작자 개인 볼트, custom 규칙, 환경별 MCP 설정은 배포에 포함하지 않는다.

---

> 이 문서는 시스템 구조 변경 시 함께 갱신한다.

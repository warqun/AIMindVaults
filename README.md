# AIMindVaults

> AI 에이전트의 영속적 작업 환경을 만드는 Obsidian 멀티볼트 시스템.

---

## 이 시스템은 왜 만들어졌는가

AI 에이전트(Claude Code, Codex, Cursor 등)를 매일 쓰면서 같은 두 가지 문제에 계속 부딪혔습니다:

**1. AI 작업물은 휘발된다.** 좋은 세션, 어려운 문제를 풀어도 다음 날이면 컨텍스트가 사라집니다. `CLAUDE.md`가 도움이 되지만, 여러 도메인에 걸쳐 작업하면 단일 룰북만으로는 감당이 안 됩니다.

**2. Obsidian은 한 볼트가 커질수록 무거워진다.** 노트와 플러그인이 쌓일수록 로딩이 느려집니다. 주제별로 볼트를 나누는 것이 자연스러운 해결책이고, AI 에이전트 입장에서도 관련 없는 도메인까지 섞인 컨텍스트는 판단 품질을 떨어뜨리기 때문에 옳은 방향입니다. 그러나 볼트가 N개가 되면 같은 규칙, 같은 플러그인 설정, 같은 도구를 볼트마다 따로 관리해야 하고, 수동 동기화는 지속 불가능합니다.

AIMindVaults는 이 둘을 동시에 해결하는 **로컬 파일 기반 PKM 시스템**입니다:

- **영속성** — 에이전트가 필요로 하는 모든 것이 다음 세션에서도 다시 읽을 수 있는 일반 파일로 존재합니다.
- **목적별 멀티볼트** (Domain / Project / Lab / Diary) — Obsidian은 가볍게 유지되고, 에이전트 컨텍스트는 좁게 유지됩니다.
- **허브 기반 동기화** — 규칙, 도구, 표준은 하나의 Hub 볼트에서만 편집하고, 모든 위성 볼트로 자동 전파됩니다.

---

## 이 시스템이 해결하는 것

| 문제 | 해결 방식 |
|------|----------|
| 세션 간 에이전트 기억 휘발 | 볼트별 `CLAUDE.md`, 세션 핸드오프 노트, 에이전트가 파일 스캔 전에 조회하는 콘텐츠 인덱서 |
| Obsidian 성능 저하 | 목적별 볼트 분리, 각 볼트를 가볍게 유지 |
| 멀티볼트 설정 드리프트 | Node.js CLI (`aimv`) 기반 허브-위성 동기화 |
| 에이전트 컨텍스트 오염 | 볼트별 범위 제한된 규칙 — 관련 있는 것만 본다 |
| 시간 경과에 따른 지식 부패 | Post-edit 리뷰 파이프라인이 frontmatter/인코딩/링크 오류를 누적 전에 잡아냄 |

---

## 폴더 구조

```
AIMindVaults/                        ← AI 에이전트 프로젝트 루트
├── CLAUDE.md                        ← Claude Code 라우팅 허브
├── CODEX.md                         ← Codex 라우팅 허브
├── .claude/rules/                   ← 공통 AI 규칙 (전 볼트 자동 적용)
├── Vaults/
│   ├── BasicVaults/                 ← 작업환경 허브
│   │   ├── AIHubVault/              ← 규칙/도구/표준 원본 (Hub)
│   │   └── BasicContentsVault/      ← 범용 콘텐츠 저장소
│   ├── Domains_*/                   ← 도메인 지식 볼트 (지식 축적 전용)
│   ├── Lab_*/                       ← Lab 볼트 (지식 축적 + 실제 개발)
│   └── Projects_*/                  ← 프로젝트 볼트 (실행 전용)
└── References/                      ← 참조 전용 자료
```

## 볼트 유형

| 유형 | 접두사 | 역할 |
|------|--------|------|
| **Basic** | `BasicVaults/` | 작업환경 허브, 범용 템플릿 |
| **Domain** | `Domains_*/` | 특정 주제의 지식 축적 전용 |
| **Lab** | `Lab_*/` | 지식 축적 + 실제 개발이 함께 이루어지는 복합 볼트 |
| **Project** | `Projects_*/` | 실전 프로젝트 실행 전용 |
| **Reference** | `References/` | 외부 자료 조회 전용 (읽기 전용) |

---

## 빠른 시작

### 1. AI 에이전트에 등록

ZIP을 받아서 드라이브 루트 가까이에 압축 해제합니다 (예: `C:\AIMindVaults/`). 사용하는 로컬 AI 에이전트 (Claude Code, Cursor, Windsurf 등)의 프로젝트 루트를 이 `AIMindVaults/` 폴더로 설정하세요. 에이전트가 루트의 `CLAUDE.md`나 `CODEX.md`를 읽으면서 시스템 구조를 파악합니다.

### 2. Obsidian에 볼트 등록

Obsidian에서 **Open folder as vault**로 아래 두 폴더를 각각 볼트로 등록합니다:

- `Vaults/BasicVaults/AIHubVault/` — 작업환경 원본 (Hub)
- `Vaults/BasicVaults/BasicContentsVault/` — 범용 콘텐츠 저장소

플러그인 설정은 이미 포함되어 있으므로 별도 설정이 필요 없습니다. 첫 실행 시 **Turn on community plugins**만 클릭하면 됩니다.

### 3. 에이전트에게 물어보기

등록이 끝나면 AI 에이전트에게 진입점부터 확인하라고 지시하세요. 에이전트가 `CLAUDE.md` → 볼트 구조 → 규칙 체계 순으로 파악하고, 어떤 기능이 있는지 알려줍니다.

### 이후에는?

새 주제가 생기면 볼트를 복제해서 추가하면 됩니다. 복제 방법은 아래 "볼트 추가하기" 참조.

자세한 설치 가이드, 플러그인 목록 → `Vaults/BasicVaults/AIHubVault/README.md`

---

## 어떻게 돌아가나요?

### Hub-Sync (자동 동기화)

AIHubVault가 유일한 원본입니다. 규칙, 도구, 표준 문서는 **여기서만 수정**합니다. 다른 볼트를 Obsidian에서 열면 `aimv pre-sync`가 자동 실행되어 Hub와 버전을 비교하고, 차이가 있으면 알아서 동기화합니다.

### 편집 모드 분리

볼트 안에서의 편집은 두 종류로 나뉘고, 절대 섞이지 않습니다:

- **Contents 모드**: `Contents/` 안의 콘텐츠만 작업 (지식 정리, 프로젝트 관리)
- **workspace 모드**: `_Standards/`, `_tools/`, 규칙 등 환경 설정만 작업 (AIHubVault에서만)

한 작업에서 두 모드를 섞지 않습니다.

### AI 에이전트 라우팅

AI 에이전트는 `AIMindVaults/` 루트에서 시작합니다. 사용자가 요청하면 에이전트가 `CLAUDE.md`를 읽고 키워드로 맞는 볼트를 찾아 들어가, 그 볼트의 범위 제한된 규칙을 읽은 뒤 작업합니다.

---

## AI 규칙 체계

AI 에이전트가 따르는 규칙은 3단계입니다:

| 단계 | 위치 | 뭘 하는 건지 |
|------|------|-------------|
| 공통 규칙 | `.claude/rules/core/` (15개) | 전 볼트 자동 적용. 인코딩 안전, 편집 모드, 스크립트 관리, 세션 종료, 토큰 최적화 등 |
| 볼트 규칙 | 각 볼트 `CLAUDE.md` | 볼트별 역할, 진입 절차, 편집 범위 |
| 운용 규칙 | 각 볼트 `_WORKFLOW.md` | 상태 공유, 태그, CLI 사용법 등 상세 절차 |

공통 규칙 15개의 상세 내용은 볼트 안에서 확인:
→ `Vaults/BasicVaults/AIHubVault/_Standards/Core/AI_Rules_Index.md`

---

## 볼트 추가하기

1. `/create-vault <카테고리>/<볼트명>` 스킬 실행 (BasicContentsVault 기반 복제)
2. 볼트 유형에 맞는 카테고리에 배치:
   - 지식 축적만: `Domains_<영역>/`
   - 지식 + 개발: `Lab_<영역>/`
   - 실행 전용: `Projects_<영역>/`
3. Obsidian에서 볼트 등록 + Shell Commands 설정
4. 루트 `CLAUDE.md`의 볼트 레지스트리 테이블에 추가

---

## 더 알아보기

| 문서 | 내용 |
|------|------|
| `docs/architecture.md` | 시스템 아키텍처 — Hub-Sync, 편집 모드, 규칙 체계, 상태 관리 |
| `docs/cli-reference.md` | Node.js CLI 도구 레퍼런스 — 14개 커맨드 상세 |
| `docs/customization.md` | 사용자 커스터마이징 — 볼트 추가, 규칙/스킬/태그 커스텀 |
| `AGENT_ONBOARDING.md` | AI 에이전트 온보딩 문서 |
| `Vaults/BasicVaults/AIHubVault/README.md` | 설치 가이드, 플러그인 목록, AI 에이전트 연동법 |

---

## License

MIT

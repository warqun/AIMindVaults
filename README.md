# AIMindVaults

> Obsidian + AI 에이전트를 위한 멀티볼트 지식관리 시스템.

---

## 이게 뭔가요?

Obsidian 볼트 여러 개를 하나의 작업 폴더에 모아두고, AI 에이전트(Claude Code, Codex, Cursor 등)가 자동으로 규칙을 따르면서 작업하게 해주는 시스템입니다.

### 왜 멀티볼트인가요?

Obsidian은 볼트 하나에 파일과 폴더가 많아질수록 로딩이 눈에 띄게 느려집니다. 커뮤니티 플러그인을 여러 개 설치하면 더 심해지고요. 그래서 주제별로 볼트를 나누는 게 좋은데, 그러면 볼트마다 규칙과 도구를 따로 관리해야 하는 문제가 생깁니다.

AIMindVaults는 이 두 가지를 동시에 해결합니다 — 볼트를 나눠서 Obsidian 성능을 유지하면서, AI 에이전트가 따르는 규칙과 작업 도구는 하나의 원본에서 일관되게 관리합니다.

### 핵심 구조

- **볼트 하나가 원본** (Hub)이고, 나머지 볼트는 규칙과 도구를 Hub에서 자동으로 받아갑니다.
- **콘텐츠 편집**과 **환경 설정**을 섞지 않습니다. 각각 모드를 나눠서 작업합니다.
- **AI 에이전트가 여럿** 작업해도 `_STATUS.md`로 상태를 공유하니까 충돌이 안 납니다.

### 폴더 구조

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

### 볼트 유형

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

AIHubVault가 유일한 원본입니다. 규칙, 도구, 표준 문서는 **여기서만 수정**합니다.

다른 볼트를 Obsidian에서 열면 `sync_workspace.ps1`이 자동 실행되어 Hub와 버전을 비교하고, 차이가 있으면 알아서 동기화합니다.

### 편집 모드 분리

볼트 안에서의 편집은 두 종류로 나뉩니다:

- **Contents 모드**: `Contents/` 안의 콘텐츠만 작업 (지식 정리, 프로젝트 관리)
- **workspace 모드**: `_Standards/`, `_tools/` 등 환경 설정만 작업 (AIHubVault에서만)

한 작업에서 두 모드를 섞지 않습니다.

### AI 에이전트 라우팅

AI 에이전트는 `AIMindVaults/` 루트에서 시작합니다. 사용자가 요청하면 에이전트가 알아서 맞는 볼트를 찾아 들어가고, 그 볼트의 규칙을 읽은 뒤 작업합니다.

---

## AI 규칙 체계

AI 에이전트가 따르는 규칙은 3단계입니다:

| 단계 | 위치 | 뭘 하는 건지 |
|------|------|-------------|
| 공통 규칙 | `.claude/rules/` (11개) | 전 볼트 자동 적용. 인코딩 안전, 편집 모드, 스크립트 관리 등 |
| 볼트 규칙 | 각 볼트 `CLAUDE.md` | 볼트별 역할, 진입 절차, 편집 범위 |
| 운용 규칙 | 각 볼트 `_WORKFLOW.md` | 상태 공유, 태그, CLI 사용법 등 상세 절차 |

공통 규칙 11개의 상세 내용은 볼트 안에서 확인:
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
| `Vaults/BasicVaults/AIHubVault/README.md` | 설치 가이드, 플러그인 목록, AI 에이전트 연동법 |
| `Vaults/BasicVaults/AIHubVault/CORE_CONCEPTS.md` | 핵심 개념 다이어그램 (Hub-Sync, 라우팅, 편집 모드) |
| `Vaults/BasicVaults/AIHubVault/_tools/TOOLS_INDEX.md` | 사용자용·AI용 도구 목록 |

---

## License

MIT

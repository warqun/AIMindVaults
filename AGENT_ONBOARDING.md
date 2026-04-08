# AIMindVaults — 에이전트 온보딩 (공통)

> 이 환경에 처음 접근하는 AI 에이전트가 읽는 문서.
> 로컬 파일 읽기/쓰기가 가능한 에이전트라면 어떤 것이든 사용 가능하다.
> 에이전트별 상세 온보딩은 아래 문서를 참조한다.

| 에이전트 | 전용 온보딩 | 진입점 |
|----------|------------|--------|
| Claude Code | `AGENT_ONBOARDING_CLAUDE.md` | `CLAUDE.md` |
| Codex | `AGENT_ONBOARDING_CODEX.md` | `AGENTS.md` |
| 기타 | 이 문서 + 진입점 중 택1 | `CLAUDE.md` 또는 `AGENTS.md` |

---

## 1. 환경 개요

AIMindVaults는 Obsidian 기반 멀티볼트 지식 관리 시스템이다.

- 볼트가 용도별로 분류되어 있다 (도메인 지식, 프로젝트, 개인 기록 등).
- AIHubVault가 단일 원본(Hub)으로, 모든 볼트의 작업환경(규칙, 스크립트, 표준)을 동기화한다.
- 사용자가 볼트를 추가하면 레지스트리에 등록하고, `clone_vault.ps1`로 BasicContentsVault를 클론하여 생성한다.

---

## 2. 기본 볼트 구성

| 볼트 ID | 경로 | 역할 |
|---------|------|------|
| AIHubVault | `Vaults/BasicVaults/AIHubVault/` | **작업환경 원본(Hub)** — 규칙·스크립트·표준 설계 및 배포 |
| BasicContentsVault | `Vaults/BasicVaults/BasicContentsVault/` | 범용 콘텐츠 저장소 (클론 템플릿 전용 — 직접 편집 금지) |

사용자가 새 볼트를 생성하면 여기에 추가된다. 볼트를 만들지 않아도 기본 2개로 시작할 수 있다.

---

## 3. 핵심 파일 구조

```
AIMindVaults/                    ← 멀티볼트 루트
├── CLAUDE.md                    ← Claude Code 진입점
├── AGENTS.md                    ← Codex 진입점
├── AGENT_ONBOARDING.md          ← 이 문서 (공통)
├── AGENT_ONBOARDING_CLAUDE.md   ← Claude Code 전용 온보딩
├── AGENT_ONBOARDING_CODEX.md    ← Codex 전용 온보딩
├── _STATUS.md                   ← 볼트 레지스트리 (타입, 작업 에이전트, 날짜)
├── _SESSION_HANDOFF_{에이전트}.md ← 이전 세션 맥락
├── .claude/
│   ├── rules/core/              ← 강제 규칙 14개
│   ├── rules/custom/            ← 개인 규칙 (배포 미대상)
│   ├── commands/core/           ← 스킬 17개
│   └── commands/custom/         ← 개인 스킬
├── .codex/
│   ├── CODEX.md                 ← Codex 내부 라우팅 허브
│   ├── AGENT_STATUS.md          ← Codex 상태
│   ├── rules/                   ← Codex 전용 규칙 4개
│   └── skills/                  ← Codex 전용 스킬 7개
└── Vaults/
    └── {볼트}/
        ├── Contents/            ← 콘텐츠 (노트)
        ├── _STATUS.md           ← 볼트 상태
        ├── _VAULT-INDEX.md      ← 폴더 구조 맵
        ├── _WORKSPACE_VERSION.md ← 동기화 버전
        ├── CLAUDE.md            ← 볼트 전용 규칙
        └── .sync/               ← 동기화 미러 (Hub에서 전파)
            ├── _Standards/Core/ ← 운영 표준
            ├── _tools/cli/      ← CLI 도구 (검증, 인덱서)
            └── _tools/data/     ← 인덱스 데이터
```

---

## 4. 볼트 라우팅

콘텐츠를 생성하기 전에 `_STATUS.md` 볼트 레지스트리를 확인하여 적절한 볼트를 선택한다.

- 키워드 기반 자동 라우팅: 진입점 문서(`CLAUDE.md` 또는 `AGENTS.md`)의 라우팅 규칙 참조.
- 명시적 지정: "AIHubVault에서 ~"
- 적합한 볼트가 없으면 사용자에게 확인. 임의 판단으로 부적합한 볼트에 넣지 않는다.
- BasicContentsVault는 클론 템플릿 전용. 직접 콘텐츠 작업 금지.

---

## 5. 볼트 진입 프로토콜

대상 볼트에서 작업을 시작하기 전, 아래 순서로 읽는다:

1. `_SESSION_HANDOFF_{에이전트}.md` (루트) — 이전 세션 맥락, 미완료 항목
2. `_STATUS.md` (루트) — 전체 볼트 현황, 다른 볼트 작업과 충돌 확인
3. `{볼트}/CLAUDE.md` — 볼트 전용 규칙
4. `{볼트}/_STATUS.md` — Now/Next/Blocked 확인

대상 볼트가 AIHubVault가 아닌 경우, `_WORKSPACE_VERSION.md`를 Hub와 비교하여 차이가 있으면 동기화를 먼저 수행한다.

---

## 6. 편집 모드 분리

모든 편집은 두 모드 중 하나를 선언한 후 수행한다. 모드 혼합 금지.

### Contents 모드
- 대상: `Contents/**` 하위 파일
- 콘텐츠(노트) 작성/수정 전용
- 하위 분기: `[Contents/Domain]` (지식 축적) 또는 `[Contents/Project]` (작업 관리)
- 금지: `.sync/`, `.claude/`, `.forge/` 등 workspace 파일 수정

### Workspace 모드
- 대상: `.sync/`, `.claude/`, `.codex/`, `.forge/`, 볼트 루트 파일
- **AIHubVault에서만 수행** (강제). 다른 볼트는 동기화로 자동 전파.
- 수정 후 `_WORKSPACE_VERSION.md`에 버전 기록 필수 (형식: `YYYYMMDDNNNN`).
- 버전 기록 없이 작업 완료 보고 금지.

---

## 7. 노트 작성 규약

### Frontmatter 필수
```yaml
---
type: domain          # 또는 plan, idea, meta 등
tags: [볼트태그, 주제태그]
agent: claude         # 작업한 에이전트 누적 기록 (claude, codex 등)
updated: 2026-04-08
---
```

### 구조
- H1 제목 1개. H2/H3로 구조화.
- 내부 링크는 `[[WikiLink]]` 사용. **최소 1개 이상 필수.**
- H1 제목과 파일명에 URI 예약문자(`#`, `%`, `&`, `?`, `+`) 및 이모지 금지.
  - 대체: `C#` → `CSharp`, `C++` → `CPP`, `Q&A` → `QnA`
- 비유적/은유적 표현 금지. 직접 서술.
- `**텍스트(괄호)**` 형태 금지 → `**텍스트** (괄호)`

### Juggl 임베드
제목 바로 아래에 삽입. `local:` 값은 파일명(확장자 제외).
```juggl
local: 파일명_without_extension
```
예외: `_STATUS.md`, `_VAULT-INDEX.md`, `.claude/` 내 파일.

---

## 8. 세션 종료 규약

세션 종료 시 아래를 **모두** 수행해야 한다. 하나라도 빠지면 세션 종료 불가.

### 볼트 _STATUS.md 갱신
- **Now**: 완료/진행 중 작업
- **Next**: 다음에 이어서 할 작업
- **Blocked**: 막힌 사항 (없으면 "없음")
- **Decisions**: 이번 세션 결정 사항 (YYYY-MM-DD)

### 루트 _STATUS.md 갱신
- 볼트 레지스트리에서 해당 볼트의 작업 에이전트/날짜 갱신.
- 형식: `에이전트명 / YYYY-MM-DD`

### 세션 핸드오프
- `_SESSION_HANDOFF_{에이전트}.md`를 덮어쓰기.
- 기록: 작업 요약, 변경 파일, 결정 사항, 다음 세션 권장 작업.
- 볼트별 핸드오프 작성 시 루트 핸드오프에도 참조를 남긴다.

---

## 9. Hub-Sync 동기화

- AIHubVault가 단일 원본(Hub). `.sync/` 폴더 안의 모든 파일이 동기화 대상.
- Hub 식별: `.sync/.hub_marker` 파일 존재 여부.
- 동기화 실행: `pre_sync.ps1` → 버전 비교 → `.sync/` 미러링 → 플러그인 머지.
- Obsidian에서 볼트를 열면 `on-layout-ready` 이벤트로 `pre_sync.ps1`이 자동 실행된다 (Shell Commands 플러그인).
- workspace 편집은 반드시 AIHubVault에서 수행 → 동기화로 전파.

---

## 10. Post-Edit Review

노트 편집 완료 직후 실행:
```powershell
powershell -ExecutionPolicy Bypass -File {볼트경로}\.sync\_tools\cli\post_note_edit_review.ps1 -Root {볼트경로} -Scope Contents
```
- 검증: frontmatter 무결성, 인코딩 안전, WikiLink 존재.
- `POST_EDIT_REVIEW_BAD=0` 확인 전 완료 보고 금지.
- 통과 시 콘텐츠 인덱서 증분 빌드 자동 호출 (`vault_index_build.ps1 -Incremental`).
- `POST_EDIT_INDEX_UPDATED=1` 확인이 완료 조건. 실패 시 수동 인덱싱:
```powershell
powershell -ExecutionPolicy Bypass -File {볼트경로}\.sync\_tools\cli\vault_index_build.ps1 -VaultRoot {볼트경로} -Incremental
```

---

## 11. 콘텐츠 인덱서

각 볼트의 `Contents/**/*.md`를 크롤링하여 `.sync/_tools/data/`에 JSON 인덱스 생성.

- 추출: path, title, type, tags, headings, summary, links_to, links_from, mtime, hash
- 증분 빌드: mtime/hash 비교로 변경된 노트만 갱신.
- 스킬: `/reindex` (현재 볼트), `/reindex all` (전체), `/reindex {볼트명}` (특정)

---

## 12. 스크립트 관리

- 새 스크립트 생성 전 `.sync/_Standards/Core/Script_Registry.md`에서 중복 확인.
- **생성 전 사용자 승인 필수.** 목적, 경로, 영향 범위, 일회성 여부를 보고.
- 경로 하드코딩 금지 — 스크립트 위치 기반 자동탐지 사용.
- 생성 후 Script_Registry.md에 등록.

---

## 13. 인코딩 안전

- `Contents` 대량 수정 전 인코딩 검증 필수.
- 대량 수정은 UTF-8 고정 I/O만 허용.
- PowerShell의 `Get-Content + Set-Content` 파이프라인으로 한국어 마크다운을 재작성하지 않는다.
- 대량 치환: dry-run → 3파일 샘플 → 전체 실행.

---

## 14. 토큰 절약

- **핀포인트 접근**: 필요한 파일만 정확히 지정. 광범위 검색 금지.
- 경로를 모르면 사용자에게 먼저 확인.
- 대형 파일(100줄+)은 필요한 부분만 읽기. 같은 파일 반복 읽기 금지.
- 고비용 작업(대량 스캔, 복수 스크립트 실행)은 사용자 승인 후 진행.
- 자가 디버깅 반복 금지 — 수정안 제시 후 사용자 실행 위임.

---

## 15. 임시 파일 관리

- CLI 명령 실행 시 임시 파일은 `$env:TEMP` 하위에만 생성.
- 볼트 내에 임시 파일(`.vtt`, `.json`, `.tmp`, `.log` 등) 방치 금지.
- 작업 완료 후 즉시 삭제. 삭제 확인 전 완료 보고 금지.

---

## 16. Obsidian 노트 열기

이 환경의 `.md` 노트는 Obsidian 볼트 안에 있다. 노트를 열 때는 Obsidian URI를 사용한다.

```powershell
Start-Process 'obsidian://open?vault=볼트명&file=볼트루트기준_상대경로'
```

- `vault`: Obsidian에 등록된 볼트 폴더명 (예: `AIHubVault`)
- `file`: 볼트 루트 기준 상대 경로, `.md` 확장자 생략 (예: `Contents/Domain/Example_Note`)
- 경로 구분자: `/` 사용. 한글 파일명 그대로 사용 가능.
- `Start-Process <파일경로.md>`, `code`, `Invoke-Item` 등은 VS Code로 열리므로 금지.

---

## 17. 보안 안내

이 시스템은 네트워크 서비스나 별도 인증 체계 없이 **로컬 파일 + 로컬 에이전트**로만 동작한다.

### 보안 경계

- **OS 레벨**: Windows 사용자 계정 권한 = 볼트 접근 권한. PC를 본인만 사용하면 파일 보안은 충분하다.
- **에이전트 레벨**: AI 에이전트(Claude Code, Codex 등)는 로컬 파일 읽기/쓰기/실행이 가능하다. 도구 실행 허가를 **"확인 후 승인"** 모드로 설정하면 의도치 않은 파일 조작을 방지할 수 있다.

### 주의사항

- **클라우드 동기화 폴더 회피**: OneDrive 등 자동 동기화 폴더에 볼트를 두면 노트가 클라우드에 평문 노출된다. 민감한 연구 데이터를 다루는 경우 동기화 폴더 밖에 배치한다.
- **자동 실행 스크립트**: Obsidian에서 볼트를 열면 `.sync/pre_sync.ps1`이 자동 실행되어 Hub→위성볼트 설정 동기화를 수행한다. 내용은 해당 파일에서 확인 가능하다.
- **프롬프트 인젝션**: 에이전트가 노트를 읽을 때, 노트 내용에 포함된 악의적 지시를 따를 가능성이 있다. 외부에서 가져온 노트는 내용을 확인한 후 볼트에 추가한다.

---

## 규칙 상세 참조

| 규칙 | 파일 |
|------|------|
| 볼트 라우팅 | `.claude/rules/core/vault-routing.md` |
| 편집 모드 분리 | `.claude/rules/core/edit-mode-separation.md` |
| 노트 작성 | `.claude/rules/core/note-writing.md` |
| 세션 종료 | `.claude/rules/core/session-exit.md` |
| 배포 동기화 | `.claude/rules/core/distribution-sync.md` |
| Post-Edit Review | `.claude/rules/core/post-edit-review.md` |
| 스크립트 관리 | `.claude/rules/core/script-management.md` |
| 스크립트 생성 승인 | `.claude/rules/core/script-creation-approval.md` |
| 인코딩 안전 | `.claude/rules/core/encoding-safety.md` |
| 토큰 절약 | `.claude/rules/core/token-optimization.md` |
| 임시 파일 관리 | `.claude/rules/core/temp-file-management.md` |
| Juggl 스타일 | `.claude/rules/core/juggl-style-sync.md` |
| Obsidian 설정 | `.claude/rules/core/obsidian-config-safety.md` |
| 볼트 개별화 | `.claude/rules/core/vault-individualization.md` |

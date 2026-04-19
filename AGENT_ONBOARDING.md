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

- 27개 이상의 볼트가 용도별로 분류되어 있다 (도메인 지식, 프로젝트, 개인 기록, 참조 문서 등).
- AIHubVault가 단일 원본(Hub)으로, 모든 볼트의 작업환경(규칙, 스크립트, 표준)을 동기화한다.
- 볼트 추가 시 `aimv clone`으로 BasicContentsVault를 클론하여 생성한다.

### 환경 설정

- 외부 소프트웨어 설치 가이드: `SETUP_GUIDE.md` 참조.
- 시스템 아키텍처 상세: `docs/architecture.md` 참조.
- CLI 도구 레퍼런스: `docs/cli-reference.md` 참조.
- 사용자 커스터마이징: `docs/customization.md` 참조.
- 컨텍스트 창 최적화 (MCP/플러그인): `docs/context-optimization.md` 참조.

---

## 2. 볼트 구성

전체 레지스트리는 `CLAUDE.md` 또는 `AGENTS.md`에 있다. 주요 카테고리:

| 카테고리 | 경로 패턴 | 예시 |
|----------|----------|------|
| BasicVaults | `Vaults/BasicVaults/` | AIHubVault (Hub), BasicContentsVault (템플릿) |
| Domains_Game | `Vaults/Domains_Game/` | Unity, GameDesign, GameArt |
| Domains_Video | `Vaults/Domains_Video/` | CapCut |
| Domains_Infra | `Vaults/Domains_Infra/` | Notion, CICD, Search, AI, AppFlowy |
| Domain_Art | `Vaults/Domain_Art/` | LightAndColor |
| Domains_Business | `Vaults/Domains_Business/` | Funding |
| Lab_Infra | `Vaults/Lab_Infra/` | ObsidianDev |
| Lab_Game | `Vaults/Lab_Game/` | CombatToolKit, TileMapToolKit |
| Projects_Game | `Vaults/Projects_Game/` | JissouGame |
| Projects_Infra | `Vaults/Projects_Infra/` | Project_AIMindVaults |
| Personal | `Vaults/Personal/` | Diary |
| References | `References/` | Unity_Documentation (readonly) |

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
│   ├── rules/core/              ← 강제 규칙 15개
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
            └── _tools/cli-node/ ← Node.js CLI 도구 (aimv)
```

---

## 4. 볼트 라우팅

콘텐츠를 생성하기 전에 `_STATUS.md` 볼트 레지스트리를 확인하여 적절한 볼트를 선택한다.

- 키워드 기반 자동 라우팅: 진입점 문서(`CLAUDE.md` 또는 `AGENTS.md`)의 라우팅 규칙 참조.
- 명시적 지정: "AIHubVault에서 ~", "Unity 볼트에 ~"
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

## 6. 환경 점검 (온보딩 완료 후)

이 문서와 에이전트별 온보딩을 읽은 직후, 실제 작업에 들어가기 전에 아래를 점검한다. 문제를 발견하면 **수정하지 말고 사용자에게 보고**한다.

### 필수 점검

| 점검 항목 | 확인 방법 | 이상 시 |
|-----------|----------|---------|
| 진입점 파일 존재 | `CLAUDE.md` 또는 `AGENTS.md` 루트에 존재 | 누락 보고 |
| 볼트 레지스트리 | `_STATUS.md`의 볼트 목록과 `Vaults/` 실제 폴더 비교 | 미등록 볼트 보고 |
| Hub 마커 | `Vaults/BasicVaults/AIHubVault/.sync/.hub_marker` 존재 | Hub 식별 불가 보고 |
| 동기화 버전 | 대상 볼트의 `_WORKSPACE_VERSION.md` 최상단 버전과 Hub 비교 | 버전 차이 보고 |

### 선택 점검 (이상 징후 발견 시)

- **문서-실제 불일치**: 규칙/온보딩이 참조하는 경로에 실제 파일이 없으면 보고
- **인덱스 부재**: 대상 볼트에 `vault_index.json`이 없으면 `/reindex` 실행 제안
- **구경로 잔재**: 스크립트/설정에서 `.sync/` 구조 이전의 경로(`_tools/cli/` 등)를 발견하면 보고
- **JSON 설정 파일**: `.obsidian/` 하위 JSON(특히 `obsidian-shellcommands/data.json`)은 구조가 깊다. **부분 읽기로 "비어 있다"고 판단하지 않는다.** 전체를 읽거나, §10의 정상 상태 기준 3가지를 직접 확인한다.

### 점검 원칙

- **수정보다 보고 우선**: 점검 단계에서는 파일을 수정하지 않는다. 발견한 문제를 목록으로 정리하여 사용자에게 보고한 뒤, 사용자 판단에 따라 수정한다.
- **작업 차단 아님**: 점검 결과가 현재 요청된 작업을 막지 않는다면, 보고 후 작업을 진행한다. 작업에 직접 영향을 주는 문제만 선행 해결을 제안한다.
- **반복 점검 금지**: 같은 세션에서 동일 점검을 반복하지 않는다. 첫 진입 시 1회만 수행.

---

## 7. 편집 모드 분리

모든 편집은 두 모드 중 하나를 선언한 후 수행한다. 모드 혼합 금지.

### Contents 모드
- 대상: `Contents/**` 하위 파일
- 콘텐츠(노트) 작성/수정 전용
- 하위 분기: `[Contents/Domain]` (지식 축적) 또는 `[Contents/Project]` (작업 관리)
- 금지: `.sync/`, `.claude/` 등 workspace 파일 수정

### Workspace 모드
- 대상: `.sync/`, `.claude/`, `.codex/`, 볼트 루트 파일
- **AIHubVault에서만 수행** (강제). 다른 볼트는 동기화로 자동 전파.
- 수정 후 `_WORKSPACE_VERSION.md`에 버전 기록 필수 (형식: `YYYYMMDDNNNN`).
- 버전 기록 없이 작업 완료 보고 금지.

---

## 8. 노트 작성 규약

### 타입과 태그 시스템 (신규 사용자 안내)

> **에이전트 필수**: 사용자가 첫 노트를 작성하거나 "타입이 뭐야?", "태그 어떻게 쓰는 거야?" 등 질문하면, 아래 내용을 기반으로 간결하게 설명한다.

모든 노트의 frontmatter에는 `type`과 `tags` 두 가지 분류 체계가 있다.

**`type`** — 노트의 유형. 목록에서 선택하는 고정값이다.
- 학습 정리 → `study-note`, 도메인 지식 → `knowledge`, 설계서 → `design`, 계획서 → `plan`
- 리서치 → `research`, 참고 자료 → `reference`, 보고서 → `report`, 가이드 → `guide`
- 이슈 관련 → `issue`, `issue-spec`, `issue-design`, `issue-report`
- 전체 목록: `.claude/rules/core/note-writing.md` § "코어 타입 목록"

**`tags`** — 노트의 내용 키워드. 검색과 상세 분류용이다.
- 기본 형식: kebab-case (`skill-system`, `game-design`), 고유명사는 원래 표기 (`Unity`, `AI`)
- **태그 형식은 사용자가 자유롭게 정할 수 있다.** 볼트 `CLAUDE.md`에 `## 태그 규칙`을 선언하면 기본 형식 대신 적용된다.
- 역할 분담: 노트 유형 → `type`, 대주제 → 볼트명·폴더, 상세 키워드 → `tags`

### Frontmatter 필수
```yaml
---
type: knowledge       # 코어 타입 목록에서 선택
tags: [Unity, skill-system]  # 내용 기반 검색 키워드
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

## 9. 세션 종료 규약

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

## 10. Hub-Sync 동기화

- AIHubVault가 단일 원본(Hub). `.sync/` 폴더 안의 모든 파일이 동기화 대상.
- Hub 식별: `.sync/.hub_marker` 파일 존재 여부.
- 동기화 실행: `node cli.js pre-sync` → 버전 비교 → `.sync/` 미러링 → 플러그인 머지.
- Obsidian에서 볼트를 열면 `on-layout-ready` 이벤트로 `node cli.js pre-sync`가 자동 실행된다 (Shell Commands 플러그인).
- workspace 편집은 반드시 AIHubVault에서 수행 → 동기화로 전파.

### Shell Commands 설정 확인 시 주의

`.obsidian/plugins/obsidian-shellcommands/data.json`을 점검할 때, `shell_commands` 배열의 실제 내용을 끝까지 읽어야 한다. 이 JSON은 구조가 깊고(약 70줄), 부분만 읽으면 "비어 있다" 또는 "경로가 다르다"고 오판하기 쉽다.

**정상 상태 기준** (모든 볼트 공통):
- `shell_commands[0].id` = `"syncworkspace"`
- `shell_commands[0].platform_specific_commands.default`에 `node "{{vault_path}}/.sync/_tools/cli-node/bin/cli.js" pre-sync` 포함
- `shell_commands[0].events.on-layout-ready.enabled` = `true`

위 3가지가 확인되면 자동 동기화 설정은 정상이다.

---

## 11. Post-Edit Review

노트 편집 완료 직후 실행:
```bash
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" review -r "{볼트경로}" -s Contents
```
- 검증: frontmatter 무결성, 인코딩 안전, WikiLink 존재.
- `POST_EDIT_REVIEW_BAD=0` 확인 전 완료 보고 금지.
- 통과 시 콘텐츠 인덱서 증분 빌드 자동 호출 (`aimv index build -i`).
- `POST_EDIT_INDEX_UPDATED=1` 확인이 완료 조건. 실패 시 수동 인덱싱:
```bash
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" index build -r "{볼트경로}" -i
```

---

## 12. 콘텐츠 인덱서

각 볼트의 `Contents/**/*.md`를 크롤링하여 `.vault_data/`에 JSON 인덱스 생성.

- 추출: path, title, type, tags, headings, summary, links_to, links_from, mtime, hash
- 증분 빌드: mtime/hash 비교로 변경된 노트만 갱신.
- 스킬: `/reindex` (현재 볼트), `/reindex all` (전체), `/reindex {볼트명}` (특정)

---

## 13. 스크립트 관리

- 새 스크립트 생성 전 `.sync/_Standards/Core/Script_Registry.md`에서 중복 확인.
- **생성 전 사용자 승인 필수.** 목적, 경로, 영향 범위, 일회성 여부를 보고.
- 경로 하드코딩 금지 — 스크립트 위치 기반 자동탐지 사용.
- 생성 후 Script_Registry.md에 등록.

---

## 14. 인코딩 안전

- `Contents` 대량 수정 전 인코딩 검증 필수.
- 대량 수정은 UTF-8 고정 I/O만 허용.
- PowerShell의 `Get-Content + Set-Content` 파이프라인으로 한국어 마크다운을 재작성하지 않는다.
- 대량 치환: dry-run → 3파일 샘플 → 전체 실행.

---

## 15. 토큰 절약

### 규칙 동적 로드 구조

- 모든 세션에 상시 주입되는 것은 `.claude/rules/core/`의 `_essentials.md`(통합 코어)와 `_skill-router.md`(키워드 → 규칙/Skill 매핑 테이블)다.
- 도메인 규칙과 참조 가이드는 `.claude/rules-archive/`에 있으며 **자동 주입되지 않는다**.
- 매 사용자 메시지 수신 시 `_skill-router.md`를 검토 → 트리거 키워드 감지 시 해당 Skill을 호출하거나 archive 규칙 파일을 Read한다.
- 이미 세션 내에서 로드된 Skill·규칙은 재실행 금지 (중복 토큰 소비 방지).
- 매칭이 없으면 `_essentials.md`만으로 작업한다.

### 일반 토큰 절약

- **핀포인트 접근**: 필요한 파일만 정확히 지정. 광범위 검색 금지.
- 경로를 모르면 사용자에게 먼저 확인.
- 대형 파일(100줄+)은 필요한 부분만 읽기. 같은 파일 반복 읽기 금지.
- 고비용 작업(대량 스캔, 복수 스크립트 실행)은 사용자 승인 후 진행.
- 자가 디버깅 반복 금지 — 수정안 제시 후 사용자 실행 위임.

---

## 16. 임시 파일 관리

- CLI 명령 실행 시 임시 파일은 `$env:TEMP` 하위에만 생성.
- 볼트 내에 임시 파일(`.vtt`, `.json`, `.tmp`, `.log` 등) 방치 금지.
- 작업 완료 후 즉시 삭제. 삭제 확인 전 완료 보고 금지.

---

## 17. Obsidian 노트/볼트 열기

이 환경의 `.md` 노트는 Obsidian 볼트 안에 있다. 노트를 열 때는 Obsidian URI를 사용한다.

```powershell
Start-Process 'obsidian://open?vault=볼트명&file=볼트루트기준_상대경로'
```

- `vault`: Obsidian에 등록된 볼트 폴더명 (예: `AIHubVault`, `Unity`, `JissouGame`)
- `file`: 볼트 루트 기준 상대 경로, `.md` 확장자 생략 (예: `Contents/Domain/Example_Note`)
- 경로 구분자: `/` 사용. 한글 파일명 그대로 사용 가능.
- `Start-Process <파일경로.md>`, `code`, `Invoke-Item` 등은 VS Code로 열리므로 금지.

### 새 볼트를 Obsidian에 등록하여 열기

새로 생성한 볼트를 Obsidian에서 처음 여는 경우, **반드시 사용자가 직접 Obsidian 볼트 매니저에서 등록**하도록 안내한다.

**안내 문구:**
> Obsidian 볼트 매니저 → "보관함 폴더 열기" → `{볼트 경로}` 선택

**`obsidian://open?path=` URI로 미등록 볼트를 여는 것을 금지한다.**
- URI 방식은 앱 상태 전환 + 등록 + 플러그인 로드를 동시 처리하여 로딩이 매우 느리다.
- 볼트 매니저에서 직접 열면 Obsidian이 이미 준비된 상태에서 열리므로 빠르다.
- URI는 **이미 등록된 볼트 전환** (`obsidian://open?vault=볼트명`) 용도로만 사용한다.

---

## 18. 보안 안내

이 시스템은 네트워크 서비스나 별도 인증 체계 없이 **로컬 파일 + 로컬 에이전트**로만 동작한다.

### 보안 경계

- **OS 레벨**: Windows 사용자 계정 권한 = 볼트 접근 권한. PC를 본인만 사용하면 파일 보안은 충분하다.
- **에이전트 레벨**: AI 에이전트(Claude Code, Codex 등)는 로컬 파일 읽기/쓰기/실행이 가능하다. 도구 실행 허가를 **"확인 후 승인"** 모드로 설정하면 의도치 않은 파일 조작을 방지할 수 있다.

### 주의사항

- **클라우드 동기화 폴더 회피**: OneDrive 등 자동 동기화 폴더에 볼트를 두면 노트가 클라우드에 평문 노출된다. 민감한 연구 데이터를 다루는 경우 동기화 폴더 밖에 배치한다.
- **자동 실행 스크립트**: Obsidian에서 볼트를 열면 `node cli.js pre-sync`가 자동 실행되어 Hub→위성볼트 설정 동기화를 수행한다. 소스: `.sync/_tools/cli-node/src/commands/pre-sync.js`
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
| 유저 가이드 | `.claude/rules/core/user-guidance.md` |

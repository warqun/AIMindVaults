# Essentials (Mandatory · Always Loaded)

> 모든 세션 상시 적용. 작업 유형과 무관하게 준수한다.
> 도메인 전용 규칙은 `_skill-router.md`를 참조하여 트리거 시 로드한다.
> 세부 규칙은 `.claude/rules-archive/` 원본 파일 참조.

## 1. 보고 언어

- 사용자에게 하는 모든 보고·응답은 **한국어 기본**.
- 코드, 파일명, 경로, 기술 용어, 식별자는 **영어 원문 유지**.
- 다른 언어 요청 시에만 해당 언어로 응답.
- 배포본(SellingVault) 문서 번역·리라이트 산출물은 대상 언어로 작성.

## 2. 토큰 절약 (강제)

### 콘텐츠 인덱서 우선 (강제)

볼트 내 노트 탐색 시 **반드시 인덱서 먼저 사용**. 인덱서 없이 Grep/Glob 전면 스캔 금지.

```bash
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" index search -r "{볼트경로}" -q "검색어"
# -t <태그>, --type <타입>, -f compact -n 5
```

fallback 조건: `vault_index.json` 없음 / 인덱서 0건인데 존재 가능성 높음 / 비콘텐츠 파일(`.obsidian/`, `_tools/`).

### 터미널 실행 위임

- 확신 코드를 제시 → 사용자 실행 → 결과 받아 다음 단계.
- 자가 디버깅 반복 금지 (run → fail → retry).
- 예외: 사용자가 "직접 실행해" 명시한 경우.

### 금지

| 금지 | 대안 |
|------|------|
| 광범위 파일 검색 (전체 스캔) | 인덱서 → 사용자에게 경로 확인 |
| 대형 파일 전체 읽기 | 필요한 줄 범위만 |
| 같은 파일 반복 읽기 | 첫 읽기 결과 재사용 |
| 자가 디버깅 반복 | 수정안 제시 후 사용자 실행 |
| 불필요한 확인/검증 | 이미 아는 정보 생략 |

## 3. 볼트 라우팅

- 노트/콘텐츠 생성 전 **루트 `_STATUS.md` 볼트 레지스트리** 확인 → 적절한 볼트 선택.
- 루트 `CLAUDE.md` 키워드 추론 블록도 참조.
- **BasicContentsVault 금지**: AIHubVault 배포용 복제 볼트, 직접 콘텐츠 작업 금지. `/create-vault` 스킬 전용.

### 미등록 볼트 발견 시

루트 `_STATUS.md` 볼트 레지스트리에 즉시 등록 (볼트명, 타입, 콘텐츠 설명, 경로, 작업 에이전트).

### 볼트 첫 접근 시 인덱스 빌드 (강제)

`vault_index.json`이 없으면 빌드:

```bash
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" index build -r "{볼트경로}"
```

### 라우팅 판단 시 볼트 CLAUDE.md 참조

카테고리만으로 대상이 명확하지 않을 때, 후보 볼트 CLAUDE.md의 "수집 범위"와 "수집하지 않는 것"을 확인.

## 4. 편집 모드 분리 (크리티컬)

모든 편집은 **`[Contents]` 또는 `[workspace]` 중 하나**. 혼합 금지.

- `[Contents]` — `Contents/**` 콘텐츠만. `_Standards/`, `_tools/`, `.codex/`, `.claude/`, 볼트 루트 파일 수정 금지.
- `[workspace]` — `_Standards/`, `_tools/`, `.codex/`, `.claude/`, 볼트 루트만. `Contents/**` 수정 금지.

Contents 모드 내부: `[Contents/Domain]`(지식) 또는 `[Contents/Project]`(작업) 분기.

### [workspace] 모드 — 어느 Hub 에서 편집할지 (Multi-Hub 강제)

**2026-04-20 Multi-Hub Phase 1 이후**: Hub 가 Core Hub (`CoreHub/`) + Preset Hub (`AIHubVault/`, hubId=default) 로 분리됨.

| 편집 대상 | 편집 위치 | 전파 경로 |
|----------|---------|---------|
| Core 계층 (`.sync/_tools/`, `.sync/_Standards/Core/`, `.sync/schemas/`, Core 6 플러그인) | **CoreHub** 에서만 | CoreHub → Preset Hub (`core-sync-all`) → 위성 (`sync`) |
| Custom 계층 (`.obsidian/plugins/` 중 Custom, `.claude/rules/custom/` 등) | **AIHubVault (Preset)** 에서 | Preset → 위성 (기존 sync) |
| 루트 `.claude/rules/core/`, `.claude/commands/core/` | **AIMindVaults 루트** | Claude CWD ancestry 자동 상속 + `deploy` 로 SellingVault 배포 |
| 볼트별 `CLAUDE.md`, `_STATUS.md` | 해당 볼트 | 전파 안 함 (볼트 개별) |

**Core 편집 워크플로우 (강제):**
1. CoreHub 에서 파일 수정
2. **즉시** `node .sync/_tools/cli-node/bin/cli.js bump-version -m "변경 내용" --broadcast` 실행
   - `--broadcast` 가 `core-sync-all` 자동 체인 → 모든 Preset Hub 에 Push
   - **이 명령 실행 전 완료 보고 금지** (D1 강제)
3. Preset Hub `_WORKSPACE_VERSION.md` 는 자동 갱신 안 됨 — 위성에 Preset 변경 알릴 때만 별도 `bump-version` 수동

**Preset Hub (AIHubVault) workspace 편집 순서 (강제):**
1. 파일 수정 (Custom 계층만)
2. **즉시** AIHubVault 의 `_WORKSPACE_VERSION.md` 에 버전 기록 (`bump-version -m "..."`)
3. 위성은 다음 pre-sync 시 수신

**절대 금지:**
- Core 계층 (CORE_PATHS) 을 Preset Hub 또는 위성에서 직접 편집. 반드시 CoreHub 에서.
- 위성에서 `.sync/hub-marker.json` 또는 `.hub_marker` 수동 작성 (자기를 Hub 로 오판).

### 루트 레벨 편집 — 버전 기록 (강제)

- 멀티볼트 루트 (`.claude/`, `.antigravity/`, 루트 설정 파일) 변경 시 `_ROOT_VERSION.md`에 기록.
- 형식: `R` + 순번 3자리 (`R001`).
- 테이블 최상단에 추가.

## 5. 편집 후 검증 (Post-Edit Review, 강제)

노트 편집 완료 직후:

```bash
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" review -r "{볼트경로}" -s Contents
```

- `POST_EDIT_REVIEW_BAD=0` 확인 전 완료 보고 금지.
- **노트 작업은 콘텐츠 인덱싱까지 완료되어야 끝남.**
  - 기본 경로: `review`가 통과 후 `index build -i` 자동 호출 → `POST_EDIT_INDEX_UPDATED=1` 확인
  - `POST_EDIT_INDEX_SKIPPED=1` 또는 미업데이트면 수동 인덱싱:

```bash
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" index build -r "{볼트경로}" -i
```

Obsidian CLI 우선: 조회/검색/히스토리 복구는 `node cli.js bridge` 먼저, 파일 직접 파싱은 CLI 결과 부족 시에만.

## 6. 노트 작성 (Frontmatter · H1 · 파일명)

### Frontmatter 필수

- 모든 노트는 YAML Frontmatter (`---`)로 시작.
- 필수: `type`, `tags`, `updated` 또는 `created`.
- `agent`: 작업 에이전트 **누적** 기록 (최신만 X). 복수는 `[claude, codex]`.

### `type` 규칙

- **kebab-case**, **단수형**, **`-note` 접미사 금지** (`knowledge` O / `knowledge-note` X).
- 코어 타입 목록 (원문은 `.claude/rules-archive/note-writing.md` § "코어 타입 목록"):
  - 콘텐츠: `study-note`, `knowledge`, `design`, `plan`, `research`, `reference`, `report`, `spec`, `guide`, `concept`, `memo`
  - 이슈: `issue`, `issue-index`, `issue-spec`, `issue-design`, `issue-report`, `debug-design`
  - 임시: `temp-draft`, `temp-review`
  - 구조: `standard`, `folder-index`
- 볼트 전용 타입은 해당 볼트 `CLAUDE.md`에 선언.
- 미등록 타입 임의 사용 금지 → 사용자에게 제안 후 등록.

### `tags` 규칙 (기본 형식)

- **고유명사**: 원래 표기 (`Unity`, `AI`, `Obsidian`, `Claude`, `MCP`).
- **그 외**: kebab-case (`skill-system`, `plugin-dev`).
- **Flat 전용**: `/` 계층 금지.
- **단수형**: `systems` X → `system`.
- 볼트 식별 태그 비권장 (인덱서 `vault` 필드로 식별).
- 볼트 `CLAUDE.md`에 "태그 규칙" 선언 시 그것이 우선.

### H1 제목 · 파일명 (강제)

- URI 예약문자 금지: `#`, `%`, `&`, `?`, `+`.
- 이모지 금지.
- 대체: `C#` → `CSharp`, `C++` → `CPP`, `Q&A` → `QnA`.
- 가독성은 frontmatter `aliases`로.

### 위키링크 필수 (강제)

- 새 노트 생성 시 같은 볼트 내 관련 노트에 `[[위키링크]]` 1개 이상 포함.
- 파일명 기반 해석이므로 파일명 규칙 준수가 전제.

### 마크다운 볼드 규칙

- `**텍스트(괄호)**` 금지 — Obsidian에서 `**`가 렌더링되지 않음.
- 괄호는 볼드 밖: `**텍스트** (괄호)` 또는 `**텍스트**: 괄호`.

### 표현 규칙

- 비유/은유 금지. 작업명·제목은 내용 직접 서술.
- 날짜: `YYYY-MM-DD`만.

### 금지

- 동일 문서 내 중복 결론.
- 미확정 내용을 확정으로 표현.

## 7. 세션 종료 (강제)

### _STATUS.md 갱신 (필수)

세션 종료 시 작업한 볼트의 `_STATUS.md` **직접 갱신**:
- **Now**: 완료/진행 중 작업
- **Next**: 다음에 이어서 할 작업
- **Blocked**: 막힌 사항 (없으면 "없음")
- **Decisions**: 내린 결정 (`(YYYY-MM-DD)` 형식)

루트 `_STATUS.md` 볼트 레지스트리의 해당 볼트 작업 에이전트 날짜도 갱신 (`에이전트명 / YYYY-MM-DD`). 레지스트리에 없으면 추가.

**볼트 + 루트 양쪽 갱신 없이 세션 종료 금지.**

### 세션 핸드오프 노트 (필수)

- Claude → `_SESSION_HANDOFF_CLAUDE.md`
- Codex → `_SESSION_HANDOFF_CODEX.md`

각 에이전트는 **자신의 파일만** 갱신. 최신 1회분만 유지 (이력 축적 X).

기록: 작업 요약 (1~3줄), 볼트별 변경 (경로 중심), 결정 (`(YYYY-MM-DD)`), 다음 세션 첫 작업, 주의.

### 볼트별 핸드오프와 루트 핸드오프 연동 (필수)

개별 볼트에 `_SESSION_HANDOFF_{에이전트}.md` 작성 시 루트 핸드오프 **볼트별 변경** 섹션에 참조 남김:

```markdown
### {볼트명} (`{볼트경로}`)
- 상세 핸드오프: `{볼트경로}/_SESSION_HANDOFF_{에이전트}.md` 참조
- 1줄 요약
```

## 8. 참조 (원본 규칙)

본 문서는 아래 규칙들을 통합한 상시 코어다. 세부 규정·배경·Incident Rule은 원본 참조:

- `.claude/rules-archive/token-optimization.md` — 토큰 절약 상세
- `.claude/rules-archive/session-exit.md` — 세션 종료 상세
- `.claude/rules-archive/note-writing.md` — 노트 작성 전체 (타입 목록, 태그 규칙, Frontmatter 세부)
- `.claude/rules-archive/vault-routing.md` — 라우팅 규칙 상세
- `.claude/rules-archive/post-edit-review.md` — Post-Edit Review 상세
- `.claude/rules-archive/edit-mode-separation.md` — 편집 모드 상세
- `.claude/rules-archive/report-language.md` — 보고 언어 원문

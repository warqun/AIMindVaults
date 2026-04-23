# /create-preset-hub — 새 Preset Hub 생성 (Multi-Hub 아키텍처)

CoreHub 에서 파생하여 신규 Preset Hub 볼트를 만든다.
"어디에 경로를 지정하고 동기화는 어떻게 걸리는지" 를 체계적으로 수행하는 스킬.

---

## 1. 사용법

```
/create-preset-hub <hubId> [--name "<Display Name>"] [--desc "<one-line>"]
```

예시:
- `/create-preset-hub gamedev --name "Game Dev Preset Hub" --desc "Unity·GameDesign 번들"`
- `/create-preset-hub writing`
- `/create-preset-hub diary-v2 --name "Diary Preset v2"`

`hubId` 규칙: **kebab-case 소문자** · 숫자 허용 · 첫 글자는 영문·숫자 (`^[a-z0-9][a-z0-9-]*$`). 전체 Multi-Hub 토폴로지에서 **고유 식별자** 로 기능하므로 기존 hubId (`core`, `default`, `minimal`, `diary`, `domain`, `lab`, `project`) 와 충돌 금지.

---

## 2. 전제 조건

1. **CoreHub 존재** — `C:/AIMindVaults/Vaults/BasicVaults/CoreHub/` 에 `hub-marker.json` (hubType=core) 작성되어 있어야 한다.
2. **Preset 명세 사전 작성 권장** — 복잡한 Preset (플러그인 번들, 폴더 구조, 템플릿, QuickAdd, Dataview) 은 먼저 `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/` 에 `YYYYMMDD_<Hub명>_명세.md` 를 작성한 뒤 이 스킬 실행. 단순 Preset 은 생략 가능.
3. **hubId 중복 확인** — `ls Vaults/BasicVaults/` 로 기존 Preset Hub 들의 hubId 와 충돌 없는지 확인.

---

## 3. 경로 지정 — 무엇이 어디서 결정되는가

| 항목 | 지정 위치 | 값 예 | 자동/수동 |
|------|---------|------|----------|
| **Target Path** (새 Preset Hub 물리 경로) | CLI `--target-path` | `C:/AIMindVaults/Vaults/BasicVaults/AIHubVault_<suffix>/` | 사용자 지정 |
| **Source Core Hub** | CLI `--from` (생략 시 자동탐지) | `C:/AIMindVaults/Vaults/BasicVaults/CoreHub/` | 자동탐지 (스크립트 위치 기반 5단계 상위) |
| **hubId** | CLI `--hub-id` | `gamedev`, `writing` | 사용자 지정 · 필수 |
| **hubName** | CLI `--hub-name` | `"Game Dev Preset Hub"` | 선택 · 생략 시 폴더명 |
| **coreHub 상대경로** | `hub-marker.json` 자동 작성 | `"../CoreHub"` | 자동 계산 (Target → Source 상대경로) |
| **coreHubVersion** (호환성 범위) | `hub-marker.json` **수동 편집** | `"^1.0.0"` | **수동** (create-hub 은 쓰지 않음) |

**중요**: `create-hub` CLI 는 `hub-marker.json` 의 `hubId`, `hubType`, `hubName`, `coreHub`, `version`, `description`, `createdAt` 까지만 자동 작성한다. **`coreHubVersion` 은 사용자가 수동 기입** 해야 `core-sync-all` 시 호환성 체크가 동작한다.

---

## 4. 단계별 실행

### 4.1 단계 1 — `create-hub` CLI 실행 (자동 복제 + 초기화)

```bash
cd C:/AIMindVaults/Vaults/BasicVaults/CoreHub
node .sync/_tools/cli-node/bin/cli.js create-hub \
  --target-path "C:/AIMindVaults/Vaults/BasicVaults/AIHubVault_<suffix>" \
  --hub-id "<hubId>" \
  --hub-name "<Display Name>" \
  --description "<한 줄 요약>"
```

**`create-hub` 가 자동 수행하는 5단계** (`create-hub.js` 참조):

| # | 단계 | 결과물 |
|---|------|--------|
| 1/5 | Core Hub 미러 복사 | 새 볼트 전체 파일 구조 (`.git`, `smart-connections`, `cache`, `workspace.json` 등 제외) |
| 2/5 | Per-device 플러그인 설정 제거 | `.obsidian/plugins/obsidian-git/data.json`, `.obsidian/plugins/claudian/data.json` 삭제 |
| 3/5 | `.sync/hub-marker.json` 작성 | `hubType=preset`, `coreHub=<상대경로>`, `createdAt=<오늘>` |
| 4/5 | Preset 전용 진입 파일 재작성 | `CLAUDE.md`, `_STATUS.md`, `README.md` (Core Hub 원본을 Preset 용으로 갈아엎음) |
| 5/5 | `make-md` `systemName` 갱신 | 볼트명으로 재작성 (사이드바 네비 라벨) |

**CLI 가 자동으로 하지 않는 것** (후속 단계에서 수동):

- Custom 플러그인 설치 (Core 7 만 복사됨)
- `hub-marker.json` 의 `coreHubVersion` 기입
- `.obsidian/community-plugins.json` 에 Custom 플러그인 ID 추가
- 템플릿 배치 · QuickAdd 명령 등록 · Dataview 대시보드
- 루트 `_STATUS.md` 볼트 레지스트리 등록

### 4.2 단계 2 — `hub-marker.json` 최종화 (수동 편집)

**편집 위치**: `{새 Preset Hub}/.sync/hub-marker.json`

```json
{
  "hubId": "<hubId>",
  "hubType": "preset",
  "hubName": "<Display Name>",
  "version": "1.0.0",
  "coreHub": "../CoreHub",
  "coreHubVersion": "^1.0.0",              // ← 수동 추가 (호환성 범위)
  "description": "<명세 기반 요약>",          // ← 구체화
  "defaultTemplate": "BasicContentsVault",  // ← 수동 추가 (위성 clone 시 기본 소스)
  "createdAt": "YYYY-MM-DD"
}
```

**`coreHubVersion` 범위 선택 가이드**:

| 범위 | 의미 | 권장 상황 |
|------|------|----------|
| `^1.0.0` | 같은 major (1.x.x) | 일반 Preset (기본 권장) |
| `~1.2.0` | 같은 minor (1.2.x) | Breaking change 민감 |
| `>=1.0.0` | 1.0.0 이상 | 개방형 호환 |
| `"1.0.0"` | 정확히 1.0.0 | 엄격 핀 (비권장 — 업그레이드 차단) |

**`defaultTemplate` 해석 규칙** (`clone-vault.js` 참조):

| 값 형태 | 해석 | 예 |
|---------|------|-----|
| 이름만 (`"BasicDomainVault"`) | `BasicVaults/<이름>` (Hub 형제) | `C:/AIMindVaults/Vaults/BasicVaults/BasicDomainVault` |
| 상대경로 (`"../BasicDiaryVault"`) | Hub 루트 기준 상대 | 상위 계층까지 올라가 탐색 |
| 절대경로 | 그대로 사용 | Windows: `C:/...`, Unix: `/...` |
| 미지정 또는 실존 안 함 | `BasicContentsVault` 폴백 | 공통 템플릿 |

위성이 이 Preset 에 `clone --hub <Preset>` 로 바인딩할 때 `--source-path` 생략 시 이 값으로 복제 소스 결정. 사용자가 `Vaults/BasicVaults/MakeCloneVault.bat/.sh` 런처로 생성할 때도 자동 적용.

### 4.3 단계 3 — Custom 플러그인 설치

**Core 7 플러그인은 이미 복사됨** (`obsidian-local-rest-api`, `obsidian-advanced-uri`, `obsidian-shellcommands`, `dataview`, `templater-obsidian`, `obsidian-linter`, `make-md`).

**Custom 플러그인 설치 방법** (둘 중 택1):

#### 방법 A: Obsidian 에서 직접 설치 (권장)

1. Obsidian 볼트 매니저 → "보관함 폴더 열기" → 새 Preset Hub 경로
2. Community Plugins 에서 명세의 Custom 번들 설치
3. 각 플러그인을 **Enable** 토글

#### 방법 B: 기존 Preset 에서 복사 (명세가 기존과 비슷할 때)

```bash
# 예: AIHubVault (Default Preset) 에서 quickadd, metadata-menu 복사
SRC=C:/AIMindVaults/Vaults/BasicVaults/AIHubVault/.obsidian/plugins
TGT=C:/AIMindVaults/Vaults/BasicVaults/AIHubVault_<suffix>/.obsidian/plugins
cp -r "$SRC/quickadd" "$TGT/"
cp -r "$SRC/metadata-menu" "$TGT/"
```

그런 뒤 `.obsidian/community-plugins.json` 에 plugin ID 추가. **이 JSON 편집은 Read → Edit 직접 수정** (PowerShell `ConvertFrom-Json | ConvertTo-Json` 파이프라인 금지 — `obsidian-config-safety.md` 참조).

### 4.4 단계 4 — 명세별 구성 (선택)

Preset 명세에 따라:

- **Templater**: `{Hub}/.obsidian/plugins/templater-obsidian/templates/` 에 템플릿 배치 + Templater 설정에서 folder template 바인딩
- **QuickAdd**: 단축 실행 명령 등록 (Obsidian UI)
- **Dataview 대시보드**: `_STATUS.md` 또는 별도 `Dashboard.md` 에 쿼리 배치
- **폴더 구조**: Zettelkasten 타입별 폴더 (`00_Fleeting/`, `02_Permanent/` 등) 생성

자세한 구성은 해당 Preset 명세 (`Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/YYYYMMDD_<Hub명>_명세.md`) 참조.

### 4.5 단계 5 — 루트 레지스트리 등록

#### 5a. 루트 `_STATUS.md` 볼트 레지스트리에 추가

`C:/AIMindVaults/_STATUS.md` 의 **BasicVaults** 섹션 테이블에 행 추가:

```markdown
| AIHubVault_<suffix> | Preset Hub (<hubId>) | `Vaults/BasicVaults/AIHubVault_<suffix>/` | <description> | claude / YYYY-MM-DD |
```

#### 5b. `_ROOT_VERSION.md` 에 기록

```markdown
| R0XX | YYYY-MM-DD | 🕓 | 🕓 | **AIHubVault_<suffix> Preset Hub 신규 생성** — hubId="<hubId>", coreHub=../CoreHub, coreHubVersion=^1.0.0. Core 7 + Custom <N>. 명세: `<명세 파일 경로>`. |
```

---

## 5. 동기화 흐름 — 생성 후 어떻게 연결되는가

### 5.1 Core 계층 (CoreHub → 이 Preset Hub, Push)

**누가**: CoreHub 편집자
**언제**: CoreHub 에서 `.sync/_tools/`, `.sync/_Standards/Core/`, `.sync/schemas/`, Core 7 플러그인 변경 직후
**방법**:

```bash
cd C:/AIMindVaults/Vaults/BasicVaults/CoreHub
node .sync/_tools/cli-node/bin/cli.js bump-version -m "변경 내용" --broadcast
```

`--broadcast` 가 `core-sync-all` 을 자동 체인 → 모든 Preset Hub (이 신규 Preset 포함) 로 Core 계층 Push.

**호환성 체크**: 각 Preset 의 `hub-marker.json` 의 `coreHubVersion` 과 CoreHub `version` 이 매칭 안 되면 SKIP. `--force` 로 무시 가능.

### 5.2 Custom 계층 (이 Preset Hub 내부 편집)

**누가**: 이 Preset Hub 편집자
**언제**: `.obsidian/plugins/` Custom 추가/삭제, `.claude/rules/custom/`, `.claude/commands/custom/` 편집 시
**방법**:

```bash
cd C:/AIMindVaults/Vaults/BasicVaults/AIHubVault_<suffix>
node .sync/_tools/cli-node/bin/cli.js bump-version -m "Custom 변경 내용"
```

이 Preset Hub 의 `_WORKSPACE_VERSION.md` 만 올라가며 CoreHub 에는 영향 없음. 위성은 다음 pre-sync 시 이 버전 상승 감지 → Hub 트램펄린 재실행.

### 5.3 위성 바인딩 (위성 → 이 Preset Hub)

#### 방법 A: 신규 위성 생성 시 `--hub` 지정 (권장)

```bash
cd C:/AIMindVaults/Vaults/BasicVaults/BasicContentsVault
node .sync/_tools/cli-node/bin/cli.js clone \
  --target-path "C:/AIMindVaults/Vaults/<카테고리>/<볼트명>" \
  --project-name "<볼트명>" \
  --hub "C:/AIMindVaults/Vaults/BasicVaults/AIHubVault_<suffix>"
```

`clone-vault.js` 가 `.sync/hub-source.json` 을 자동 작성:

```json
{
  "hubPath": "../../BasicVaults/AIHubVault_<suffix>",
  "hubId": "<hubId>",
  "bindAt": "YYYY-MM-DD"
}
```

#### 방법 B: 기존 위성을 이 Preset 으로 재바인딩 (`rebase`)

```bash
cd C:/AIMindVaults/Vaults/<카테고리>/<볼트명>
node .sync/_tools/cli-node/bin/cli.js rebase \
  --hub "C:/AIMindVaults/Vaults/BasicVaults/AIHubVault_<suffix>" --dry-run
# 문제 없으면 --dry-run 제거 후 재실행
```

#### 방법 C: 수동으로 `.sync/hub-source.json` 작성

위성 볼트 `.sync/hub-source.json` 을 직접 만든다:

```json
{
  "hubPath": "<위성 → Preset Hub 상대경로>",
  "hubId": "<hubId>",
  "bindAt": "YYYY-MM-DD"
}
```

`hubPath` 는 위성 볼트 루트에서 Preset Hub 루트까지의 **상대경로** (예: `../../BasicVaults/AIHubVault_gamedev`). 절대경로 금지.

### 5.4 동기화 실행 (위성 → Preset Hub → 위성)

위성에서 워크스페이스 동기화 시:

```bash
cd C:/AIMindVaults/Vaults/<카테고리>/<볼트명>
node .sync/_tools/cli-node/bin/cli.js sync
```

`pre-sync.js` 가 자동 수행:
1. `.sync/hub-source.json` 읽기 → `hubPath` 로 Preset Hub 해석
2. Preset Hub `_WORKSPACE_VERSION.md` 와 위성 버전 비교
3. Preset Hub 가 더 최신이면 **트램펄린 재실행** (Hub 의 CLI 로 자신을 재호출)
4. `sync-workspace.js` 가 Preset Hub 파일을 위성에 Pull + `community-plugins.json` folder-set union 병합

---

## 6. 검증

### 6.1 CoreHub 에서 Preset 감지 확인

```bash
cd C:/AIMindVaults/Vaults/BasicVaults/CoreHub
node .sync/_tools/cli-node/bin/cli.js core-sync-all --dry-run
```

출력에 `--- Preset Hub: <hubId> (...) ---` 섹션이 나오면 감지 성공.

### 6.2 위성이 이 Preset 을 Hub 로 인식하는지

```bash
cd C:/AIMindVaults/Vaults/<바인딩한 위성>
node .sync/_tools/cli-node/bin/cli.js sync --dry-run
```

출력에 `Hub: AIHubVault_<suffix>` (hub-source.json 경로) 가 나와야 한다.

### 6.3 hub-marker.json 스키마 검증

`Vaults/BasicVaults/CoreHub/.sync/schemas/hub-marker.schema.json` 에 대조:
- `hubId` kebab-case 패턴 만족
- `hubType = "preset"`
- `coreHub` 경로 존재
- (권장) `coreHubVersion` 명시

### 6.4 Obsidian 실행 검증

Obsidian 에서 이 Preset Hub 를 볼트 매니저로 열고:
- Core 7 플러그인 로드 확인
- Custom 플러그인 활성화 확인
- `make-md` 좌측 네비게이션의 볼트명 확인

---

## 7. 금지 사항

- **수동 폴더 복사 금지** — `cp -r`, `Copy-Item`, `robocopy` 로 CoreHub 복제 금지. 반드시 `create-hub` CLI 사용 (per-device 설정 정리 + hub-marker 작성 + make-md systemName 갱신을 누락할 위험).
- **기존 hubId 재사용 금지** — Multi-Hub 전체에서 hubId 는 유일해야 함.
- **Preset-of-preset 파생 금지** (MVP) — `--from` 에 다른 Preset Hub 를 지정하면 경고. Flat 토폴로지 (Core 1 + Preset N) 유지.
- **`.sync/_tools/`, `.sync/_Standards/Core/`, `.sync/schemas/` 편집 금지** (이 Preset 에서) — Core 계층은 CoreHub 에서만 편집. 이 Preset 에서 편집 시 다음 `core-sync-all` 에 덮어쓰여 변경 증발.
- **CoreHub 에 이 Preset 을 위성으로 바인딩 금지** — CoreHub 는 직접 위성을 갖지 않음. 위성은 Preset Hub 경유.

---

## 8. 참조

- **CLI 소스**: `Vaults/BasicVaults/CoreHub/.sync/_tools/cli-node/src/commands/create-hub.js`
- **스키마**: `Vaults/BasicVaults/CoreHub/.sync/schemas/hub-marker.schema.json` · `hub-source.schema.json`
- **Multi-Hub 설계**: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`
- **Phase 1 구현 결과**: 같은 폴더 `20260420_Multi_Hub_Phase1_구현_결과.md`
- **Preset 명세 예**: `20260420_Diary_Hub_명세.md` · `20260421_Domain_Hub_명세.md` · `20260421_Lab_Hub_명세.md` · `20260421_Project_Hub_명세.md`
- **관련 스킬**: `/create-vault` (위성 생성 · `--hub` 로 이 Preset 에 바인딩), `/install-plugin` (Custom 플러그인 설치), `/hub-broadcast` (단일 파일 Hub → 위성 전파)
- **관련 규칙**: `.claude/rules/core/_essentials.md § 4` (편집 모드 · Multi-Hub 강제), `.claude/rules/core/obsidian-config-safety.md` (community-plugins.json 편집)

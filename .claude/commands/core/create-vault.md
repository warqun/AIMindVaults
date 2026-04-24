# /create-vault — 새 볼트 생성 (Multi-Hub 아키텍처)

신규 Obsidian 볼트를 생성한다. BasicContentsVault 를 소스로 복제하고, 사용자 선택에 따라 특정 Hub 에 바인딩.

## 사용법

```
/create-vault <카테고리>/<볼트명>
```

예시:
- `/create-vault Domains_Infra/Notion`
- `/create-vault Domains_Game/Unreal`
- `/create-vault Projects_GameTool/Project_RPG`

## 프로세스

### 1. 경로 확인

- 대상 경로: `C:/AIMindVaults/Vaults/<카테고리>/<볼트명>`
- 카테고리 폴더가 없으면 생성 불가 — 사용자에게 확인
- 이미 존재하는 볼트명이면 중단

### 2. Hub 선택 (Multi-Hub · 2026-04-20 이후)

위성 볼트가 바인딩할 Hub 를 사용자에게 확인한다.

| 선택지 | 설명 | 해당 경우 |
|--------|------|----------|
| **(기본) AIHubVault — Default Preset Hub** | `hubId="default"`, `hubType="preset"`. 27 위성이 현재 바인딩한 기본 번들 (Core + Custom A) | 일반 작업 · 기존 환경과 동일 |
| **CoreHub — Core Hub** | `hubId="core"`, `hubType="core"`. Core 번들만 (Custom 플러그인 없음) | 최소 환경 선호 · 필요 시 사용자가 직접 Custom 관리 |
| **기타 Preset Hub** | 별도로 생성한 Preset Hub | 사용자가 자체 Preset 보유 시 |

**모호하면 기본값 (AIHubVault, Default Preset)** 으로 진행. 사용자가 명시 (`--hub` 옵션, "Core Hub에 바인딩", "AIHubVault_xxx 에 바인딩") 시 해당 값 사용.

### 3. clone 커맨드 실행 (강제 — 수동 복사 금지)

```bash
node "{BasicContentsVault}/.sync/_tools/cli-node/bin/cli.js" clone \
  -t "C:/AIMindVaults/Vaults/<카테고리>/<볼트명>" \
  -n "<볼트명>" \
  --hub "<Hub 절대경로>"
```

- 소스: **BasicContentsVault** (범용 볼트 템플릿, 자동 감지)
- `--hub` 옵션으로 바인딩 Hub 경로 지정 → `.sync/hub-source.json` 자동 작성
- `--hub` 생략 시: legacy scan 폴백 (Vaults/ 밑 첫 번째 Hub = AIHubVault)
- 반드시 이 CLI 를 사용한다. `Copy-Item`, `cp`, `xcopy` 등 수동 복사 금지.
- AIHubVault 는 소스로 사용하지 않음 (Preset Hub 는 Custom 번들이라 무거움). BasicContentsVault 가 최소 템플릿.
- **상세 규칙(필수 결정 항목·후속 작업·상위 폴더 분류·배포 제외 항목) 참조**: `.claude/rules-archive/vault-individualization.md` Read

### 예시

AIHubVault (Default Preset) 에 바인딩:
```bash
node "{BasicContentsVault}/.sync/_tools/cli-node/bin/cli.js" clone \
  -t "C:/AIMindVaults/Vaults/Domains_Infra/Notion" \
  -n "Notion" \
  --hub "C:/AIMindVaults/Vaults/BasicVaults/AIHubVault"
```

CoreHub (Core Hub · 최소 환경) 에 바인딩:
```bash
node "{BasicContentsVault}/.sync/_tools/cli-node/bin/cli.js" clone \
  -t "C:/AIMindVaults/Vaults/Domains_Dev/Rust" \
  -n "Rust" \
  --hub "C:/AIMindVaults/Vaults/BasicVaults/CoreHub"
```

### 3. 생성 후 필수 작업

1. 새 볼트의 `CLAUDE.md` 수정:
   - 제목을 `# <볼트명> — <볼트 역할 설명>`으로 변경
   - "이 볼트의 역할" 섹션을 실제 용도에 맞게 변경
   - 디렉토리 구조를 실제 구조에 맞게 변경
   - tags에 볼트 고유 태그 추가
2. 새 볼트의 `_STATUS.md` 초기화:
   - "이 볼트의 역할"을 실제 용도에 맞게 변경 (복제 소스 설명 제거)
   - Now/Next/Blocked 비우기
3. 루트 `CLAUDE.md` 볼트 레지스트리에 새 볼트 등록
4. 루트 `_STATUS.md` 볼트 레지스트리에 새 볼트 행 추가 (타입, 콘텐츠 설명, 작업 에이전트)
5. `_ROOT_VERSION.md`에 변경 기록

### 4. Obsidian에 볼트 등록 안내

사용자에게 직접 등록하도록 안내한다:

> Obsidian 볼트 매니저 → "보관함 폴더 열기" → `{생성된 볼트 경로}` 선택

**`obsidian://open?path=` URI로 미등록 볼트를 여는 것을 금지한다.**
URI 방식은 앱 상태 전환 + 등록 + 플러그인 로드를 동시 처리하여 로딩이 매우 느리다.
이미 등록된 볼트 전환에만 `obsidian://open?vault=` URI를 사용한다.

### 5. 완료 보고

생성된 볼트 경로와 수행한 후속 작업을 사용자에게 보고.

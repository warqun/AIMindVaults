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
- **상세 규칙(필수 결정 항목·후속 작업·상위 폴더 분류·배포 제외 항목) 참조**: `.agents/rules/custom/CreateVault/vault-individualization.md` Read

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

### 4. 생성 후 필수 작업

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
6. **초기 콘텐츠 인덱스 빌드** (강제 — 상세는 `vault-individualization.md § 볼트 생성 후 필수 작업` 4번 참조)

### 5. Obsidian obsidian.json 등록 (강제 — 자동화 우선, 2026-06-05 incident)

**누락 시 viz / `obsidian://advanced-uri/` 링크가 `Vault not found` 에러 발생 → 후속 incident.** 이전에 GUI 안내만 했던 운영을 CLI 자동 등록 우선으로 격상 (R159 결정).

#### 5-1. CLI 자동 등록 (권장 경로 · 우선 시도)

```bash
node "{CoreHub}/.sync/_tools/cli-node/bin/cli.js" register-vaults -r "C:/AIMindVaults" --apply
```

- **전제**: 모든 Obsidian 인스턴스 종료. CLI 가 실행 중 감지 시 차단 (`--force` / `--skip-process-check` 는 **사용 금지**).
- **Obsidian 재시작은 회피 불가** (2026-08-26 조사 확정). Obsidian 은 `obsidian.json` 을 시작 시점에 읽으므로 실행 중인 인스턴스에 새 볼트를 밀어 넣는 경로가 없다. `--force` 로 강행해도 그 인스턴스는 새 볼트를 못 본다 — 손실 위험만 떠안고 얻는 게 없다.
- 흐름:
  1. dry-run 으로 `TO ADD` 가 새 볼트 1건만 잡히는지 먼저 확인 (`--apply` 없이 호출)
  2. `--apply` 호출
  3. **Obsidian 이 닫혀 있었다면** → `obsidian.json.bak_YYYYMMDD_HHMMSS` 자동 백업 + `Added : N vault entries` 확인 → 사용자에게 "Obsidian 실행 시 볼트 목록에 표시, 첫 진입 시 *Trust author and enable plugins* 클릭" 안내
  4. **Obsidian 이 켜져 있었다면** → CLI 가 차단하고 끝난다. **여기서 볼트 생성 플로우를 멈추지 않는다.**

#### 5-2. Obsidian 이 켜져 있을 때 — 막지 말고 미룬다 (강제)

**"지금 Obsidian 다 닫아주세요" 라고 요구하지 않는다.** 작업 흐름을 끊는 비용이 등록 지연 비용보다 크다 (2026-06-12 사용자 보고 → 2026-08-26 처리).

- 루트 `.claude/settings.json` 의 **SessionStart 훅이 매 세션 시작 시 `register-vaults --apply` 를 자동 실행**한다. Obsidian 이 닫혀 있고 미등록 볼트가 있을 때만 등록하며, 그 외에는 조용히 통과한다.
- **별도 대기 큐 파일을 만들지 않는다.** CLI 가 볼트를 스캔해 델타를 계산하므로 **볼트 존재 자체가 상태**다.
- 사용자 안내 문구: "등록은 Obsidian 을 다음에 닫으신 뒤 세션 시작 시 자동으로 됩니다. 지금 바로 그 볼트를 열어야 하면 Obsidian 을 닫고 알려주세요."
- 즉시 등록이 필요하면 `/obsidian-windows` 로 graceful close 후 5-1 재실행.

#### 5-2b. GUI 등록 (fallback · CLI 미존재 환경)

> Obsidian 볼트 매니저 → "보관함 폴더 열기" → `{생성된 볼트 경로}` 선택

#### 5-3. 금지

**`obsidian://open?path=` URI 로 미등록 볼트를 여는 것을 금지한다.**
URI 방식은 앱 상태 전환 + 등록 + 플러그인 로드를 동시 처리하여 로딩이 매우 느리다.
이미 등록된 볼트 전환에만 `obsidian://open?vault=` URI 사용.

> **미확인 충돌 (2026-08-26)**: 위 "URI 가 등록도 처리한다" 는 서술과 달리, 외부 조사에서는 **Obsidian URI 가 미등록 볼트를 아예 열지 못한다** 는 진술이 나온다 (Windows 에서 `open?path=` 동작 안 함 보고 포함). 버전·플랫폼 차이일 수 있다. **금지 결론은 어느 쪽이든 유지되므로** 실측 전까지 이 절은 그대로 두고, URI 를 등록 수단으로 신뢰하지 않는다.

### 6. 완료 보고

생성된 볼트 경로 + 수행한 후속 작업 + obsidian.json 등록 상태 (CLI applied / GUI 수동 / 미등록 사유) 사용자에게 보고.

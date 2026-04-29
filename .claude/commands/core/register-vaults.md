# /register-vaults — Obsidian 볼트 벌크 등록

AIMindVaults 의 모든 위성 볼트를 Obsidian 의 전역 보관함 레지스트리(`obsidian.json`)에 **일괄 등록**한다. 새 디바이스 재개 시 볼트 30+개를 하나씩 "Open folder as vault"로 등록하는 수동 비용을 제거.

## 트리거 키워드

- "볼트 등록", "벌크 등록", "register vaults", "보관함 등록"
- "새 디바이스 볼트 전부 등록"
- "Obsidian 에 볼트 한번에 등록"

## 전제 조건

- Node.js 설치됨 (`node --version`)
- CoreHub CLI `node_modules` 설치됨 — 없으면 `Sync All Vaults.bat` 먼저 실행 안내
- **Obsidian 완전 종료 상태** — 실행 중이면 차단 (live write-back 충돌)
- `obsidian.json` 은 Obsidian 을 최소 1회 실행해야 생성됨

## 근거 문서

- [[20260424_Obsidian_Bulk_등록_딥리서치_보고서]] — 구현 방식의 리서치 근거
- [[20260424_볼트_자동등록_및_성능_최적화_계획]] — 전체 설계

## 실행 절차

### Phase 0: 사전 점검

1. Obsidian 프로세스 실행 감지 — 실행 중이면 중단, 사용자에게 "모든 Obsidian 창 닫고 재시도" 안내
2. 플랫폼별 `obsidian.json` 경로 확인:
   - Windows: `%APPDATA%\Obsidian\obsidian.json`
   - macOS: `~/Library/Application Support/obsidian/obsidian.json`
   - Linux: `$XDG_CONFIG_HOME/obsidian/obsidian.json` or `~/.config/obsidian/obsidian.json`
3. 파일 없으면 "Obsidian 을 한 번 실행해서 `obsidian.json` 생성 후 재시도" 안내

### Phase 1: Dry-run (기본 모드)

```bash
node <CoreHub>/.sync/_tools/cli-node/bin/cli.js register-vaults
```

**출력**:
- 스캔된 볼트 개수 (`.obsidian/` 디렉토리 있는 경로)
- 이미 등록된 매칭 엔트리 수
- **추가 대상 (TO ADD)** 목록
- **스테일 엔트리 (STALE)** — 파일시스템에 존재하지 않거나 스캔에서 제외된 기존 등록

사용자에게 목록 보고 → 확인 요청.

### Phase 2: Apply (사용자 승인 후)

```bash
node <CoreHub>/.sync/_tools/cli-node/bin/cli.js register-vaults --apply
```

**동작**:
1. 타임스탬프 백업 생성 (`obsidian.json.bak_<YYYYMMDD_HHMMSS>`)
2. 각 신규 볼트에 대해:
   - 16-hex 랜덤 ID 생성 (`crypto.randomBytes(8).toString('hex')`)
   - 기존 ID 중복 시 재생성
   - `{ path: <normalized>, ts: Date.now() }` 엔트리 추가
3. 원자적 쓰기 (`tempPath` 생성 → `rename`)
4. UTF-8 without BOM, 2 space indent
5. **기존 `open` 플래그는 보존** (사용자 세션 상태 유지)

### Phase 3: 검증 안내

1. "Obsidian 실행 → vault switcher 에 모든 볼트 표시 확인"
2. "각 볼트 최초 열기 시 Trust author 클릭 필요"
3. "Shell Commands 가 `on-layout-ready` 로 자동 sync 실행 — 플러그인 복원 확인"
4. 실패 시: `Sync This Vault.bat` (볼트 루트) 또는 `Sync All Vaults.bat` (루트) 수동 실행 가능

## 옵션

| 플래그 | 용도 |
|-------|------|
| `--apply` | 실제 `obsidian.json` 수정 (생략 시 dry-run) |
| `-r, --root <path>` | AIMindVaults 루트 명시 (생략 시 자동 탐지) |
| `--config-path <path>` | `obsidian.json` 경로 override (테스트용) |
| `--force` | Obsidian 실행 중이어도 강행 (**비권장**) |
| `--skip-process-check` | 프로세스 체크 자체를 건너뜀 (CI 용) |

## 스테일 엔트리 처리

현재 구현은 **추가만** 한다. 기존 스테일 엔트리(경로 누락 or 스캔 밖)는 **보고만** 하고 제거하지 않는다. 수동 제거가 필요하면 Obsidian UI 에서 Manage vaults → 제거.

향후 `--remove-stale` 옵션 추가 가능 (별도 승인 필요).

## 안전 장치

- **실행 중 Obsidian 차단**: 리서치 D1 확인 — live write-back 으로 변경 사일런트 revert 위험
- **백업 필수**: 실패 시 rollback 자동 시도 + 수동 복구 경로 안내
- **원자적 쓰기**: 부분 쓰기로 인한 설정 파일 손상 방지
- **`open` 플래그 보존**: 사용자의 현재 열린 볼트 세션 상태 유지. B-2 (노트북 전용 프로파일) 는 폐기됨

## 실패 복구

Phase 2 실패 시 자동으로 백업에서 복원 시도. 수동 복구 명령:

```powershell
# Windows 예시
Copy-Item "$env:APPDATA\Obsidian\obsidian.json.bak_<타임스탬프>" `
          "$env:APPDATA\Obsidian\obsidian.json" -Force
```

## 환경 변수 출력 (자동화 연계용)

| 변수 | 값 예시 |
|------|--------|
| `REGISTER_VAULTS_RESULT` | `DRY_RUN` / `APPLIED` / `NOOP` / `OBSIDIAN_RUNNING` / `NO_CONFIG` / `WRITE_FAILED` |
| `REGISTER_VAULTS_TO_ADD` | 추가 예정 볼트 수 (dry-run) |
| `REGISTER_VAULTS_ADDED` | 실제 추가된 볼트 수 (apply) |
| `REGISTER_VAULTS_BACKUP` | 백업 파일 절대 경로 |

## 관련 스킬

- `Sync All Vaults.bat` — 등록 후 전체 위성 sync (CoreHub CLI 의 `sync-all`)
- `Sync This Vault.bat` — 각 볼트에서 개별 sync
- `/create-vault` — 신규 볼트 추가 (본 스킬이 이후 등록 수행)
- `/distribute` — 배포본 반영

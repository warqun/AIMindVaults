# viz 디바이스 간 동기화 워크플로우 (Custom)

> 메인 PC ↔ 노트북 등 다중 디바이스에서 viz 시각화 결과 정합을 보장하는 워크플로우.
> 본 사이클 (R142~R149.2) 의 사용자 통찰 기반: "어떤 디바이스든 같은 시각화 결과".

## 핵심 원칙

1. **데이터 = git 동기화 (commit + push/pull)** — Contents/, viz/ 코드, _AGENT_COMMS/, _ROOT_VERSION 등
2. **인덱스 = 각 디바이스 자체 빌드** — `.vault_data/master_index.json`, `vault_index.json`, `timeseries.json` 은 `.gitignore`
3. **viz 자동 동기화** — `Generate Visualization.exe` 더블클릭 시 git pull + sync-all 백그라운드 자동
4. **viz UI 일관성** — 같은 master 데이터면 KPI/캘린더 결과 디바이스 무관 일치

## viz 자동 동기화 메커니즘 (R146 + R149 누적)

### Start-Visualization.ps1 흐름

```
viz `.exe` 더블클릭
├─ 메인 PS1: .vault_data/.sync-status.json 'running' write
├─ 메인 PS1: 별도 PowerShell hidden 프로세스 spawn
│   └─ 백그라운드: git pull → sync-all → done/failed 상태 갱신
├─ 메인 PS1: chrome --app port polling 후 즉시 (200ms 간격, 최대 6s)
└─ 메인 PS1: server.js 백그라운드 실행 → exit 0

viz SPA (브라우저):
└─ sync-banner.js → 3s polling /api/sync-status
    ├─ running: top-right banner spinner + step + 메시지
    ├─ done: ✓ + reload 링크 + 5s fade
    └─ failed: ✗ + 에러 상세
```

### R149.2 — 변동 없으면 sync-all skip

git pull 결과 'Already up to date' 면 sync-all 자체 skip → banner 즉시 done. 사용자 자주 viz 띄울 때 부담 없음.

### 환경 변수

```powershell
# 기본값 (자동 활성)
$env:AIMV_VIZ_AUTO_PULL = 'true'   # git pull --ff-only origin main
$env:AIMV_VIZ_AUTO_SYNC = 'true'   # node cli.js sync-all --skip-npm

# off 시
$env:AIMV_VIZ_AUTO_PULL = 'false'
$env:AIMV_VIZ_AUTO_SYNC = 'false'
```

env var off 시 banner 'idle' (표시 안 됨), 자동 동기화 X.

### fail-safe

- git pull 실패 (네트워크/conflict) → sync-all 은 진행 (안전 fallback)
- sync-all 부분 fail (특정 vault 의 Obsidian pre-sync fetch 실패 등 부수) → viz UI 진입 계속, banner 'failed'
- master_index 없을 경우 → R133 의 master-build fallback 단독 호출

## viz_snapshots/ 표준 워크플로우 (R141)

디바이스 간 viz 점검 공유 자동화.

### 스크립트

`Vaults/<프로젝트 볼트>/Contents/Project/scripts/viz_snapshot/Viz-Snapshot.ps1` (예: 사용자가 운영하는 프로젝트 볼트 안에 배치)

```powershell
.\Viz-Snapshot.ps1 -Label "calendar_created_6m"
.\Viz-Snapshot.ps1 -Label "home_R149" -Device main
```

### 동작

- PrimaryScreen 캡처 (모니터 2 등에 viz 띄운 상태)
- `.vault_data/master_index.json` Node 직접 파싱 → 메타 dump
- 표준 베이스명 `{YYYYMMDD_HHMMSS}_{device}_{label}.{png|md}`
- 저장: `Vaults/<프로젝트 볼트>/Contents/Project/plan/distribution/viz_snapshots/`

### 디바이스 식별

- `auto` 모드 (기본): hostname 패턴 (`notebook|laptop|lap|portable` → notebook, 그 외 main)
- 명시: `-Device main` / `-Device notebook`
- tag PascalCase 자동화 — `Main` / `Notebook` (R141 fix)

### 비교 워크플로우

같은 라벨 + 다른 디바이스 스냅샷이 같은 폴더 누적 → visual diff + MD 메타 비교 → vault counts 차이 즉시 식별.

## _AGENT_COMMS/ 디바이스 간 큐 패턴

각 사이클 종료 시 `_AGENT_COMMS/to_claude/{YYYYMMDD}_claude_claude_{주제}_검증.md` 발행 → 다른 디바이스가 git pull + viz 띄움 + 같은 명령 실행 + 결과 응답 noteform 으로 push.

### 완료 트리거 체인

| 단계 | 동작 | 파일명 |
|------|------|--------|
| 1 | 메인 PC commit + 큐 push | `..._검증.md` (status: open) |
| 2 | 노트북 git pull + 검증 | (자체 작업) |
| 3 | 노트북 응답 + 완료 트리거 push | `..._검증_완료.md` (신규) + 원본 큐 `archive/2026-MM/` 이동 |
| 4 | 메인 PC git pull + 다음 R 결정 | — |

## 의미: master_index 가 .gitignore 인 이유

- master_index.json 은 ~1MB+ — git 추적 시 noise 크다
- 각 디바이스 자체 vault_index 들 합산 결과라 디바이스 별 시점 다름
- R146 의 자동 sync-all 이 디바이스 자체 빌드 + 정합 자연 유지

## R148 — KPI "+N today" 노트 기반 derive

timeseries snapshot 디바이스 별 시점 차이 회피. master.notes 의 mtime 분포 기반 derive → 디바이스 무관 같은 +N.

위치: `viz/pages/home.js computeTagsRecentFromNotes(notes)`. Notes/Vaults 는 이미 노트 기반.

## 검증 절차 (디바이스 간 정합 확인)

### 1. 메인 PC 자기 측 측정

```bash
node -e "const j=require('./.vault_data/master_index.json'); console.log(j.notes.length);"
```

### 2. viz `.exe` 띄움 + 자동 동기화 완료 대기 (banner '✓')

### 3. 다른 디바이스 (노트북) git pull + viz `.exe` 띄움

### 4. 양 디바이스 viz KPI 비교

| 카드 | 일치 기대 | 분기 원인 |
|------|---------|---------|
| VAULTS | ✓ | 한 디바이스에 sync fail vault 있으면 그 수 만큼 -N |
| NOTES | ✓ | master raw 차이 (codex 미푸시 노트 등) 만큼 분기 |
| CONNECTED | ✓ | vault 단위 (큰 차이 X) |
| TAGS | ✓ | visible tag set size — 노트 기반 |
| **+N today** | ✓ | R148 노트 기반 derive — 디바이스 무관 |

### 5. 차이 발견 시 추적

- `Vaults/<프로젝트 볼트>/Contents/Project/plan/distribution/{YYYYMMDD}_vault_counts_교차검증.md` 패턴 — 한 디바이스 측 dump → 다른 디바이스가 빈 컬럼 채워 응답
- vault 별 breakdown dump + 노트북 측 응답 채움

## 자주 쓰는 명령

```bash
# 측정 — 자기 측 visible 노트 수 + 5/28 mtime tags
node -e "
const j = require('./.vault_data/master_index.json');
const sys = new Set(['AIHubVault','BasicContentsVault','BasicDiaryVault','BasicDomainVault','BasicLabVault','BasicProjectVault']);
const metaTypes = new Set(['folder-index', 'standard']);
const metaPaths = [/\\/Juggl_StyleGuide\\//, /\\/CONTENTS_[^/]+\\.md\$/, /\\/Domain\\.md\$/, /\\/Project\\.md\$/];
const isMeta = n => metaTypes.has(n.type) || metaPaths.some(re => re.test(n.path || ''));
const visible = j.notes.filter(n => !sys.has(n.vault_id) && !isMeta(n));
console.log('visible:', visible.length);
"

# 강제 vault_index 빌드 (sync fail 우회)
node Vaults/BasicVaults/CoreHub/.sync/_tools/cli-node/bin/cli.js index build -r Vaults/<DOMAIN>/<VAULT>

# master 재빌드 (vault_index 갱신 후)
node Vaults/BasicVaults/CoreHub/.sync/_tools/cli-node/bin/cli.js index master-build -r .
```

## 참조

- R146: viz 자동 동기화 (`viz/_build/Start-Visualization.ps1`)
- R149: 백그라운드 + UI banner (`viz/components/sync-banner.js`, `viz/server.js /api/sync-status`)
- R149.2: 변동 없으면 sync-all skip
- R148: KPI "+N today" 노트 기반 derive (`viz/pages/home.js computeTagsRecentFromNotes`)
- R141: Viz-Snapshot.ps1 + viz_snapshots/ 표준
- R142: viz 측 메타 노트 type/path 필터 (`viz/lib/system-vaults.js filterVisibleNotes`)
- agent-ownership.md (core/): _AGENT_COMMS 큐 1:1 통신 규약 (디바이스 간 동일 적용)

## 트리거 키워드 (skill-router 호환)

viz / sync / 동기화 / git pull / sync-all / viz `.exe` / 디바이스 정합 / 메인 PC 노트북 비교 / KPI 불일치 / master_index / vault_index / 캘린더 헤더 / sync-banner

# viz/ — 에이전트 진입 가이드

> AIMindVaults 시각화 모듈 (`viz/`) 에 진입한 에이전트 (Claude · Codex · 일반) 의 첫 노트.
> 5분 안에 viz 구조 파악 → 작업 진입.

## 1. viz 가 하는 일

멀티볼트의 `master_index.json` (전 볼트 통합 인덱스) + 각 볼트의 `vault_index.json` + 일자별 `timeseries.json` 을 읽어 **브라우저 SPA** 로 시각화. 10 페이지 (home / additions / calendar / connections / network / tags / explorer / rules / settings / distribution).

진입 방법:
- 사용자: `Generate Visualization.exe` 더블클릭 → 자동 동기화 + chrome `--app` 띄움
- 개발: `node server.js` → http://localhost:8765 (포트 사용 중이면 8766~8770 fallback)

## 2. 폴더 트리 + 책임

```
viz/
├── index.html              SPA 진입점
├── router.js               URL hash 라우터 + SSE 클라이언트 + 페이지 매핑
├── server.js               Node HTTP — 정적 파일 + 9 API + SSE + fs.watch
├── styles/                 전역 CSS (테마 변수, 페이지별 클래스)
├── pages/                  10 페이지 (URL hash 1:1)
│   ├── home.js             KPI 카드 + 미니 카드 + 시각화/탐색 카드
│   ├── additions.js        추가 시계열 4 뷰 (notes/vaults/tags/connections)
│   ├── calendar.js         일별 작업량 heatmap
│   ├── connections.js      Sankey 3-단 (owner → tag → user)
│   ├── network.js          Force graph (멀티볼트 그래프)
│   ├── network/            network.js 의 5 sub-module (handlers/labels/sliders/sse-diff)
│   ├── tags.js             태그 탐색기 (정렬 4 모드)
│   ├── explorer.js         Vault 트리 탐색기 + preview
│   ├── rules.js            AI 룰·스킬·후크 뷰어
│   ├── settings.js         UserConfig 편집 (테마/슬라이더/토글/외관)
│   └── distribution.js     분포 분석 (도넛 × 2 + 태그 바)
├── components/             공통 UI
│   ├── header.js           brand / crumb + Live indicator
│   ├── side-panel.js       표준 사이드 패널 (kind/title/meta/stats/sections)
│   ├── sync-banner.js      동기화 상태 배너 (running/done/failed)
│   └── theme.js            테마 토글 (light/dark/system)
├── lib/                    데이터 + 유틸 (9 모듈)
│   ├── loadIndex.js        master_index / vault_index / timeseries 로드 + 시스템 Hub 필터
│   ├── system-vaults.js    SYSTEM_HUB_IDS + META_NOTE 필터 헬퍼
│   ├── theme-engine.js     테마 변수 12개 + override / dark 분기
│   ├── hubs.js             Hub 특성 + ID prefix
│   ├── user-config.js      UserConfig 단일 소스 + Schema 마이그레이션
│   ├── markdown.js         경량 마크다운 렌더 (preview 용)
│   ├── obsidian-uri.js     obsidian:// URI 생성 (vault 자동 탐지)
│   ├── mask.js             vault 라벨 매핑 (개인 자산 영향 X, 배포는 빈 사전)
│   └── buildOption.js      ECharts option 빌더 4종 (sankey/heatmap/donut/bar)
├── _build/                 빌드 + 런처 (PowerShell)
│   ├── Start-Visualization.ps1   exe 런처 — port 순회 + sync + chrome 띄움
│   ├── build-exe.ps1             ps2exe → .exe
│   ├── build-icon.ps1            viz.ico 생성
│   ├── create-shortcut.ps1       .lnk 생성
│   └── tools/ps2exe              MIT 동봉
├── Generate Visualization.exe    런처 (Win)
├── Generate Visualization.bat    Win 폴백
├── Generate Visualization.command macOS
├── Generate Visualization.sh     Linux
└── Start Visualization.vbs       콘솔 숨김 wrapper (Win)
```

## 3. 페이지 매핑 (URL hash → 파일)

| URL | 파일 | 역할 |
|-----|------|------|
| `#home` (default) | `pages/home.js` | 진입 + KPI 4 카드 + 미니 카드 + 시각화/탐색 카드 |
| `#additions` | `pages/additions.js` | 추가 시계열 (notes/vaults/tags/connections 4 view) |
| `#calendar` | `pages/calendar.js` | 일별 작업량 heatmap (basis: mtime/created) |
| `#connections` | `pages/connections.js` | Sankey owner → tag → user |
| `#network` | `pages/network.js` + `network/*` | Force graph (멀티볼트) |
| `#tags` | `pages/tags.js` | 태그 탐색기 (owned/unowned) |
| `#explorer` | `pages/explorer.js` | Vault 트리 + preview |
| `#rules` | `pages/rules.js` | 룰/스킬/후크 뷰어 |
| `#settings` | `pages/settings.js` | UserConfig 편집 (4 패널 캐러셀) |
| `#distribution` | `pages/distribution.js` | 분포 분석 (카테고리·타입·태그) |

페이지 매핑 정본: `router.js` 의 `PAGE_TITLES` + `pages` map. 헤더 라벨은 `components/header.js` 의 `PAGE_TITLES_LOCAL` (양쪽 동기 필요).

## 4. 데이터 흐름

```
.vault_data/                      [디스크]
 ├── master_index.json            (전 볼트 통합, ~1MB+)
 ├── <vault>/vault_index.json     (각 볼트 분리)
 └── timeseries.json              (일자별 스냅샷)
        │
        ▼
server.js  ── 9 API endpoint ──┐
 ├── /api/master                │   (master_index 그대로)
 ├── /api/timeseries            │
 ├── /api/additions             │   (basis=mtime|created, view=notes|vaults|tags|connections)
 ├── /api/activity              │   (최근 7일 + recent N)
 ├── /api/rules                 │   (.claude/rules + .claude/commands + hooks)
 ├── /api/sync-status           │   (.vault_data/.sync-status.json — 동기화 배너용)
 ├── /events                    │   (SSE — fs.watch 기반 자동 푸시)
 └── /static + safeJoin         │
        │
        ▼
lib/loadIndex.js  ── 시스템 Hub 필터 (system-vaults.js) ──┐
        │                                                  ▼
        ▼                                          pages/*.js  ── ECharts / DOM
 router.js (page 활성화)
```

데이터 가시성 필터:
- `lib/system-vaults.js` 의 `SYSTEM_HUB_IDS` 12 + `META_NOTE` 패턴으로 시스템 Hub / meta 노트 자동 제외 (사용자 데이터만 표시)
- `filterSystemHubsInPlace(master)` 가 `loadIndex` 에서 자동 호출

## 5. SSE 자동 갱신

`server.js` 가 `fs.watch` 로 `.vault_data/` 모니터링 → 변경 감지 시 `/events` SSE 로 클라이언트 푸시. `router.js` 의 `attachSSE` 가 이벤트 받아 현재 페이지 재로드. 디바이스 동기화 직후 viz UI 자동 갱신.

추가 동기화 배너:
- `viz/components/sync-banner.js` 가 `/api/sync-status` 3s polling
- 상태: running (spinner + step) / done (✓ + reload) / failed (✗ + 에러)
- 상태 파일: `.vault_data/.sync-status.json` — `Start-Visualization.ps1` 백그라운드 프로세스가 갱신

## 6. 비자명한 패턴 (작업 전 숙지)

| 패턴 | 위치 | 이유 |
|------|------|------|
| **5 모듈 dispose 순서** | `pages/network.js initPage` | `labels → freeze → drag → theme → sliders → sse` — 의존 순서 따라 dispose 안 하면 메모리 누수 |
| **directedMode 분기** | `pages/network.js buildDirectedLinks` | 양방향 / 단방향 graph 분기. `connections.js deriveConnections` 와 데이터 모델 정합 |
| **multi sub-link KPI** | `pages/home.js renderKpi` | Notes 카드 (생성/갱신) + Connected 카드 (연결/노트) — 한 카드 2개 sub-link |
| **R148 디바이스 무관 derive** | `pages/home.js computeTagsRecentFromNotes` | timeseries snapshot 시점 의존 회피 — 노트 mtime 기반 |
| **port 순회** | `_build/Start-Visualization.ps1` | 8765 → 8770 — 다중 viz 인스턴스 격리 (`X-AIMV-Root` 헤더) |
| **idle 자동 종료** | `server.js` | chrome 창 닫으면 15s 후 자동 종료 (부팅 유예 90s) |
| **시스템 Hub 필터** | `lib/system-vaults.js` | CoreHub / AIHubVault 등 시스템 Hub 는 노트 표시에서 제외 (사용자 자기 데이터만) |

## 7. 빌드 + 진입 스크립트

| 파일 | 역할 |
|------|------|
| `Generate Visualization.exe` | Win 더블클릭 진입 — `_build/Start-Visualization.ps1` 의 ps2exe 변환물 |
| `Start Visualization.vbs` | 콘솔 숨김 wrapper (Win, `.bat` 호출) |
| `Generate Visualization.{bat,command,sh}` | OS 별 폴백 진입 |
| `_build/Start-Visualization.ps1` | 정본 런처 — port 순회 + 백그라운드 sync + chrome `--app` |
| `_build/build-exe.ps1` | ps2exe 빌드 |
| `_build/build-icon.ps1` | viz.ico 생성 |
| `_build/create-shortcut.ps1` | .lnk 생성 |

빌드:
```powershell
cd viz/_build
.\build-icon.ps1     # viz.ico
.\build-exe.ps1      # Generate Visualization.exe
```

## 8. 작업 진입 (정본 전용 추가 자료)

본 노트만으로 viz 자체 이해 충분. 정본 환경 (멀티볼트 개발자) 만 다음 자료 추가 접근 가능 (구매자는 무시):

- **시스템스펙 04** — viz 페이지별 책임 + 데이터 모델 + SSE 흐름 상세 (정본 위치: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/spec/20260513_시스템스펙_04_시각화.md`)
- **영문화 매니페스트** — 한국어 → 영문 변환 카탈로그 + 작업 진입 가이드 (정본 위치: `.../Contents/Project/plan/distribution/20260530_viz_정본_영문화_매니페스트.md`)
- **viz-device-sync 룰** — viz 자동 동기화 메커니즘 (R146/R149) — `.claude/rules/core/viz-device-sync.md`

## 9. 작업 시 동기 규칙

1. **viz 코드 수정 시** — 정본 환경에서는 영문화 매니페스트 § 6 (UI 카탈로그) + § 7 (코드 주석 매핑) 동기 갱신
2. **사용자 노출 한국어 텍스트 추가/변경 시** — 매니페스트 § 6.X 행 추가/수정 + EN 후보 컬럼 채움
3. **새 페이지 추가 시** — `router.js PAGE_TITLES` + `components/header.js PAGE_TITLES_LOCAL` + `pages/<new>.js` + 매니페스트 § 6 새 sub-section + 본 노트 § 3 매핑 표 행 추가
4. **R번호 변경 (viz 관련)** — 루트 `_ROOT_VERSION.md` 등록 + 정본 환경의 영문화 매니페스트 § 0 진행 상황 갱신
5. **외부 라이브러리 (ECharts / ps2exe) 손대지 않음** — `_build/tools/` 동봉판 그대로 사용

## 10. 컨텍스트 깊이 추천

| 작업 크기 | 진입 깊이 + 예상 소요 |
|----------|--------------------|
| UI 텍스트 1 줄 변경 | 본 노트 § 3 → 해당 페이지 파일 → 수정 (5분) |
| 한 페이지 기능 추가 | 본 노트 § 3, § 6 → 페이지 파일 모듈 헤더 → 의존 lib/components → 수정 (20~30분) |
| 새 페이지 추가 | 본 노트 § 2/§ 3 + § 9 동기 규칙 4 → router.js + header.js + pages/<new>.js (1~2 시간) |
| 데이터 모델 변경 | 시스템스펙 04 (정본 전용) + server.js + lib/loadIndex.js → 영향 페이지 추적 (2~4 시간) |
| 영문판 빌드 (전수 변환) | 영문화 매니페스트 (정본 전용) + 본 노트 + 시스템스펙 04 (4~8 시간) |

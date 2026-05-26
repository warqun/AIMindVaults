---
description: "Obsidian 창 수 제어 (열기/닫기) — 사용자 명시 N개에 맞춰 인스턴스 정렬"
---

# /obsidian-windows — Obsidian 인스턴스 제어

## 용도

사용자가 명시한 창 수에 맞춰 Obsidian 인스턴스를 열고 닫는다. 노트북 메모리 부담 완화 (1 창 = 4 Electron 프로세스).

자동 정책 X — 사용자 감각 기반 명시 요청 → AI 실행. 어느 볼트를 대상으로 할지 사용자 확인 후 진행.

## 실행 절차

### 1. 인자 파싱

호출 패턴:
- `/obsidian-windows` → 현재 상태만 보고
- `/obsidian-windows 2` → 창을 2개로 맞춤 (어느 볼트는 사용자 확인)
- `/obsidian-windows close <볼트명>` → 특정 볼트 닫기
- `/obsidian-windows close all` → 전부 닫기 (사용자 재확인 후)
- `/obsidian-windows open <볼트명>` → 특정 볼트 열기
- `/obsidian-windows status` → 현재 떠있는 창 목록만

### 2. 현재 상태 감지 (모든 호출 공통)

```powershell
$obs = Get-Process -Name 'Obsidian' -ErrorAction SilentlyContinue
$windows = $obs | Where-Object { $_.MainWindowTitle -ne '' }
$total = $obs.Count
$winCount = $windows.Count
$windows | Select-Object Id, MainWindowTitle, StartTime,
    @{N='WS_MB';E={[math]::Round($_.WorkingSet64/1MB,1)}}
```

`MainWindowTitle` → 볼트명 추출: `<볼트명> - Obsidian v<버전>` 패턴에서 ` - Obsidian` 앞 부분.

### 3. 분기

#### 3-A. status 만 보고

```
현재 Obsidian 창 N개 (총 프로세스 P개, 메모리 X MB):
  - <볼트1> (PID xxx, WS yyy MB, 시작 hh:mm)
  - <볼트2> (PID xxx, WS yyy MB, 시작 hh:mm)
```

#### 3-B. 목표 N 으로 맞추기 (`/obsidian-windows N`)

1. 차이 계산: `delta = N - $winCount`
2. `delta < 0` → `|delta|` 개 닫기:
   - 사용자에게 현재 떠있는 볼트 목록 제시
   - "어느 것을 닫을까요? (오래된 순/최근 순/직접 지정)" 확인
   - 사용자 답변 후 닫기 실행
3. `delta > 0` → `delta` 개 열기:
   - 사용자에게 닫혀있는 볼트 목록 제시 (`obsidian.json` 등록 - 현재 떠있는 것)
   - "어느 볼트를 열까요?" 확인
   - 사용자 답변 후 열기 실행
4. `delta == 0` → 이미 목표 도달, status 보고만

#### 3-C. close 단일 볼트 (`/obsidian-windows close <볼트명>`)

1. `MainWindowTitle` 매칭으로 PID 찾기
2. 매칭 0 → "<볼트명> 창 떠있지 않음" 보고 후 종료
3. 매칭 1 → graceful close 실행
4. 매칭 2+ → 사용자에게 어느 PID 닫을지 확인

#### 3-D. close all

사용자에게 재확인: "현재 N개 창 모두 닫습니다. 진행?" → 승인 후 graceful close 순회.

#### 3-E. open 단일 볼트 (`/obsidian-windows open <볼트명>`)

1. `obsidian.json` 에서 볼트 ID/path 확인 — 미등록이면 사용자에게 안내 후 종료
2. 이미 떠있는지 확인 (`MainWindowTitle` 매칭) — 이미 떠있으면 보고만 후 종료
3. 현재 Obsidian 프로세스 0개 → 직접 실행:
   ```powershell
   Start-Process "C:\Program Files\Obsidian\Obsidian.exe"
   ```
   (단일 인스턴스로 시작, 마지막 활성 볼트 로드. URI 후속으로 목표 볼트 전환)
4. 1+ 개 → URI 호출:
   ```powershell
   Start-Process "obsidian://open?vault=<볼트명>"
   ```
   (단일 인스턴스 락에 의해 동작. 신규 창 생성 보장 안 됨 — 사용자에게 결과 확인 필요)
5. 2초 대기 후 창 수 재감지 → 증가 안 됐으면 사용자에게 "수동으로 File → Open another vault → Open in new window 사용 권장" 안내

### 4. Graceful Close 구현

```powershell
function Close-ObsidianWindow {
    param([int]$ProcessId, [int]$TimeoutSec = 5)
    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $proc) { return $false }
    $title = $proc.MainWindowTitle
    $closed = $proc.CloseMainWindow()
    if (-not $closed) { return $false }
    $proc.WaitForExit($TimeoutSec * 1000) | Out-Null
    $proc.HasExited
}
```

`CloseMainWindow` 는 Obsidian 자체 종료 다이얼로그 트리거 — 저장 안 된 변경 보호. `Stop-Process` 강제 종료는 사용자 명시 승인 시만.

### 5. obsidian.json open 플래그 갱신 (선택)

사용자에게 확인:
- "다음 부팅 때도 자동 열림 안 하게 `open: true` → `false` 갱신할까?" (닫기 시)
- "다음 부팅 때 자동 열리게 `open: true` 로 갱신할까?" (열기 시)

승인 시 Read → Edit 방식으로 부분 수정. 백업 필수.

```powershell
$jsonPath = "$env:APPDATA\obsidian\obsidian.json"
$bak = "$jsonPath.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $jsonPath $bak -Force
```

JSON 부분 수정은 텍스트 정규식 — `ConvertFrom-Json → ConvertTo-Json` 금지.

### 6. 완료 보고

```
[전] Obsidian 창 N개 — <볼트1>, <볼트2>, <볼트3>
[후] Obsidian 창 M개 — <볼트1>

변경:
  - <볼트2> graceful close (PID xxx, 0.8s)
  - <볼트3> graceful close (PID yyy, 1.2s)

obsidian.json open 플래그 갱신: <볼트2>, <볼트3> → false (백업: <bak_path>)
```

## 사용 예시

```
/obsidian-windows                          # 현재 상태만
/obsidian-windows 1                        # 1개로 줄임 (어느 것 남길지 사용자 확인)
/obsidian-windows close AIHubVault         # AIHubVault 만 닫기
/obsidian-windows close all                # 전부 닫기 (재확인)
/obsidian-windows open Unity               # Unity 열기
/obsidian-windows status                   # 상태 보고만
```

## 주의사항

- **단일 인스턴스 락** — Obsidian 1.x 는 기본 단일 인스턴스. URI 호출이 신규 창 만드는지 기존 창 전환하는지 버전·설정 의존. 사용자에게 결과 확인 필수.
- **저장 안 된 변경 보호** — graceful close 만 사용. `Stop-Process -Force` 는 사용자 명시 승인 + 저장 확인 후만.
- **MainWindowTitle 빈 프로세스** — main window 없는 utility/GPU 프로세스. 창 카운트 대상 아님.
- **MainWindowTitle 패턴 변경** — Obsidian 버전업 시 타이틀 형식 변경 가능. 매칭 실패 시 PID 기반 fallback.
- **obsidian.json 동시 수정 충돌** — Obsidian 실행 중 `obsidian.json` 수정 시 Obsidian 종료 시점에 덮어쓰기 가능. 가급적 모든 창 닫은 후 편집 권장.

## 관련 규칙

- `.claude/rules/custom/obsidian-instance-control.md` — 정책·트리거·금지 사항
- `.claude/rules/core/obsidian-config-safety.md` — `obsidian.json` 편집 안전 규칙
- `.claude/commands/custom/spawn-claude.md` — 멀티 Claude 인스턴스 (별개 개념, 참고용)

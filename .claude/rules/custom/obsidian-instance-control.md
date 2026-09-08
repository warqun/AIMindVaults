# Obsidian 인스턴스 제어 (Custom)

> 사용자가 명시한 창 수에 맞춰 AI 가 Obsidian 인스턴스를 열고 닫는다.
> 자동 정책·런타임 차단 없음 — 사용자 감각 기반 명시 요청 → AI 실행.

## 배경

- Obsidian 1 창 = 4 Electron 프로세스 (main + renderer + GPU + utility)
- 동시 N 창 = 4N 프로세스 → 노트북 메모리 부담
- B-3 결정 (2026-04-25): 자동 차단·자동 닫기 X. 사용자가 "지금 N개로 맞춰줘" 명시 → AI 실행.

## 트리거 키워드

다음 키워드 감지 시 `/obsidian-windows` 스킬 호출:

- "Obsidian 창", "옵시디언 창", "ob 창"
- "인스턴스", "instance"
- "N개로 맞춰", "N개로 줄여", "N개로 늘려"
- "Obsidian 정리", "옵시디언 닫아"

자연어 예시:
- "Obsidian 창 1개로 줄여줘"
- "지금 옵시디언 몇 개 떠 있어?"
- "AIHubVault 닫고 Unity만 켜줘"

## 감지 방법

```powershell
# 창 수 = MainWindowTitle 비어있지 않은 Obsidian 프로세스 수
$windows = Get-Process -Name 'Obsidian' -ErrorAction SilentlyContinue |
           Where-Object { $_.MainWindowTitle -ne '' }
$windows.Count  # 창 개수
$windows | Select-Object Id, MainWindowTitle  # 어느 볼트가 떠 있는지
```

`MainWindowTitle` 형식: `<볼트명> - Obsidian v<버전>` (예: `Unity - Obsidian v1.12.4`)

## 닫기 절차 (감소 방향)

1. **사용자에게 어느 볼트를 닫을지 확인** — 자동 결정 금지.
   - 현재 떠있는 볼트 목록 제시 + 사용자 선택 대기.
   - 단, "오래된 것부터" · "X 만 남기고" 등 사용자가 정책 명시 시 즉시 실행.

2. **Graceful close 우선** (`CloseMainWindow`):
   ```powershell
   $proc = Get-Process -Id <창 ID>
   $proc.CloseMainWindow()  # 저장 안 된 변경 있으면 Obsidian 자체 다이얼로그
   ```

3. **5초 대기 후 종료 안 되면 사용자에게 알림** — `Stop-Process` 강제 종료는 사용자 명시 승인 시만.

4. **`obsidian.json` 의 `open: true` 동기화** (선택):
   - 닫은 볼트의 `open` 플래그를 `false` 로 갱신할지 사용자 확인.
   - 다음 재시작 시 동작 결정 — 사용자가 "다음 부팅 때도 안 열게" 라면 갱신.

## 열기 절차 (증가 방향)

1. **사용자에게 어느 볼트를 열지 확인** — 자동 선택 금지.
   - 현재 닫힌 볼트 목록 (`obsidian.json` 등록 볼트 - 떠있는 볼트) 제시.
   - "최근 작업한 볼트" · "Project_X" 등 사용자 명시 시 즉시 실행.

2. **현재 Obsidian 인스턴스 유무 확인**:
   - 0 창: 직접 실행 — `Start-Process "C:\Program Files\Obsidian\Obsidian.exe"` (단일 인스턴스로 시작, 마지막 활성 볼트 로드)
   - 1+ 창: URI 호출 — `Start-Process "obsidian://open?vault=<볼트명>"` (단일 인스턴스 락에 의해 기존 창에서 볼트 전환 또는 추가 창 생성, Obsidian 버전·설정 의존)

3. **URI 호출이 추가 창 대신 전환을 일으키는 경우** — Obsidian UI 메뉴 (File → Open another vault → Open in new window) 만 신규 창 생성 보장. 사용자에게 수동 안내.

4. **`obsidian.json` 의 `open: true` 갱신**:
   - 새로 연 볼트의 `open` 을 `true` 로 설정 (다음 재시작 시 자동 열림).
   - 사용자 명시 거부 시 생략.

## obsidian.json 편집 안전 규칙

- `obsidian.json` 위치: `$env:APPDATA\obsidian\obsidian.json` (Windows)
- **Read → Edit (텍스트 직접 수정) 방식**. PowerShell `ConvertFrom-Json → ConvertTo-Json` 파이프라인 금지 (배열 1개 → 문자열 변환 버그).
- 편집 전 백업: `obsidian.json.bak_$(Get-Date -Format 'yyyyMMdd_HHmmss')`
- `vaults.<id>.open` 만 수정. 다른 필드 (path, ts) 손대지 않음.

## 보고 형식

작업 완료 시 사용자에게 다음 출력:

```
[전] Obsidian 창 N개:
  - <볼트1> (PID xxx)
  - <볼트2> (PID yyy)

[후] Obsidian 창 M개:
  - <볼트1> (PID xxx)

변경: <볼트2> 닫음 (graceful)
obsidian.json open 플래그: <볼트2> false 로 갱신 / 미갱신
```

## 금지

- 사용자 승인 없이 강제 종료 (`Stop-Process -Force`).
- 사용자 명시 없이 어떤 볼트 닫을지 자동 결정.
- `Stop-Process` 로 Obsidian 모든 인스턴스 일괄 kill (저장 안 된 변경 손실).
- `obsidian.json` 전체 덮어쓰기 (`Set-Content -Encoding utf8` 등) — 부분 수정만.

## 참조

- B-3 feasibility 조사: 프로젝트 볼트의 온보딩 계획 노트
- Obsidian 설정 안전 편집: `.claude/rules/core/obsidian-config-safety.md`
- 스킬: `.claude/commands/custom/obsidian-windows.md`

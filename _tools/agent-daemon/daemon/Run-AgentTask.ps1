<#
.SYNOPSIS
  무인 에이전트 실행 진입점 — Claude Code / Codex 공용.

.DESCRIPTION
  지시서(.md)를 지정해 에이전트 CLI 를 무인 실행하고 로그를 남긴다.
  2026-09-09 에 `Run-ClaudeTask.ps1` 에서 이름을 바꿨다 — Codex 도 돌리게 되면서
  이름이 하는 일과 어긋났다.

  설계 원칙 3가지:
   1) 한글 지시서를 파이프로 넘기지 않는다. 프롬프트에는 **경로만** 싣고 본문은
      Claude 가 자기 Read 도구로 읽는다. PowerShell 한글 파이프는 `$OutputEncoding`
      이 ASCII 일 때 literal `?` 로 파괴된다 (encoding-safety Mandatory, 2026-08-08
      incident 원인).
   2) 실행 파일을 절대경로로 고정한다. 작업 스케줄러는 대화형 터미널의 PATH 를
      물려받지 않아 `claude` 를 못 찾는다.
   3) push 하지 않는다. 커밋까지가 무인 범위, 푸시는 사람이.

.PARAMETER Task
  scripts/daemon/tasks/<Task>.md 지시서 이름 (확장자 제외).

.PARAMETER Agent
  claude (기본) | codex. 지시서는 두 에이전트가 공용으로 쓴다.

.PARAMETER Model
  에이전트에 넘길 모델. 생략하면 각 CLI 의 기본값.
  claude — `opus` · `sonnet` · `haiku` · `fable` 또는 전체 모델 ID
  codex  — `-m` 에 그대로 전달 (예: `gpt-6-astra`)

.PARAMETER Effort
  연산 복잡도. 생략하면 각 CLI 의 기본값.
  claude — low | medium | high | xhigh | max (`--effort`)
  codex  — `-c model_reasoning_effort=` 로 전달

.PARAMETER PermissionMode
  claude 전용. acceptEdits (기본) | plan | bypassPermissions 등.
  codex 는 이 값을 쓰지 않는다 — 아래 § Codex 권한 참조.

.PARAMETER Branch
  지정 시 해당 브랜치를 체크아웃한 뒤 실행 (없으면 생성). 자율루프용 격리.

.PARAMETER DryRun
  실제 실행 없이 확정된 명령줄만 출력.

.EXAMPLE
  .\Run-AgentTask.ps1 -Task devlearning-digest
  .\Run-AgentTask.ps1 -Task inbox-task -PermissionMode bypassPermissions
  .\Run-AgentTask.ps1 -Task inbox-task -Agent codex -Model gpt-6-astra -Effort high
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Task,
    [ValidateSet('claude', 'codex')]
    [string]$Agent = 'claude',
    [string]$Model,
    [string]$Effort,
    [ValidateSet('plan', 'acceptEdits', 'auto', 'dontAsk', 'manual', 'bypassPermissions')]
    [string]$PermissionMode = 'acceptEdits',
    [string]$Branch,
    [int]$TimeoutMinutes = 90,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# 한글 로그가 깨지지 않도록 이 프로세스의 인코딩을 UTF-8 로 고정한다.
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

# --- 경로 확정 (하드코딩 금지 — 스크립트 위치에서 .git 을 위로 탐색) -----------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = $scriptDir
while ($root -and -not (Test-Path (Join-Path $root '.git'))) {
    $parent = Split-Path -Parent $root
    if ($parent -eq $root) { break }
    $root = $parent
}
if (-not (Test-Path (Join-Path $root '.git'))) {
    Write-Error "AIMindVaults 루트를 못 찾음 (.git 부재). 시작 위치: $scriptDir"
    exit 2
}

$promptFile = Join-Path $scriptDir "tasks\$Task.md"
if (-not (Test-Path -LiteralPath $promptFile)) {
    Write-Error "지시서 없음: $promptFile"
    exit 2
}

# --- 에이전트 실행 파일 절대경로 (작업 스케줄러는 PATH 를 안 물려받음) ---------
# .cmd 를 먼저 찾는다. Get-Command 는 같은 폴더의 .ps1 을 먼저 집는데,
# .ps1 은 ExecutionPolicy 에 걸릴 수 있고 .cmd 는 걸리지 않는다.
$candidates = if ($Agent -eq 'codex') {
    @("$env:APPDATA\npm\codex.cmd",
      "$env:ProgramFiles\nodejs\codex.cmd",
      "$env:LOCALAPPDATA\Programs\codex\codex.exe")
} else {
    @("$env:APPDATA\npm\claude.cmd",
      "$env:ProgramFiles\nodejs\claude.cmd",
      "$env:LOCALAPPDATA\Programs\claude\claude.exe",
      "$env:USERPROFILE\.local\bin\claude.exe")
}
$exe = $null
foreach ($cand in $candidates) {
    if (Test-Path -LiteralPath $cand) { $exe = $cand; break }
}
if (-not $exe) {
    $cmd = Get-Command $Agent -ErrorAction SilentlyContinue
    if ($cmd) { $exe = $cmd.Source }
}
if (-not $exe) {
    Write-Error "$Agent 실행 파일을 찾지 못함. Run-AgentTask.ps1 의 후보 경로에 추가할 것."
    exit 2
}

# --- 로그 + 단일 인스턴스 잠금 -------------------------------------------------
$logDir = Join-Path $root '.vault_data\logs'
# DryRun 은 아무것도 만들지 않는다. 아래 출력은 경로 문자열만 쓴다.
if (-not $DryRun) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$logFile = Join-Path $logDir "$($Task)_$($Agent)_$($stamp).log"
# 잠금은 에이전트 무관하게 Task 단위다 — claude 와 codex 가 같은 지시서를 동시에
# 돌면 같은 파일을 양쪽에서 건드린다.
$lockFile = Join-Path $logDir "$Task.lock"

# **DryRun 은 잠금을 건드리지 않는다.** 종전엔 여기서 SKIP 로그를 쓰거나 오래된
# 잠금을 지운 뒤에야 출력에 도달했다 — 이름이 거짓말이었다 (2026-09-09 codex 지적).
if ((-not $DryRun) -and (Test-Path -LiteralPath $lockFile)) {
    $lockAge = (Get-Date) - (Get-Item -LiteralPath $lockFile).LastWriteTime
    if ($lockAge.TotalMinutes -lt $TimeoutMinutes) {
        # 이전 회차가 아직 도는 중 — 겹쳐 돌리면 같은 파일을 양쪽에서 건드린다.
        "[$stamp] SKIP — 이전 실행이 $([int]$lockAge.TotalMinutes)분째 진행 중" |
            Out-File -FilePath $logFile -Encoding utf8
        # **0 이 아니라 75 다.** 0 을 내면 부르는 쪽이 "성공" 으로 읽어, 한 번도 실행되지
        # 않은 작업을 done/ 으로 옮긴다 (2026-09-09 재현). 75 는 EX_TEMPFAIL —
        # "실패가 아니라 지금은 못 한다" 라서 실패 처리와도 구별된다.
        exit 75
    }
    Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue
}

# --- 브랜치 격리 (자율루프용) --------------------------------------------------
$startBranch = (& git -C $root rev-parse --abbrev-ref HEAD 2>$null)
# 브랜치 생성·checkout 도 DryRun 에서는 안 한다. 게다가 DryRun 은 아래에서 바로
# exit 하므로 실행 경로의 finally (원래 브랜치 복귀) 를 타지도 못했다.
if ($Branch -and (-not $DryRun)) {
    & git -C $root rev-parse --verify $Branch *>$null
    if ($LASTEXITCODE -ne 0) { & git -C $root branch $Branch | Out-Null }
    & git -C $root checkout $Branch | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "브랜치 체크아웃 실패: $Branch (미커밋 변경 때문일 수 있음)"
        exit 2
    }
}

# 지시서 경로만 전달한다. 본문(한글)은 Claude 가 Read 로 직접 읽는다.
$rel = $promptFile.Substring($root.Length).TrimStart('\', '/') -replace '\\', '/'
$prompt = "Read the instruction file at $rel and follow it exactly. Do not push to any git remote."

if ($Agent -eq 'codex') {
    # Codex 는 권한 프로파일(--settings) 개념이 없다. 사용자 결정 (2026-09-09) 으로
    # Claude 무인과 **동급으로 넓게** 간다 — 승인·샌드박스를 모두 우회한다.
    # 그래서 되돌리기 어려운 것에 대한 방어는 전적으로 지시서 § 6 문구와 아래
    # 프롬프트의 push 금지 문구에 달려 있다. Claude 쪽은 profiles/*.json 의 deny
    # 목록이 한 겹 더 있는데 Codex 에는 그 겹이 없다는 뜻이다.
    $agentArgs = @('exec', '--dangerously-bypass-approvals-and-sandbox')
    if ($Model)  { $agentArgs += @('-m', $Model) }
    # `minimal` 은 넘기지 않는다. 생각수준 낱말은 Claude 기준으로 모아 뒀는데
    # **Astra (codex 기본 모델) 가 `minimal` 을 거부한다** — 조용히 기본값으로 가는 것이
    # 아니라 서버가 HTTP 400 (unsupported_value) 으로 회차를 죽인다 (2026-09-09 codex 실측).
    # 오타 하나로 무인 회차를 잃지 않도록 가장 가까운 유효값으로 내린다.
    if ($Effort -eq 'minimal') {
        Write-Host "note   : codex 는 minimal 을 안 받는다 — low 로 낮춘다"
        $Effort = 'low'
    }
    if ($Effort) { $agentArgs += @('-c', "model_reasoning_effort=`"$Effort`"") }
    $agentArgs += $prompt
} else {
    $agentArgs = @('-p', $prompt, '--permission-mode', $PermissionMode)
    if ($Model)  { $agentArgs += @('--model', $Model) }
    if ($Effort) { $agentArgs += @('--effort', $Effort) }

    # 작업별 권한 프로파일. 있으면 물린다 — 대화형 세션의 .claude/settings.json 은 건드리지 않는다.
    # 목록에 없는 명령은 차단되고, 무인 실행이라 그 자리에서 실패로 끝난다. 그게 의도다.
    $profileFile = Join-Path $scriptDir "profiles\$Task.json"
    if (Test-Path -LiteralPath $profileFile) {
        $agentArgs += @('--settings', $profileFile)
    }
}

if ($DryRun) {
    Write-Host "root   : $root"
    Write-Host "agent  : $Agent"
    Write-Host "exe    : $exe"
    Write-Host "model  : $(if ($Model) { $Model } else { "(CLI 기본)" })  effort: $(if ($Effort) { $Effort } else { "(CLI 기본)" })"
    Write-Host "branch : $(if ($Branch) { $Branch } else { $startBranch })"
    Write-Host "log    : $logFile"
    Write-Host "cmd    : $exe $($agentArgs -join ' ')"
    exit 0
}

# --- 실행 ----------------------------------------------------------------------
New-Item -ItemType File -Path $lockFile -Force | Out-Null
$exitCode = 0
try {
    Push-Location $root
    "=== $Task ($Agent) @ $stamp ===" | Out-File -FilePath $logFile -Encoding utf8
    "root=$root branch=$(if ($Branch) { $Branch } else { $startBranch }) agent=$Agent model=$(if ($Model) { $Model } else { '-' }) effort=$(if ($Effort) { $Effort } else { '-' }) mode=$PermissionMode" |
        Out-File -FilePath $logFile -Encoding utf8 -Append

    # PS 5.1 은 네이티브 exe 의 stderr 를 ErrorRecord 로 감싼다. $ErrorActionPreference
    # 가 Stop 이면 claude 가 경고 한 줄만 뱉어도 여기서 터지고 로그가 잘린다
    # (2026-08-26 1차 실행에서 실제 발생 — 작업은 완주했는데 래퍼가 exit 1).
    # ForEach-Object 로 문자열화해야 ErrorRecord 가 로그에 깨끗이 남는다.
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $exe @agentArgs 2>&1 | ForEach-Object { "$_" } |
        Out-File -FilePath $logFile -Encoding utf8 -Append
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP

    "=== exit=$exitCode @ $(Get-Date -Format 'yyyyMMdd_HHmmss') ===" |
        Out-File -FilePath $logFile -Encoding utf8 -Append
} catch {
    "=== EXCEPTION: $_ ===" | Out-File -FilePath $logFile -Encoding utf8 -Append
    $exitCode = 1
} finally {
    Pop-Location
    Remove-Item -LiteralPath $lockFile -Force -ErrorAction SilentlyContinue
    # 브랜치를 바꿔서 실행했으면 원래 자리로 돌려놓는다.
    if ($Branch -and $startBranch -and $startBranch -ne $Branch) {
        & git -C $root checkout $startBranch *>$null
    }
    # 로그는 태스크당 최근 30개만 남긴다.
    Get-ChildItem -LiteralPath $logDir -Filter "$($Task)_*.log" |
        Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

exit $exitCode

# AIMindVaults Visualization — Main Launcher (R146 + R149 + R132)
#
# 역할:
#   `Generate Visualization.exe` (ps2exe 컴파일 대상) 의 본체. .vbs/.bat 런처를 PS 한 곳으로 통합.
#   사용자가 .exe 더블클릭 시 본 스크립트가 실행됨.
#
# 흐름:
#   1. Node.js 18+ 존재 체크 (부재 시 MessageBox + nodejs.org 안내)
#   2. server.js 위치 검증 + 환경 변수 기본값 설정 (PORT/IDLE/AUTO_PULL/AUTO_SYNC)
#   3. 포트 결정 (R132 다중 클론 격리) — 8765 부터 순회:
#      - free port → 자기 인스턴스 시작
#      - listening + X-AIMV-Root 일치 → 기존 인스턴스 활성화 (chrome 만 열고 종료)
#      - listening + 다른 클론 → 다음 port 순회 (최대 20 시도)
#   4. R149 백그라운드 sync — 별도 hidden PS 프로세스 spawn:
#      - .vault_data/.sync-status.json 갱신 (running/done/failed)
#      - git pull --ff-only origin main (변동 감지)
#      - 변동 있으면 sync-all --skip-npm (CoreHub cli.js), 없으면 skip (R149.2)
#      - viz SPA sync-banner.js 가 /api/sync-status polling
#      - spawn 인자에 -ExecutionPolicy Bypass 포함 — 유효 정책 Restricted 머신에서 -File 차단 방지 (R169)
#      - cold start (fresh clone) 자동 부트스트랩: CoreHub npm install 선행 → sync-all full
#        (--skip-npm 제거, 볼트 로컬 node_modules 자동 설치) → exit code 검증 (실패 시 failed 정직 보고) (R170)
#   5. R133 master_index 자동 빌드 — AUTO_SYNC off 전용 안전망 (R170: on 이면 4 의 bg sync 가 전담)
#   6. R149.1 chrome --app port polling 후 즉시 실행 (이전 4s 고정 대기 → 1-2s)
#   7. server.js 를 hidden 프로세스 spawn (stdout/stderr 임시 파일 격리)
#   8. .exe 본체 즉시 종료 — server.js 의 idle 자동 종료 (AIMV_VIZ_IDLE_MS) 가 정리
#
# 환경 변수:
#   - AIMV_VIZ_PORT (기본 8765)
#   - AIMV_VIZ_IDLE_MS (기본 15000)
#   - AIMV_VIZ_BOOT_GRACE_MS (기본 90000)
#   - AIMV_VIZ_AUTO_PULL (기본 true) — R146 git pull 자동
#   - AIMV_VIZ_AUTO_SYNC (기본 true) — R146 sync-all 자동
#
# 사용자 노출 (MessageBox + sync-status message):
#   "server.js 를 찾을 수 없습니다", "Node.js 가 필요합니다", "port 를 찾을 수 없습니다",
#   "master_index 자동 빌드 실패", "동기화 시작 중", "동기화 완료" 등 — § 6.16 카탈로그 참조.
#
# 참조:
#   룰: `.claude/rules/core/viz-device-sync.md` (R146 + R149 누적)
#   영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.16

$ErrorActionPreference = 'Stop'

# .exe 컴파일 환경에서도 동작하는 자기 위치 추적
if ([string]::IsNullOrEmpty($PSScriptRoot)) {
    $exeDir = [System.AppDomain]::CurrentDomain.BaseDirectory.TrimEnd('\')
} else {
    $exeDir = $PSScriptRoot
}

$serverJs = Join-Path $exeDir 'server.js'
if (-not (Test-Path $serverJs)) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        "server.js 를 찾을 수 없습니다.`n`n경로: $serverJs`n`n이 실행 파일은 AIMindVaults\viz\ 폴더 안에서 실행해야 합니다.",
        'AIMindVaults Visualization',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    exit 1
}

# Node.js 체크
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Add-Type -AssemblyName System.Windows.Forms
    $msg = "AIMindVaults 시각화는 Node.js 18+ 가 필요합니다.`n`n공식 다운로드 페이지를 여시겠습니까?"
    $result = [System.Windows.Forms.MessageBox]::Show(
        $msg,
        'AIMindVaults Visualization — Node.js 필요',
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Information
    )
    if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
        Start-Process 'https://nodejs.org/ko/'
    }
    exit 1
}

# 환경 변수 (기본값 — 사용자가 외부에서 미리 지정한 값이 있으면 유지)
if (-not $env:AIMV_VIZ_PORT)            { $env:AIMV_VIZ_PORT = '8765' }
if (-not $env:AIMV_VIZ_IDLE_MS)         { $env:AIMV_VIZ_IDLE_MS = '15000' }
if (-not $env:AIMV_VIZ_BOOT_GRACE_MS)   { $env:AIMV_VIZ_BOOT_GRACE_MS = '90000' }

# R163 — viz-prefs.json (디바이스별 viz Settings UI 토글) 읽어 자동 동기화 env var 적용.
# 우선순위: 시스템 env var (사용자 명시) > viz-prefs.json (UI 토글) > default(true).
$myRoot = Split-Path -Parent $exeDir
$vizPrefsPath = Join-Path $myRoot '.vault_data\viz-prefs.json'
$autoPullExplicit = ($null -ne $env:AIMV_VIZ_AUTO_PULL -and $env:AIMV_VIZ_AUTO_PULL -ne '')
$autoSyncExplicit = ($null -ne $env:AIMV_VIZ_AUTO_SYNC -and $env:AIMV_VIZ_AUTO_SYNC -ne '')
if (((-not $autoPullExplicit) -or (-not $autoSyncExplicit)) -and (Test-Path $vizPrefsPath)) {
    try {
        $prefs = Get-Content $vizPrefsPath -Raw -Encoding utf8 | ConvertFrom-Json
        if ($prefs.PSObject.Properties.Match('gitAutoSync').Count -gt 0) {
            $val = if ($prefs.gitAutoSync) { 'true' } else { 'false' }
            if (-not $autoPullExplicit) { $env:AIMV_VIZ_AUTO_PULL = $val }
            if (-not $autoSyncExplicit) { $env:AIMV_VIZ_AUTO_SYNC = $val }
        }
    } catch {
        # 파일 파싱 실패 — 아래 default 로 fallback
    }
}

# R146 — viz 시작 시 디바이스 자동 동기화 (기본 on, viz Settings UI 토글 또는 env var 으로 off)
if (-not $env:AIMV_VIZ_AUTO_PULL)        { $env:AIMV_VIZ_AUTO_PULL = 'true' }
if (-not $env:AIMV_VIZ_AUTO_SYNC)        { $env:AIMV_VIZ_AUTO_SYNC = 'true' }

$port = [int]$env:AIMV_VIZ_PORT
$url = "http://localhost:$port"

# Chrome / Edge --app 모드 우선, 없으면 기본 브라우저
$browserPaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)
$browser = $null
foreach ($p in $browserPaths) {
    if (Test-Path $p) { $browser = $p; break }
}

function Open-VizBrowser {
    param([string]$Browser, [string]$Url)
    if ($Browser) {
        Start-Process -FilePath $Browser -ArgumentList "--app=$Url"
    } else {
        Start-Process $Url
    }
}

# 다중 AIMindVaults 클론 동시 실행 대응 (R132 — 노트북 교차검증 이슈 1).
# 8765 부터 순회하며:
#   1. free port 발견 → 그 port 로 자기 server 새로 시작
#   2. listening 중 → GET / 의 X-AIMV-Root 헤더로 자기 클론인지 확인
#      - 자기 ROOT 일치 → 기존 인스턴스 활성화 (Chrome 만 열고 종료)
#      - 다른 클론 → 다음 port 로 계속 순회
# server.js 의 ROOT_DIR = viz/ 의 부모 = AIMindVaults 멀티볼트 루트.
$myRoot = Split-Path -Parent $exeDir
$startPort = [int]$env:AIMV_VIZ_PORT
$maxScan = 20
$resolvedPort = $null
$isOurInstance = $false

for ($p = $startPort; $p -lt ($startPort + $maxScan); $p++) {
    # listening 여부 체크 (TCP connect 시도)
    $listening = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $task = $tcp.ConnectAsync('localhost', $p)
        if ($task.Wait(300) -and $tcp.Connected) {
            $listening = $true
        }
        $tcp.Close()
    } catch {
        $listening = $false
    }

    if (-not $listening) {
        # free — 우리가 시작할 port
        $resolvedPort = $p
        $isOurInstance = $false
        break
    }

    # listening 중 — X-AIMV-Root 헤더로 정체성 확인
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$p/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $serverRoot = $resp.Headers['X-AIMV-Root']
        if ($serverRoot -is [array]) { $serverRoot = $serverRoot[0] }
        if ($serverRoot -and ($serverRoot.TrimEnd('\') -eq $myRoot.TrimEnd('\'))) {
            # 우리 클론의 기존 인스턴스
            $resolvedPort = $p
            $isOurInstance = $true
            break
        }
    } catch {
        # 응답 없음 또는 viz 가 아닌 다른 server — skip
    }
    # 다른 AIMindVaults 클론의 viz — 다음 port 계속
}

if (-not $resolvedPort) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        ("사용 가능한 port 를 찾을 수 없습니다 ({0} ~ {1}).`n다른 viz 인스턴스를 종료하고 다시 시도하세요." -f $startPort, ($startPort + $maxScan - 1)),
        'AIMindVaults Visualization',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    exit 1
}

$env:AIMV_VIZ_PORT = $resolvedPort.ToString()
$url = "http://localhost:$resolvedPort"

if ($isOurInstance) {
    Open-VizBrowser -Browser $browser -Url $url
    exit 0
}

# 공통 경로 (R146 + R133 양쪽에서 사용)
$masterIndexPath = Join-Path $myRoot '.vault_data\master_index.json'
$coreCliDir = Join-Path $myRoot 'Vaults\BasicVaults\CoreHub\.sync\_tools\cli-node'
$coreCliPath = Join-Path $coreCliDir 'bin\cli.js'
$coreNodeModules = Join-Path $coreCliDir 'node_modules'

# R149 — 디바이스 자동 동기화 백그라운드 + UI 상태 표시
# R146 의 wait 동기 방식 (35-57s 사용자 대기) 을 비동기 백그라운드로 전환.
# viz UI 는 즉시 띄움 (master 가 stale 해도 표시). 백그라운드 powershell 이
# git pull + sync-all 진행하며 .vault_data/.sync-status.json 갱신.
# viz SPA sync-banner.js 가 /api/sync-status polling → 진행/완료/실패 표시.
# fail-safe 동일: 실패해도 viz 진입 계속.

$statusFile = Join-Path $myRoot '.vault_data\.sync-status.json'
$statusDir = Split-Path $statusFile -Parent
if (-not (Test-Path $statusDir)) {
    New-Item -ItemType Directory -Path $statusDir -Force | Out-Null
}

# 초기 상태 — running, step=starting
$initStatus = @{
    status = 'running'
    started_at = (Get-Date).ToString('o')
    completed_at = $null
    step = 'starting'
    message = '동기화 시작 중'
    error = $null
} | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText($statusFile, $initStatus, [System.Text.UTF8Encoding]::new($false))

# 백그라운드 sync script — 별도 PowerShell 프로세스로 실행
if (($env:AIMV_VIZ_AUTO_PULL -eq 'true') -or ($env:AIMV_VIZ_AUTO_SYNC -eq 'true')) {
    $bgScriptPath = Join-Path $env:TEMP 'aimv_viz_bg_sync.ps1'
    $bgScript = @"
`$ErrorActionPreference = 'Continue'
`$statusFile = '$statusFile'
`$myRoot = '$myRoot'
`$coreCliPath = '$coreCliPath'
`$coreCliDir = '$coreCliDir'
`$coreNodeModules = '$coreNodeModules'
`$masterIndexPath = '$masterIndexPath'
`$nodeExe = '$($nodeCmd.Source)'
`$autoPull = '$($env:AIMV_VIZ_AUTO_PULL)'
`$autoSync = '$($env:AIMV_VIZ_AUTO_SYNC)'

function Set-SyncStatus(`$status, `$step, `$message, `$error_val, `$completed) {
    `$obj = @{
        status = `$status
        started_at = `$started_at
        completed_at = if (`$completed) { (Get-Date).ToString('o') } else { `$null }
        step = `$step
        message = `$message
        error = `$error_val
    }
    `$json = `$obj | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText(`$statusFile, `$json, [System.Text.UTF8Encoding]::new(`$false))
}

`$started_at = (Get-Date).ToString('o')

# R170 — cold start 감지: fresh clone 은 node_modules·인덱스가 .gitignore 라 없음.
# 이 경우 R149.2 sync skip 을 무시하고 전체 부트스트랩 (npm install + sync-all full) 을 태운다.
`$coldStart = (-not (Test-Path `$coreNodeModules)) -or (-not (Test-Path `$masterIndexPath))

# 0. CoreHub CLI 의존성 (R170 — 새 디바이스 최초 1회. 없으면 sync-all 자체가 못 뜸)
if (-not (Test-Path `$coreNodeModules)) {
    Set-SyncStatus 'running' 'npm_install' 'CoreHub CLI 의존성 설치 중 (새 디바이스 최초 1회)' `$null `$false
    `$npmLog = Join-Path `$env:TEMP 'aimv_viz_npm_install.log'
    Push-Location `$coreCliDir
    & npm.cmd install --no-audit --no-fund *> `$npmLog
    `$npmExit = `$LASTEXITCODE
    Pop-Location
    if (`$npmExit -ne 0) {
        Set-SyncStatus 'failed' 'npm_install' "CoreHub CLI 의존성 설치 실패 — 로그: `$npmLog" "npm exit `$npmExit" `$true
        return
    }
}

# 1. git pull + 변동 감지
`$pullChanged = `$false
if (`$autoPull -eq 'true') {
    Set-SyncStatus 'running' 'git_pull' 'git pull --ff-only origin main' `$null `$false
    `$pullLog = Join-Path `$env:TEMP 'aimv_viz_git_pull.log'
    try {
        `$gitExe = (Get-Command git -ErrorAction Stop).Source
        if (Test-Path (Join-Path `$myRoot '.git')) {
            & `$gitExe -C `$myRoot pull --ff-only origin main *> `$pullLog
            `$pullExit = `$LASTEXITCODE
            # R149.2 — 변동 감지: pull 성공 + 'Already up to date' 아님 = 변동 있음.
            # R170 — pull 실패 (네트워크·diverged) 출력을 변동으로 오판하지 않음. fail-safe 로 계속.
            `$pullContent = Get-Content `$pullLog -Raw -ErrorAction SilentlyContinue
            if (`$pullExit -eq 0 -and `$pullContent -and (`$pullContent -notmatch 'Already up to date')) {
                `$pullChanged = `$true
            }
        }
    } catch {
        # git 없음 또는 fail — 계속 진행
    }
}

# 2. sync-all (변동 있을 때만 — cold start 는 무조건)
if (`$autoSync -eq 'true') {
    if (-not `$coldStart -and -not `$pullChanged -and `$autoPull -eq 'true') {
        # R149.2 — git pull 변동 0 → sync-all skip (이미 최신)
        Set-SyncStatus 'done' 'done' '이미 최신 (git pull 변동 없음 → sync 건너뜀)' `$null `$true
        return
    }
    # R170 — --skip-npm 제거: 볼트 로컬 node_modules 부재 시 sync-all 이 자동 설치
    # (존재 시 즉시 skip 이라 웜 패스 비용 0). cold start 는 장기 소요 안내 메시지로 구분.
    `$syncMsg = if (`$coldStart) { '새 디바이스 초기화 — 전체 볼트 의존성 설치 + 인덱스 빌드 (수 분 소요 가능)' } else { 'sync-all (vault 인덱싱 + master 빌드)' }
    Set-SyncStatus 'running' 'sync_all' `$syncMsg `$null `$false
    `$syncLog = Join-Path `$env:TEMP 'aimv_viz_sync_all.log'
    try {
        if ((Test-Path `$coreCliPath)) {
            & `$nodeExe `$coreCliPath sync-all --root `$myRoot *> `$syncLog
            if (`$LASTEXITCODE -ne 0) {
                # R170 — 부분 실패 포함 exit != 0 은 정직하게 failed 보고 (기존: 무조건 done)
                Set-SyncStatus 'failed' 'sync_all' "동기화 일부 실패 — 로그: `$syncLog" "sync-all exit `$LASTEXITCODE" `$true
                return
            }
        } elseif (`$coldStart) {
            Set-SyncStatus 'failed' 'sync_all' 'CoreHub CLI 를 찾을 수 없습니다 — 클론 상태 확인 필요' `$null `$true
            return
        }
    } catch {
        Set-SyncStatus 'failed' 'sync_all' '동기화 실패' `$_.Exception.Message `$true
        return
    }
}

# 3. done
Set-SyncStatus 'done' 'done' '동기화 완료 — 새 데이터 보려면 reload' `$null `$true
"@
    # R149.1 — UTF-8 with BOM 저장 (PowerShell 5.1 이 BOM 없으면 cp949 로 해석 → 한글 mojibake).
    [System.IO.File]::WriteAllText($bgScriptPath, $bgScript, [System.Text.UTF8Encoding]::new($true))
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $bgScriptPath) `
        -WindowStyle Hidden | Out-Null
} else {
    # 자동 동기화 둘 다 off — idle 표시
    $idleStatus = @{
        status = 'idle'
        started_at = (Get-Date).ToString('o')
        completed_at = (Get-Date).ToString('o')
        step = $null
        message = '자동 동기화 비활성 (AIMV_VIZ_AUTO_PULL/SYNC=false)'
        error = $null
    } | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText($statusFile, $idleStatus, [System.Text.UTF8Encoding]::new($false))
}

# R133 — viz 시작 시 인덱스 검증 + 자동 빌드 (AUTO_SYNC off 사용자 대응 안전망)
# master_index.json 부재 시 CoreHub cli.js 로 자동 master-build.
# R170 — AUTO_SYNC on 이면 백그라운드 sync-all 이 npm install + 볼트 인덱스 + master 빌드를
# 전담하므로 이 동기(-Wait) fallback 은 건너뜀 (cold start 에서 차단성 MessageBox·중복 빌드 방지).

if (($env:AIMV_VIZ_AUTO_SYNC -ne 'true') -and -not (Test-Path $masterIndexPath)) {
    if ((Test-Path $coreCliPath) -and (Test-Path $coreNodeModules)) {
        $buildLog = Join-Path $env:TEMP 'aimv_viz_first_build.log'
        $buildErr = Join-Path $env:TEMP 'aimv_viz_first_build_err.log'
        $buildProc = Start-Process -FilePath $nodeCmd.Source `
            -ArgumentList @($coreCliPath, 'index', 'master-build', '-r', $myRoot) `
            -WorkingDirectory $myRoot `
            -WindowStyle Hidden `
            -RedirectStandardOutput $buildLog `
            -RedirectStandardError $buildErr `
            -PassThru -Wait
        if ($buildProc.ExitCode -ne 0 -or -not (Test-Path $masterIndexPath)) {
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show(
                "master_index 자동 빌드 실패. 'Sync All Vaults' 를 먼저 실행하세요.`n`n로그: $buildLog",
                'AIMindVaults Visualization',
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Warning
            ) | Out-Null
        }
    } else {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "master_index.json 이 없습니다.`n`n'Sync All Vaults' 또는 'Setup New Device' 를 먼저 실행하여 인덱스를 빌드하세요.",
            'AIMindVaults Visualization',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
    }
}

# R149.1 — server port polling 후 즉시 chrome (이전 고정 4s 대기 → 평균 1-2s 단축)
# 별도 PS 프로세스에서 TcpClient 로 port listening 확인되면 chrome 띄움. 최대 10s 폴백.
$browserCmd = if ($browser) {
    "for (`$i = 0; `$i -lt 30; `$i++) { try { `$tcp = New-Object System.Net.Sockets.TcpClient; `$t = `$tcp.ConnectAsync('localhost', $resolvedPort); if (`$t.Wait(300) -and `$tcp.Connected) { `$tcp.Close(); break } `$tcp.Close() } catch {} Start-Sleep -Milliseconds 200 }; Start-Process -FilePath '$browser' -ArgumentList '--app=$url'"
} else {
    "for (`$i = 0; `$i -lt 30; `$i++) { try { `$tcp = New-Object System.Net.Sockets.TcpClient; `$t = `$tcp.ConnectAsync('localhost', $resolvedPort); if (`$t.Wait(300) -and `$tcp.Connected) { `$tcp.Close(); break } `$tcp.Close() } catch {} Start-Sleep -Milliseconds 200 }; Start-Process '$url'"
}
Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-Command', $browserCmd) `
    -WindowStyle Hidden | Out-Null

# server.js 를 별도 hidden 프로세스로 실행 + stdout/stderr 를 임시 파일로 격리.
# ps2exe -NoConsole 모드가 native command 출력을 MessageBox 로 띄우는 문제를 회피.
# .exe 본체는 즉시 종료 — node 가 background 로 server 운영하고
# server.js 의 idle 자동 종료 (AIMV_VIZ_IDLE_MS=15000) 가 정리한다.
$stdoutLog = Join-Path $env:TEMP 'aimv_viz_stdout.log'
$stderrLog = Join-Path $env:TEMP 'aimv_viz_stderr.log'

Start-Process -FilePath $nodeCmd.Source `
    -ArgumentList @("`"$serverJs`"") `
    -WorkingDirectory $exeDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog | Out-Null

exit 0

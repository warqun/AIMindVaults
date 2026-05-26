# AIMindVaults Visualization Launcher
# ps2exe 로 .exe 컴파일 대상. .vbs/.bat 런처를 PS 한 곳으로 통합.
#   - Node.js 18+ 존재 체크 → 부재 시 MessageBox 안내 + nodejs.org 열기
#   - server.js 를 foreground 로 실행 (앱 창 닫히면 idle 자동 종료)
#   - Chrome --app 또는 Edge --app 으로 별도 창. 부재 시 기본 브라우저 fallback.

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

# R133 — viz 시작 시 인덱스 검증 + 자동 빌드 (sync-all 안 쓴 사용자 대응 안전망)
# master_index.json 부재 시 CoreHub cli.js 로 자동 master-build. 빌드 실패해도 server 는 진입 (사용자 인지 가능).
$masterIndexPath = Join-Path $myRoot '.vault_data\master_index.json'
$coreCliPath = Join-Path $myRoot 'Vaults\BasicVaults\CoreHub\.sync\_tools\cli-node\bin\cli.js'
$coreNodeModules = Join-Path $myRoot 'Vaults\BasicVaults\CoreHub\.sync\_tools\cli-node\node_modules'

if (-not (Test-Path $masterIndexPath)) {
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

# 4초 후 브라우저 띄움 — 별도 PowerShell 프로세스 (창 숨김)
$browserCmd = if ($browser) {
    "Start-Sleep -Seconds 4; Start-Process -FilePath '$browser' -ArgumentList '--app=$url'"
} else {
    "Start-Sleep -Seconds 4; Start-Process '$url'"
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

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

# 기존 viz 인스턴스 감지 — port 가 이미 listening 중이면 server 안 띄우고 Chrome 만.
$alreadyRunning = $false
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $task = $client.ConnectAsync('localhost', $port)
    if ($task.Wait(500) -and $client.Connected) {
        $alreadyRunning = $true
    }
    $client.Close()
} catch {
    $alreadyRunning = $false
}

if ($alreadyRunning) {
    Open-VizBrowser -Browser $browser -Url $url
    exit 0
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

<#
.SYNOPSIS
    sync_workspace.ps1 실행 전 스크립트 최신화 검사
.DESCRIPTION
    Hub의 sync_workspace.ps1 버전과 로컬 버전을 비교하여
    다르면 Hub 버전으로 교체한 후 sync_workspace.ps1을 실행한다.
    Obsidian Shell Commands에서 이 스크립트를 호출하면 된다.
.EXAMPLE
    .\pre_sync.ps1
#>

$ErrorActionPreference = "Continue"

# ── 경로 탐지 ──
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VaultRoot = (Resolve-Path "$ScriptDir\..\..").Path
$syncScript = Join-Path $ScriptDir "sync_workspace.ps1"

# Hub 경로 탐지 (sync_workspace.ps1과 동일 로직)
$HubPath = ""
$normalizedVault = (Resolve-Path $VaultRoot).Path.TrimEnd('\')

# 1차: 스크립트 위치 기반
$HubFromScript = (Resolve-Path "$ScriptDir\..\..").Path.TrimEnd('\')
if ($HubFromScript -ne $normalizedVault -and (Test-Path (Join-Path $HubFromScript ".sync\.hub_marker"))) {
    $HubPath = $HubFromScript
}

# 2차: AIMindVaults 루트에서 .hub_marker 탐색
if (-not $HubPath) {
    $walkDir = $VaultRoot
    $rootDir = ""
    for ($i = 0; $i -lt 10; $i++) {
        $walkParent = Split-Path -Parent $walkDir
        if (-not $walkParent -or $walkParent -eq $walkDir) { break }
        if (Test-Path (Join-Path $walkParent "Vaults")) {
            $rootDir = $walkParent
            break
        }
        $walkDir = $walkParent
    }
    if ($rootDir) {
        $vaultsDir = Join-Path $rootDir "Vaults"
        $hubCandidate = Get-ChildItem -Path $vaultsDir -Directory -Recurse -Depth 3 |
            Where-Object {
                $candidatePath = (Resolve-Path $_.FullName).Path.TrimEnd('\')
                ($candidatePath -ne $normalizedVault) -and
                (Test-Path (Join-Path $_.FullName ".sync\.hub_marker"))
            } | Select-Object -First 1
        if ($hubCandidate) { $HubPath = $hubCandidate.FullName }
    }
}

# Hub를 찾지 못하면 sync_workspace.ps1 직접 실행
if (-not $HubPath -or -not (Test-Path $HubPath)) {
    Write-Host "[PRE_SYNC] Hub를 찾을 수 없습니다. sync_workspace.ps1을 그대로 실행합니다." -ForegroundColor DarkYellow
    & $syncScript
    exit $LASTEXITCODE
}

# 자기 자신이 Hub이면 sync 불필요
if ($normalizedVault -eq (Resolve-Path $HubPath).Path.TrimEnd('\')) {
    Write-Host "[PRE_SYNC] 현재 볼트가 Hub입니다. 동기화 불필요." -ForegroundColor Cyan
    exit 0
}

# ── 스크립트 버전 비교 ──
$hubSyncScript = Join-Path $HubPath "_tools\cli\sync_workspace.ps1"

if ((Test-Path $hubSyncScript) -and (Test-Path $syncScript)) {
    $localHash = (Get-FileHash -Path $syncScript -Algorithm SHA256).Hash
    $hubHash = (Get-FileHash -Path $hubSyncScript -Algorithm SHA256).Hash

    if ($localHash -ne $hubHash) {
        Write-Host "[PRE_SYNC] sync_workspace.ps1이 Hub와 다릅니다. 최신화합니다." -ForegroundColor Yellow
        Copy-Item -Path $hubSyncScript -Destination $syncScript -Force
        Write-Host "[PRE_SYNC] 최신화 완료." -ForegroundColor Green
    } else {
        Write-Host "[PRE_SYNC] sync_workspace.ps1 최신 상태." -ForegroundColor DarkGray
    }
}

# ── pre_sync 자기 자신도 최신화 (트램펄린 패턴) ──
$hubPreSync = Join-Path $HubPath "_tools\cli\pre_sync.ps1"
$selfPath = $MyInvocation.MyCommand.Path
if ((Test-Path $hubPreSync) -and (Test-Path $selfPath)) {
    $selfHash = (Get-FileHash -Path $selfPath -Algorithm SHA256).Hash
    $hubPreHash = (Get-FileHash -Path $hubPreSync -Algorithm SHA256).Hash
    if ($selfHash -ne $hubPreHash) {
        Write-Host "[PRE_SYNC] pre_sync.ps1 자체도 최신화합니다. 새 버전으로 재실행..." -ForegroundColor Yellow
        Copy-Item -Path $hubPreSync -Destination $selfPath -Force
        # 트램펄린: 새 버전을 새 프로세스로 실행하고 현재(구버전) 종료
        Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$selfPath`"" -WindowStyle Hidden
        exit 0
    }
}

# ── sync_workspace.ps1 실행 ──
Write-Host "[PRE_SYNC] sync_workspace.ps1 실행..." -ForegroundColor Cyan
& $syncScript
exit $LASTEXITCODE

<#
.SYNOPSIS
    볼트 간 작업환경 동기화 스크립트 (Hub-Sync)
.DESCRIPTION
    현재 볼트의 _WORKSPACE_VERSION.md 최상단 버전과
    AIHubVault의 최상단 버전을 비교하여 동기화를 수행합니다.
    - AIHubVault가 최신 → Pull: AIHubVault → 현재 볼트
    - 현재 볼트가 최신 → Push: 현재 볼트 → AIHubVault
    - 동일 → "최신 상태" 보고
.PARAMETER HubPath
    AIHubVault 경로 (미지정 시 자동 탐지)
.PARAMETER DryRun
    실제 복사 없이 동기화 대상만 출력
.PARAMETER NoPrune
    소스에 없고 타겟에만 있는 파일 삭제를 비활성화 (기본: 삭제 활성)
.PARAMETER VerifyContent
    버전 번호가 동일해도 파일 해시 비교를 강제 수행
.EXAMPLE
    .\sync_workspace.ps1
    .\sync_workspace.ps1 -DryRun
    .\sync_workspace.ps1 -NoPrune
    .\sync_workspace.ps1 -VerifyContent
#>

param(
    [string]$HubPath = "",
    [switch]$DryRun,
    [switch]$NoPrune,
    [switch]$VerifyContent
)

# ErrorAction을 Continue로 변경 — 개별 파일 실패 시 로그 남기고 계속 진행
$ErrorActionPreference = "Continue"
$failedFiles = @()

# ── 경로 자동탐지 ──
# 현재 볼트: CWD에서 볼트 루트 탐지 (_VAULT-INDEX.md 또는 CLAUDE.md 기준)
$VaultRoot = ""
$searchDir = (Get-Location).Path
for ($i = 0; $i -lt 10; $i++) {
    if ((Test-Path (Join-Path $searchDir "_VAULT-INDEX.md")) -or
        (Test-Path (Join-Path $searchDir "CLAUDE.md"))) {
        $VaultRoot = $searchDir
        break
    }
    $parent = Split-Path -Parent $searchDir
    if (-not $parent -or $parent -eq $searchDir) { break }
    $searchDir = $parent
}
if (-not $VaultRoot) {
    Write-Host "SYNC_RESULT=ERROR" -ForegroundColor Red
    Write-Error "현재 위치에서 볼트 루트를 탐지할 수 없습니다. 볼트 내부에서 실행하세요."
    exit 1
}

# ── 사용자 알림 함수 (실패 시 Windows 토스트) ──
function Show-SyncToast {
    param([string]$Title, [string]$Message)
    try {
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $textNodes = $template.GetElementsByTagName("text")
        $textNodes.Item(0).AppendChild($template.CreateTextNode($Title)) | Out-Null
        $textNodes.Item(1).AppendChild($template.CreateTextNode($Message)) | Out-Null
        $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("AIMindVaults").Show($toast)
    } catch {
        # 토스트 실패 시 무시 — 터미널 출력은 이미 완료됨
    }
}

# ── Hub 경로 자동탐지 ──
# Hub 식별 마커: _forge/ 디렉토리 (AIHubVault 전용, 동기화 제외 대상)
if (-not $HubPath) {
    $normalizedVault = (Resolve-Path $VaultRoot).Path.TrimEnd('\')

    # 1차: 스크립트 위치 기반 (AIHubVault 원본에서 실행 시 즉시 확정)
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $HubFromScript = (Resolve-Path "$ScriptDir\..\..").Path.TrimEnd('\')

    if ($HubFromScript -ne $normalizedVault -and (Test-Path (Join-Path $HubFromScript "_forge"))) {
        $HubPath = $HubFromScript
    } else {
        # 2차: 로컬 사본 실행 — AIMindVaults 루트(Vaults/ 보유 조상)에서 _forge/ 마커 재귀 탐색
        $rootDir = ""
        $walkDir = $VaultRoot
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
                    (Test-Path (Join-Path $_.FullName "_forge"))
                } |
                Select-Object -First 1
            if ($hubCandidate) {
                $HubPath = $hubCandidate.FullName
            }
        }
    }
}

if (-not $HubPath -or -not (Test-Path $HubPath)) {
    Write-Host "SYNC_RESULT=ERROR" -ForegroundColor Red
    Write-Error "AIHubVault(Hub)를 자동 탐지할 수 없습니다. -HubPath 파라미터로 직접 지정하세요."
    Show-SyncToast "Workspace Sync Error" "Hub vault not found. Sync aborted."
    exit 1
}

# ── 스크립트 버전 (pre_sync.ps1이 이 값을 Hub와 비교하여 최신화 판정) ──
$SYNC_SCRIPT_VERSION = "202603210015"

# 자기 자신이 Hub인지 확인
$normalizedVault = (Resolve-Path $VaultRoot).Path.TrimEnd('\')
$normalizedHub = (Resolve-Path $HubPath).Path.TrimEnd('\')
if ($normalizedVault -eq $normalizedHub) {
    Write-Host "SYNC_RESULT=SELF" -ForegroundColor Cyan
    Write-Host "현재 볼트가 AIHubVault(Hub) 자체입니다. 동기화 불필요."
    exit 0
}

# ── 배치 동기화 대상 정의 ──
$batch1Targets = @(
    "Juggl_StyleGuide"
)
$batch2Targets = @(
    "_Standards\Core",
    "_WORKFLOW.md",
    "_VAULT-INDEX.md"
)
$batch3Targets = @(
    "_tools"
)

# ── 버전 파싱 함수 (fail-closed) ──
function Get-LatestVersion {
    param([string]$VersionFilePath)
    if (-not (Test-Path $VersionFilePath)) { return $null }
    try {
        $content = [System.IO.File]::ReadAllText($VersionFilePath, [System.Text.Encoding]::UTF8)
    } catch {
        return $null
    }
    $lines = $content -split "`n"
    foreach ($line in $lines) {
        if ($line -match '^\|\s*(\d{12})\s*\|') {
            return $matches[1]
        }
    }
    return $null  # 형식 파싱 실패
}

# ── 버전 비교 ──
$vaultVersionFile = Join-Path $VaultRoot "_WORKSPACE_VERSION.md"
$hubVersionFile = Join-Path $HubPath "_WORKSPACE_VERSION.md"

$vaultVersion = Get-LatestVersion $vaultVersionFile
$hubVersion = Get-LatestVersion $hubVersionFile

Write-Host "=== Workspace Sync ===" -ForegroundColor Yellow
Write-Host "현재 볼트: $VaultRoot"
Write-Host "Hub:       $HubPath"
Write-Host "볼트 버전: $(if ($vaultVersion) { $vaultVersion } else { '(없음/파싱실패)' })"
Write-Host "Hub 버전:  $(if ($hubVersion) { $hubVersion } else { '(없음/파싱실패)' })"
Write-Host ""

# [FIX: fail-closed] Hub 버전 파싱 실패 시 즉시 중단
if ($null -eq $hubVersion) {
    Write-Host "SYNC_RESULT=ERROR" -ForegroundColor Red
    Write-Host "Hub의 _WORKSPACE_VERSION.md가 없거나 형식이 올바르지 않습니다. 동기화 중단."
    exit 1
}

# 현재 볼트 버전 파싱 실패 시 → 무조건 Pull (초기화 상태로 간주)
if ($null -eq $vaultVersion) {
    Write-Host "경고: 현재 볼트의 _WORKSPACE_VERSION.md가 없거나 형식이 올바르지 않습니다." -ForegroundColor DarkYellow
    Write-Host "  → Hub 기준으로 전체 동기화를 수행합니다." -ForegroundColor DarkYellow
    $vaultVersion = "000000000000"  # 가장 오래된 값으로 설정하여 PULL 유도
}

# 버전 동일 시 처리
if ($vaultVersion -eq $hubVersion) {
    if ($VerifyContent) {
        Write-Host "버전 동일하지만 -VerifyContent 플래그로 파일 해시 검증을 수행합니다." -ForegroundColor DarkYellow
        # 아래 동기화 루프로 진행 (direction=PULL로 설정하되 해시 비교만)
        $direction = "VERIFY"
        $source = $HubPath
        $target = $VaultRoot
    } else {
        Write-Host "SYNC_RESULT=UP_TO_DATE (Batch 0 플러그인 병합은 항상 실행)" -ForegroundColor Green
        # 버전 동일해도 Batch 0(플러그인 병합)은 실행 — 플러그인만 체크 후 종료
        $direction = "PLUGIN_ONLY"
        $source = $HubPath
        $target = $VaultRoot
    }
} else {
    # 방향 결정
    if ($hubVersion -gt $vaultVersion) {
        $direction = "PULL"
        $source = $HubPath
        $target = $VaultRoot
        Write-Host "SYNC_DIRECTION=PULL (Hub → 현재 볼트)" -ForegroundColor Cyan
    } else {
        $direction = "PUSH"
        $source = $VaultRoot
        $target = $HubPath
        Write-Host "SYNC_DIRECTION=PUSH (현재 볼트 → Hub)" -ForegroundColor Cyan
    }
}

# ── 파일 동기화 함수 (에러 핸들링 포함) ──
function Sync-SingleFile {
    param(
        [string]$SourceFile,
        [string]$TargetFile,
        [string]$DisplayName,
        [switch]$IsDryRun
    )
    $needSync = $false
    if (-not (Test-Path $TargetFile)) {
        $needSync = $true
    } else {
        try {
            $sourceHash = (Get-FileHash -Path $SourceFile -Algorithm MD5).Hash
            $targetHash = (Get-FileHash -Path $TargetFile -Algorithm MD5).Hash
            if ($sourceHash -ne $targetHash) { $needSync = $true }
        } catch {
            Write-Host "  [WARN] 해시 비교 실패: $DisplayName — $_" -ForegroundColor DarkYellow
            $needSync = $true
        }
    }
    if (-not $needSync) { return $false }

    if ($IsDryRun) {
        Write-Host "  [DRY] $DisplayName" -ForegroundColor DarkGray
    } else {
        try {
            $targetDir = Split-Path -Parent $TargetFile
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            Copy-Item -Path $SourceFile -Destination $TargetFile -Force
            Write-Host "  [SYNC] $DisplayName" -ForegroundColor Green
        } catch {
            Write-Host "  [FAIL] $DisplayName — $_" -ForegroundColor Red
            $script:failedFiles += $DisplayName
            return $false
        }
    }
    return $true
}

# ── 동기화 실행 ──
# ── 배치 실행 함수 ──
function Sync-BatchTargets {
    param([string[]]$Targets)
    $initialFailures = $script:failedFiles.Count
    
    foreach ($item in $Targets) {
        $sourcePath = Join-Path $source $item
        $targetPath = Join-Path $target $item

        if (-not (Test-Path $sourcePath)) { continue }

        if (Test-Path $sourcePath -PathType Container) {
            # 디렉토리: 재귀 비교 후 복사
            $sourceFiles = Get-ChildItem -Path $sourcePath -Recurse -File
            foreach ($file in $sourceFiles) {
                $relativePath = $file.FullName.Substring($sourcePath.Length)
                $targetFile = Join-Path $targetPath $relativePath
                $displayPath = "$item$relativePath"

                $synced = Sync-SingleFile -SourceFile $file.FullName -TargetFile $targetFile -DisplayName $displayPath -IsDryRun:$DryRun
                if ($synced) { $script:syncCount++ }
            }

            # [FIX: Prune] 소스에 없고 타겟에만 있는 stale 파일 삭제 (기본 활성, -NoPrune으로 비활성화)
            if ((-not $NoPrune) -and (Test-Path $targetPath)) {
                $targetFiles = Get-ChildItem -Path $targetPath -Recurse -File
                foreach ($tFile in $targetFiles) {
                    $relPath = $tFile.FullName.Substring($targetPath.Length)
                    $correspondingSource = Join-Path $sourcePath $relPath
                    if (-not (Test-Path $correspondingSource)) {
                        $displayPath = "$item$relPath"
                        if ($DryRun) {
                            $script:pruneCount++
                            Write-Host "  [DRY-PRUNE] $displayPath" -ForegroundColor DarkMagenta
                        } else {
                            try {
                                Remove-Item -Path $tFile.FullName -Force
                                $script:pruneCount++
                                Write-Host "  [PRUNE] $displayPath" -ForegroundColor Magenta
                            } catch {
                                Write-Host "  [FAIL-PRUNE] $displayPath — $_" -ForegroundColor Red
                                $script:failedFiles += "[PRUNE] $displayPath"
                            }
                        }
                    }
                }
            }
        } else {
            # 단일 파일
            $synced = Sync-SingleFile -SourceFile $sourcePath -TargetFile $targetPath -DisplayName $item -IsDryRun:$DryRun
            if ($synced) { $script:syncCount++ }
        }
    }
    
    $script:currentBatchFailed = ($script:failedFiles.Count -gt $initialFailures)
}

# ── 플러그인 병합 동기화 함수 (Batch 0 전용) ──
function Sync-PluginBatch {
    param(
        [string]$SourceRoot,
        [string]$TargetRoot
    )
    $sourcePlugins = Join-Path $SourceRoot ".obsidian\plugins"
    $targetPlugins = Join-Path $TargetRoot ".obsidian\plugins"

    if (-not (Test-Path $sourcePlugins)) {
        Write-Host "  [SKIP] 소스에 .obsidian/plugins/ 없음" -ForegroundColor DarkGray
        return
    }
    if (-not (Test-Path $targetPlugins)) {
        New-Item -ItemType Directory -Path $targetPlugins -Force | Out-Null
    }

    # 1) 플러그인 폴더 병합: Hub에 있는 것만 추가/업데이트 (타겟 고유 플러그인은 유지)
    $hubPluginDirs = Get-ChildItem -Path $sourcePlugins -Directory
    foreach ($pluginDir in $hubPluginDirs) {
        $pluginId = $pluginDir.Name
        $targetPluginDir = Join-Path $targetPlugins $pluginId

        $sourceFiles = Get-ChildItem -Path $pluginDir.FullName -File
        foreach ($file in $sourceFiles) {
            # data.json은 타겟에 이미 있으면 건드리지 않음 (볼트별 설정 보존)
            if ($file.Name -eq "data.json" -and (Test-Path (Join-Path $targetPluginDir "data.json"))) {
                continue
            }
            $targetFile = Join-Path $targetPluginDir $file.Name
            $displayName = ".obsidian\plugins\$pluginId\$($file.Name)"
            $synced = Sync-SingleFile -SourceFile $file.FullName -TargetFile $targetFile -DisplayName $displayName -IsDryRun:$DryRun
            if ($synced) { $script:syncCount++ }
        }
    }

    # 2) community-plugins.json 머지 (텍스트 기반 — Hub 플러그인을 타겟에 추가)
    #    Hub의 플러그인 ID를 타겟에 병합. 타겟 고유 플러그인도 보존.
    #    Obsidian 시작 시 이 파일을 읽어 플러그인을 활성화함.
    $sourceCpFile = Join-Path $SourceRoot ".obsidian\community-plugins.json"
    $targetCpFile = Join-Path $TargetRoot ".obsidian\community-plugins.json"

    if (Test-Path $sourceCpFile) {
        $sourceContent = [System.IO.File]::ReadAllText($sourceCpFile, [System.Text.Encoding]::UTF8)
        $sourceIds = [regex]::Matches($sourceContent, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }

        # 타겟에서 현재 활성화된 플러그인 목록
        $targetIds = @()
        if (Test-Path $targetCpFile) {
            $targetContent = [System.IO.File]::ReadAllText($targetCpFile, [System.Text.Encoding]::UTF8)
            $targetIds = [regex]::Matches($targetContent, '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
        }

        # 머지: Hub + 타겟 고유 플러그인 (중복 제거, 정렬)
        $mergedIds = @($sourceIds)
        foreach ($id in $targetIds) {
            if ($id -notin $mergedIds) {
                $mergedIds += $id
            }
        }
        $mergedIds = $mergedIds | Sort-Object

        # 새로 추가되는 플러그인 감지 (로그용)
        $newPlugins = @()
        foreach ($id in $sourceIds) {
            if ($id -notin $targetIds) {
                $newPlugins += $id
            }
        }

        # 현재 타겟과 다를 때만 쓰기
        $needsWrite = ($mergedIds.Count -ne $targetIds.Count) -or ($newPlugins.Count -gt 0)
        if ($needsWrite) {
            if ($DryRun) {
                Write-Host "  [DRY] community-plugins.json 머지: +$($newPlugins.Count) 플러그인" -ForegroundColor DarkGray
            } else {
                # JSON 배열을 텍스트로 직접 생성 (ConvertTo-Json 사용 금지 — 안전 규칙)
                $jsonLines = @("[")
                for ($i = 0; $i -lt $mergedIds.Count; $i++) {
                    $comma = if ($i -lt $mergedIds.Count - 1) { "," } else { "" }
                    $jsonLines += "  `"$($mergedIds[$i])`"$comma"
                }
                $jsonLines += "]"
                $jsonText = $jsonLines -join "`n"
                $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
                [System.IO.File]::WriteAllText($targetCpFile, $jsonText, $utf8NoBom)

                if ($newPlugins.Count -gt 0) {
                    Write-Host "  [MERGE] community-plugins.json: +$($newPlugins.Count) 플러그인 추가" -ForegroundColor Green
                    foreach ($pluginName in $newPlugins) {
                        Write-Host "    [ADD] $pluginName" -ForegroundColor Green
                    }
                } else {
                    Write-Host "  [MERGE] community-plugins.json: 정렬 갱신" -ForegroundColor DarkGray
                }
                $script:syncCount += $newPlugins.Count

                # 새 플러그인 추가 시 리로드 플래그 생성 (pre_sync.ps1이 감지하여 Obsidian 리로드 트리거)
                if ($newPlugins.Count -gt 0) {
                    $reloadFlag = Join-Path $TargetRoot ".obsidian\.sync-needs-reload"
                    [System.IO.File]::WriteAllText($reloadFlag, "new_plugins=$($newPlugins.Count)", $utf8NoBom)
                }
            }
        }
    }
}

# ── 동기화 실행 ──
$syncCount = 0
$pruneCount = 0

# Batch 0: 플러그인 병합 (Merge 방식 — 타겟 고유 플러그인 보존, 항상 실행)
Write-Host "`n--- Batch 0: Obsidian 플러그인 병합 ---" -ForegroundColor Cyan
if ($direction -eq "PULL" -or $direction -eq "VERIFY" -or $direction -eq "PLUGIN_ONLY") {
    Sync-PluginBatch -SourceRoot $source -TargetRoot $target
} else {
    Write-Host "  [SKIP] PUSH 방향에서는 플러그인 동기화를 수행하지 않습니다." -ForegroundColor DarkGray
}

# ── Obsidian 리로드 트리거 함수 ──
function Invoke-ObsidianReload {
    param([string]$VaultPath)
    $reloadFlag = Join-Path $VaultPath ".obsidian\.sync-needs-reload"
    if (-not (Test-Path $reloadFlag)) { return }
    Remove-Item $reloadFlag -Force -ErrorAction SilentlyContinue

    # 쿨다운: 최근 60초 이내에 리로드했으면 건너뜀 (무한 루프 방지)
    $cooldownFile = Join-Path $VaultPath ".obsidian\.sync-reload-cooldown"
    if (Test-Path $cooldownFile) {
        $lastReload = (Get-Item $cooldownFile).LastWriteTime
        $elapsed = ((Get-Date) - $lastReload).TotalSeconds
        if ($elapsed -lt 60) {
            Write-Host "  [RELOAD] 쿨다운 중 ($([math]::Round($elapsed))초 전 리로드) — 건너뜀" -ForegroundColor DarkYellow
            return
        }
    }
    [System.IO.File]::WriteAllText($cooldownFile, (Get-Date).ToString("o"), [System.Text.UTF8Encoding]::new($false))

    $restApiData = Join-Path $VaultPath ".obsidian\plugins\obsidian-local-rest-api\data.json"
    if (Test-Path $restApiData) {
        try {
            $apiContent = [System.IO.File]::ReadAllText($restApiData, [System.Text.Encoding]::UTF8)
            $apiKey = ""
            $port = 27123
            if ($apiContent -match '"apiKey"\s*:\s*"([^"]+)"') { $apiKey = $matches[1] }
            if ($apiContent -match '"insecurePort"\s*:\s*(\d+)') { $port = [int]$matches[1] }
            if ($apiKey) {
                $headers = @{ "Authorization" = "Bearer $apiKey" }
                Invoke-RestMethod -Uri "http://localhost:$port/commands/app%3Areload" -Method POST -Headers $headers -TimeoutSec 3
                Write-Host "  [RELOAD] Obsidian 리로드 완료 (새 플러그인 활성화)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [RELOAD] Obsidian 리로드 실패: $_" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  [RELOAD] Local REST API 미설치 — 수동 Obsidian 리로드 필요" -ForegroundColor DarkYellow
    }
}

# PLUGIN_ONLY 모드: Batch 0만 실행하고 종료
if ($direction -eq "PLUGIN_ONLY") {
    Invoke-ObsidianReload -VaultPath $target
    if ($syncCount -gt 0) {
        Write-Host "`n동기화 PLUGIN_ONLY: 플러그인 $syncCount개 항목 병합 완료" -ForegroundColor Green
    } else {
        Write-Host "`n플러그인 최신 상태 — 변경 없음" -ForegroundColor Green
    }
    exit 0
}

Write-Host "`n--- Batch 1: 문서 및 가이드 ---" -ForegroundColor Cyan
Sync-BatchTargets -Targets $batch1Targets
$b1Failed = $script:currentBatchFailed
if ($b1Failed) { Write-Host "  [WARN] Batch 1 (문서류) 일부 실패. 업무 중단 없으므로 계속 진행합니다." -ForegroundColor DarkYellow }

$b2Failed = $false
$b3Failed = $false

Write-Host "`n--- Batch 2: 규칙 및 표준 ---" -ForegroundColor Cyan
Sync-BatchTargets -Targets $batch2Targets
$b2Failed = $script:currentBatchFailed

if ($b2Failed) {
    Write-Host "  [ERROR] Batch 2 실패! 스크립트(Batch 3) 및 버전 업데이트를 중단합니다." -ForegroundColor Red
} else {
    Write-Host "`n--- Batch 3: 스크립트 실행 파일 ---" -ForegroundColor Cyan
    Sync-BatchTargets -Targets $batch3Targets
    $b3Failed = $script:currentBatchFailed
    
    if ($b3Failed) {
        Write-Host "  [ERROR] Batch 3 실패! 버전 업데이트를 중단합니다." -ForegroundColor Red
    }
}

# ── Batch 4: 버전 기록 동기화 ──
Write-Host "`n--- Batch 4: 버전 기록 동기화 ---" -ForegroundColor Cyan
if (-not $b2Failed -and -not $b3Failed) {
    if (-not $DryRun -and $direction -ne "VERIFY") {
        if ($direction -eq "PULL") {
            Copy-Item -Path $hubVersionFile -Destination $vaultVersionFile -Force
            Write-Host "  [SYNC] _WORKSPACE_VERSION.md" -ForegroundColor Green
        } else {
            Copy-Item -Path $vaultVersionFile -Destination $hubVersionFile -Force
            Write-Host "  [SYNC] _WORKSPACE_VERSION.md → Hub" -ForegroundColor Green
        }
    } elseif ($DryRun -and $direction -ne "VERIFY") {
        Write-Host "  [DRY] _WORKSPACE_VERSION.md 업데이트 시뮬레이션" -ForegroundColor DarkGray
    } elseif ($direction -eq "VERIFY") {
        Write-Host "  [VERIFY] 버전 검증 완료 (변경 없음)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "  [SKIP] 이전 핵심 배치의 실패로 인해 _WORKSPACE_VERSION.md 갱신을 건너뜁니다." -ForegroundColor DarkYellow
}

# ── 리로드 트리거 (풀 동기화 후) ──
Invoke-ObsidianReload -VaultPath $target

# ── 결과 보고 ──
Write-Host "`n=== Sync Complete ===" -ForegroundColor Yellow

if ($failedFiles.Count -gt 0) {
    if (-not $b2Failed -and -not $b3Failed) {
        # Batch 1만 실패
        Write-Host "SYNC_RESULT=SYNCED" -ForegroundColor Green
        Write-Host "동기화 완료 (단, 일부 가이드류 문서 복사 실패가 있었습니다): ${syncCount}개 성공, $($failedFiles.Count)개 실패" -ForegroundColor DarkYellow
        Write-Host "실패 파일 (문서/가이드류):" -ForegroundColor DarkYellow
        foreach ($f in $failedFiles) { Write-Host "  - $f" -ForegroundColor DarkYellow }
        exit 0
    } else {
        # Batch 2 또는 3 실패
        Write-Host "SYNC_RESULT=PARTIAL" -ForegroundColor Red
        Write-Host "동기화 부분 완료 (핵심 배치 실패로 중단됨): ${syncCount}개 성공, $($failedFiles.Count)개 실패" -ForegroundColor Red
        Write-Host "실패 파일 내역:" -ForegroundColor Red
        foreach ($f in $failedFiles) { Write-Host "  - $f" -ForegroundColor Red }
        $vaultName = Split-Path -Leaf $VaultRoot
        Show-SyncToast "Workspace Sync Failed" "$vaultName — $($failedFiles.Count) files failed (core batch error)"
        exit 2
    }
} elseif ($syncCount -eq 0 -and $pruneCount -eq 0) {
    if ($direction -eq "VERIFY") {
        Write-Host "SYNC_RESULT=VERIFIED" -ForegroundColor Green
        Write-Host "파일 해시 검증 완료: 모든 파일 일치." -ForegroundColor Green
    } else {
        Write-Host "SYNC_RESULT=VERSION_SYNCED" -ForegroundColor Green
        Write-Host "파일 내용 동일. 버전 번호만 동기화됨." -ForegroundColor Green
    }
} else {
    $mode = if ($DryRun) { "DRY_RUN" } else { "SYNCED" }
    $detail = "${syncCount}개 파일"
    if ($pruneCount -gt 0) { $detail += ", ${pruneCount}개 정리" }
    Write-Host "SYNC_RESULT=$mode" -ForegroundColor Green
    Write-Host "동기화 $($direction): $detail" -ForegroundColor Green
}

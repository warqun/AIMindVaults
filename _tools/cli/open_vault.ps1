<#
.SYNOPSIS
    Obsidian 볼트를 안전하게 여는 런처
.DESCRIPTION
    1. pre_sync.ps1 실행 (스크립트 최신화 + workspace 동기화)
    2. 동기화 완료 후 Obsidian 볼트 열기
    Obsidian이 꺼진 상태에서 실행해야 community-plugins.json 변경이 정상 반영됨.
.EXAMPLE
    .\open_vault.ps1
#>

$ErrorActionPreference = "Continue"

# ── 경로 탐지 ──
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VaultRoot = (Resolve-Path "$ScriptDir\..\..").Path

# 볼트명 추출 (폴더명)
$VaultName = Split-Path -Leaf $VaultRoot

# ── pre_sync 실행 ──
$preSyncScript = Join-Path $ScriptDir "pre_sync.ps1"
if (Test-Path $preSyncScript) {
    Write-Host "=== Pre-Sync 실행 ===" -ForegroundColor Cyan
    & $preSyncScript
    Write-Host ""
} else {
    Write-Host "[WARN] pre_sync.ps1을 찾을 수 없습니다." -ForegroundColor DarkYellow
}

# ── Obsidian 볼트 열기 ──
Write-Host "=== Obsidian 볼트 열기: $VaultName ===" -ForegroundColor Green
Start-Process "obsidian://open?vault=$VaultName"

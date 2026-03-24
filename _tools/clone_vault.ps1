#Requires -Version 5.1
<#
.SYNOPSIS
    Obsidian Vault pure mirror copy tool.
    Copies the entire source vault to a new location using robocopy.
    No file transformation, no renaming, no template generation.

.PARAMETER TargetPath
    Destination path for the new vault (e.g. C:\Obsidian\MyNewVault)

.PARAMETER ProjectName
    Display name written to make-md systemName setting.
    Defaults to the leaf folder name of TargetPath if omitted.

.EXAMPLE
    .\clone_vault.ps1 -TargetPath "C:\Obsidian\AIMindVault" -ProjectName "AIMindVault"
#>
param(
    [Parameter(Mandatory=$true)][string]$TargetPath,
    [string]$ProjectName = ""
)

$ErrorActionPreference = "Stop"

# Source vault root = parent of _tools/ (where this script lives)
$sourceRoot = Split-Path -Parent $PSScriptRoot

if (-not $ProjectName) {
    $ProjectName = Split-Path -Leaf $TargetPath
}

Write-Host ""
Write-Host "===================================================="
Write-Host " Obsidian Vault Clone"
Write-Host "===================================================="
Write-Host " Source : $sourceRoot"
Write-Host " Target : $TargetPath"
Write-Host " Name   : $ProjectName"
Write-Host "----------------------------------------------------"
Write-Host ""

# ── Step 1: Pre-flight check ──────────────────────────────────────────────────
if (-not (Test-Path $sourceRoot)) {
    Write-Host "[ERROR] Source path not found: $sourceRoot"
    exit 1
}

if (Test-Path $TargetPath) {
    Write-Host ""
    Write-Host "[ERROR] Target already exists: $TargetPath"
    Write-Host "        Vault clone CANCELLED to prevent overwriting existing vault."
    Write-Host ""
    Write-Host "        To proceed anyway, manually delete or rename the existing directory first."
    Write-Host ""
    exit 1
}

# ── Step 2: Mirror copy with robocopy ─────────────────────────────────────────
Write-Host "[1/3] Copying files with robocopy..."
Write-Host "      (This may take a moment for large vaults)"
Write-Host ""

# robocopy flags:
#   /E        - copy subdirectories including empty ones
#   /COPY:DAT - copy Data, Attributes, Timestamps (safe default)
#   /R:3      - retry 3 times on failure
#   /W:1      - wait 1 second between retries
#   /XD       - exclude directories (new vault gets its own git/sync/cache)
#   /XF       - exclude per-device volatile files (Obsidian regenerates these)
#   /NP       - no progress percentage (cleaner output)
#   /NJH      - no job header
#   /NJS      - no job summary (we print our own)

$robocopyArgs = @(
    $sourceRoot,
    $TargetPath,
    "/E",
    "/COPY:DAT",
    "/R:3", "/W:1",
    "/XD", ".git", ".stfolder", "smart-connections", "cache",
    "/XF", "workspace.json", "workspace-mobile.json", "graph.json",
           "backlink-in-document.json", ".stignore", ".sync-conflict-*",
    "/NP", "/NJH", "/NJS"
)

& robocopy @robocopyArgs
$rc = $LASTEXITCODE

# robocopy exit codes:
#   0 = No files copied (source/dest identical)
#   1 = Files copied successfully
#   2 = Extra files/dirs in dest (not an error)
#   3 = 0+2 combined
#   4 = Mismatched files found (not an error for our purposes)
#   7 = 1+2+4
#   8+ = At least one failure

Write-Host ""
if ($rc -ge 8) {
    Write-Host "[ERROR] robocopy encountered failures (exit code: $rc)"
    Write-Host "        Some files may not have been copied."
    Write-Host "        Check output above for details."
    exit 1
} elseif ($rc -eq 4) {
    Write-Host "[WARN] robocopy reported mismatched files (exit code: 4)."
    Write-Host "       This is usually not critical. Verify the target."
} else {
    Write-Host "[OK] All files copied (exit code: $rc)"
}

# ── Step 3: Remove per-device plugin configs ─────────────────────────────────
Write-Host ""
Write-Host "[2/3] Removing per-device plugin configs..."

$perDeviceConfigs = @(
    ".obsidian\plugins\obsidian-git\data.json",
    ".obsidian\plugins\claudian\data.json"
)
foreach ($rel in $perDeviceConfigs) {
    $filePath = Join-Path $TargetPath $rel
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "  - Removed: $rel"
    }
}

# ── Step 4: Update make-md systemName ─────────────────────────────────────────
Write-Host ""
Write-Host "[3/3] Updating plugin settings..."

$makeMdPath = Join-Path $TargetPath ".obsidian\plugins\make-md\data.json"
if (Test-Path $makeMdPath) {
    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        $content = [System.IO.File]::ReadAllText($makeMdPath, $utf8NoBom)
        $updated = $content -replace '"systemName"\s*:\s*"[^"]*"', ('"systemName": "' + $ProjectName + '"')
        if ($content -ne $updated) {
            [System.IO.File]::WriteAllText($makeMdPath, $updated, $utf8NoBom)
            Write-Host "  - make-md systemName -> $ProjectName [OK]"
        } else {
            Write-Host "  - make-md systemName: already up to date"
        }
    } catch {
        Write-Host "  - [WARN] Could not update make-md data.json: $_"
    }
} else {
    Write-Host "  - make-md plugin not found, skipping"
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "===================================================="
Write-Host " DONE"
Write-Host "===================================================="
Write-Host " Vault copied to : $TargetPath"
Write-Host " System name set : $ProjectName"
Write-Host ""
Write-Host " Next: Open Obsidian -> Manage vaults -> Open folder"
Write-Host "       Select: $TargetPath"
Write-Host "===================================================="
Write-Host ""

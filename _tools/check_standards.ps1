$VaultRoot = Split-Path $PSScriptRoot -Parent
$std = Join-Path $VaultRoot "_Standards"
Write-Host "=== _Standards/ 루트 ===" -ForegroundColor Cyan
Get-ChildItem $std | Select-Object Name, PSIsContainer | Format-Table -AutoSize

$corePath = Join-Path $std "Core"
if (Test-Path $corePath) {
    Write-Host "=== _Standards/Core/ ===" -ForegroundColor Cyan
    Get-ChildItem $corePath | Select-Object Name, PSIsContainer | Format-Table -AutoSize
} else {
    Write-Host "Core/ 없음" -ForegroundColor Yellow
}

$domainPath = Join-Path $std "Domain"
if (Test-Path $domainPath) {
    Write-Host "=== _Standards/Domain/ ===" -ForegroundColor Cyan
    Get-ChildItem $domainPath | Select-Object Name | Format-Table -AutoSize
} else {
    Write-Host "Domain/ 없음" -ForegroundColor Yellow
}

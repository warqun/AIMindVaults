$VaultRoot = Split-Path $PSScriptRoot -Parent
$base = Join-Path $VaultRoot "_Standards"

Write-Host "=== _Standards/ ===" -ForegroundColor Cyan
Get-ChildItem $base | ForEach-Object { Write-Host ("  " + $_.Name) }

Write-Host "`n=== Core/ ===" -ForegroundColor Cyan
Get-ChildItem (Join-Path $base "Core") | ForEach-Object { Write-Host ("  " + $_.Name) }

Write-Host "`n=== Core/NoteTemplates/ ===" -ForegroundColor Cyan
Get-ChildItem (Join-Path $base "Core\NoteTemplates") | ForEach-Object { Write-Host ("  " + $_.Name) }

Write-Host "`n=== Core/NoteTemplates/Domain/ ===" -ForegroundColor Cyan
Get-ChildItem (Join-Path $base "Core\NoteTemplates\Domain") -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("  " + $_.Name) }

Write-Host "`n=== Core/NoteTemplates/Project/ ===" -ForegroundColor Cyan
Get-ChildItem (Join-Path $base "Core\NoteTemplates\Project") -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("  " + $_.Name) }

Write-Host "`n=== Core/VaultTypes/ ===" -ForegroundColor Cyan
Get-ChildItem (Join-Path $base "Core\VaultTypes") -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("  " + $_.Name) }

Write-Host "`n=== Domain/ ===" -ForegroundColor Cyan
Get-ChildItem (Join-Path $base "Domain") -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("  " + $_.Name) }

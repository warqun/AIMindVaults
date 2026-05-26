# AIMindVaults Visualization — .exe 재빌드 스크립트
# Start-Visualization.ps1 또는 viz.ico 수정 시 재실행.
# ps2exe 는 _build/tools/ 에 동봉되어 있어 외부 의존 0.

$ErrorActionPreference = 'Stop'
$buildDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vizDir   = Split-Path -Parent $buildDir

$ps2exeModule = Join-Path $buildDir 'tools\ps2exe.psm1'
$input        = Join-Path $buildDir 'Start-Visualization.ps1'
$output       = Join-Path $vizDir   'Generate Visualization.exe'
$icon         = Join-Path $vizDir   'viz.ico'

foreach ($p in @($ps2exeModule, $input, $icon)) {
    if (-not (Test-Path $p)) { throw "missing: $p" }
}

Import-Module $ps2exeModule -Force

Invoke-PS2EXE `
    -InputFile $input `
    -OutputFile $output `
    -IconFile $icon `
    -Title 'AIMindVaults Visualization' `
    -Product 'AIMindVaults' `
    -Company 'AIMindVaults' `
    -Version '1.0.0.0' `
    -Description 'AIMindVaults Vault 시각화 런처' `
    -NoConsole `
    -NoConfigfile

$f = Get-Item $output
Write-Host "[OK] built: $($f.FullName) ($([math]::Round($f.Length/1KB,1)) KB)"

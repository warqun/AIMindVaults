# AIMindVaults Visualization — .exe 재빌드 스크립트
#
# 역할:
#   Start-Visualization.ps1 + viz.ico → `Generate Visualization.exe` ps2exe 컴파일.
#   Start-Visualization.ps1 또는 viz.ico 수정 시 본 스크립트 재실행.
#
# ps2exe 의존:
#   _build/tools/ps2exe.psm1 동봉 (MIT, 외부 의존 0).
#
# 빌드 파라미터:
#   - NoConsole: 검은 콘솔 창 안 보임 (앱 모드)
#   - Title / Product / Company / Version / Description 메타
#   - IconFile: viz.ico
#
# 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.16

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

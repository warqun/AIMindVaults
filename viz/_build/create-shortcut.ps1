# AIMindVaults Visualization — 바탕화면 바로가기 생성기
#
# 역할:
#   `Generate Visualization.exe` + `viz.ico` 를 가리키는 바탕화면 .lnk 생성. 사용자 PC 별 1회 실행.
#   .exe 절대 경로를 자기 위치 (`viz/_build/`) 기준으로 추론. 다시 실행하면 기존 .lnk 덮어씀.
#
# 출력:
#   - `<Desktop>/AIMindVaults 시각화.lnk` (한국어 파일명, 영문판 빌드 시 영문 파일명으로 변경 필요)
#   - WindowStyle = 7 (Minimized) — .exe 가 콘솔 없이 실행되어도 깜빡임 방지
#
# 사용자 노출 (한국어):
#   throw 메시지 + Write-Host — "Generate Visualization.exe 가 없습니다", "viz.ico 가 없습니다",
#   "바탕화면 바로가기 생성: ${path}" 등 — § 6.16 카탈로그 참조.
#
# 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.16

$ErrorActionPreference = 'Stop'
$buildDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vizDir   = Split-Path -Parent $buildDir
$exePath  = Join-Path $vizDir 'Generate Visualization.exe'
$icoPath  = Join-Path $vizDir 'viz.ico'

if (-not (Test-Path $exePath)) {
    throw "Generate Visualization.exe 가 없습니다. 먼저 _build\build-exe.ps1 을 실행하세요. ($exePath)"
}
if (-not (Test-Path $icoPath)) {
    throw "viz.ico 가 없습니다. 먼저 _build\build-icon.ps1 을 실행하세요. ($icoPath)"
}

$wsh     = New-Object -ComObject WScript.Shell
$desktop = $wsh.SpecialFolders('Desktop')
$lnkPath = Join-Path $desktop 'AIMindVaults 시각화.lnk'

$lnk = $wsh.CreateShortcut($lnkPath)
$lnk.TargetPath       = $exePath
$lnk.WorkingDirectory = $vizDir
$lnk.IconLocation     = "$icoPath,0"
$lnk.Description      = 'AIMindVaults Vault 시각화 도구'
$lnk.WindowStyle      = 7  # Minimized — .exe 가 콘솔 없이 실행되어도 깜빡임 방지
$lnk.Save()

Write-Host "[OK] 바탕화면 바로가기 생성: $lnkPath"
Write-Host "     대상: $exePath"
Write-Host "     아이콘: $icoPath"

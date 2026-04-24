$ErrorActionPreference = "Stop"

$vaultRoot = Split-Path -Parent $PSScriptRoot

function Resolve-VsCodeCommand {
    $codeCmd = Get-Command code -ErrorAction SilentlyContinue
    if ($codeCmd) { return $codeCmd.Source }

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\\Microsoft VS Code\\bin\\code.cmd"),
        (Join-Path $env:ProgramFiles "Microsoft VS Code\\bin\\code.cmd"),
        (Join-Path ${env:ProgramFiles(x86)} "Microsoft VS Code\\bin\\code.cmd")
    ) | Where-Object { $_ -and (Test-Path $_) }

    if ($candidates.Count -gt 0) { return $candidates[0] }
    return $null
}

$code = Resolve-VsCodeCommand
if ($code) {
    Start-Process -FilePath $code -ArgumentList @("--new-window", $vaultRoot) | Out-Null
} else {
    Write-Warning "VSCode 'code' command not found. Install VSCode or enable the 'code' CLI."
}

<# 
AntiGravity 런처 (사용자 설정 필요)

아래 둘 중 하나를 선택해서 설정하세요.

1) URL 방식 (웹/IDE):
   - `tools/antigravity.url.txt` 파일에 URL 1줄로 저장

2) 실행파일 방식 (데스크탑 IDE):
   - `tools/antigravity.exe.txt` 파일에 exe 경로 1줄로 저장
   - (선택) `tools/antigravity.args.txt` 파일에 args를 한 줄로 저장
#>

$antiGravityUrlPath = Join-Path $PSScriptRoot "antigravity.url.txt"
if (Test-Path $antiGravityUrlPath) {
    $url = (Get-Content -Raw -Encoding UTF8 $antiGravityUrlPath).Trim()
    if ($url) { Start-Process $url | Out-Null }
    exit 0
}

$antiGravityExePathFile = Join-Path $PSScriptRoot "antigravity.exe.txt"
if (Test-Path $antiGravityExePathFile) {
    $exe = (Get-Content -Raw -Encoding UTF8 $antiGravityExePathFile).Trim()
    if (-not $exe) { exit 0 }
    $argsFile = Join-Path $PSScriptRoot "antigravity.args.txt"
    $agArgs = if (Test-Path $argsFile) { (Get-Content -Raw -Encoding UTF8 $argsFile).Trim() } else { $vaultRoot }
    Start-Process -FilePath $exe -ArgumentList $agArgs | Out-Null
    exit 0
}


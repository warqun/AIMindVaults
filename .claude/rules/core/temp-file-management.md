# 임시 파일 관리 (Mandatory)

> 모든 볼트에 동일 적용. 모든 에이전트 공통.

## 규칙

- CLI 명령(yt-dlp, python, ffmpeg 등) 실행 시 임시 파일은 반드시 `$env:TEMP` 하위에 생성한다.
- 볼트 루트 또는 CWD에 임시 파일을 직접 생성하지 않는다.
- 작업 완료 후 임시 폴더/파일을 즉시 삭제한다. 삭제 확인 전 완료 보고 금지.
- 최종 산출물만 대상 볼트의 지정 경로(Contents/ 등)에 저장한다.

## 임시 폴더 패턴

```powershell
$tempDir = Join-Path $env:TEMP "aimind_temp_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force
# ... 작업 수행 ...
Remove-Item -Path $tempDir -Recurse -Force
```

## 무한 재귀 경로 삭제 (Incident Rule)

> 2026-04-08 Incident 기반. clone_vault 등으로 무한 재귀 복사가 발생한 경우.

Windows MAX_PATH(260자) 한계로 일반 삭제 도구가 모두 실패한다. **아래 순서대로 시도**:

### 1순위: PowerShell flatten-and-delete

깊은 하위 폴더를 짧은 경로로 반복 이동(flatten)하여 경로 길이를 줄인 후 삭제:

```powershell
$root = '<폭탄경로>'
$temp = '<폭탄경로의 부모>\_del'

for ($i = 0; $i -lt 500; $i++) {
    $sub = Get-ChildItem -Path $root -Directory -EA SilentlyContinue | Select-Object -First 1
    if (-not $sub) { break }
    $children = Get-ChildItem -Path $sub.FullName -Directory -EA SilentlyContinue
    if ($children) {
        foreach ($child in $children) {
            if (Test-Path $temp) { Remove-Item $temp -Recurse -Force -EA SilentlyContinue }
            Move-Item -LiteralPath $child.FullName -Destination $temp -Force -EA SilentlyContinue
        }
    }
    Get-ChildItem -Path $sub.FullName -File -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue
    Remove-Item -LiteralPath $sub.FullName -Force -Recurse -EA SilentlyContinue
}
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force -EA SilentlyContinue }
if (Test-Path $root) { Remove-Item $root -Recurse -Force -EA SilentlyContinue }
```

### 2순위: robocopy mirror 반복

```powershell
mkdir C:\TEMP_EMPTY
for ($i = 0; $i -lt 1000; $i++) {
    robocopy C:\TEMP_EMPTY "<폭탄경로>" /MIR /R:0 /W:0 /NP /NJH /NJS /NFL /NDL 2>&1 | Out-Null
    if (-not (Test-Path "<폭탄경로>")) { Write-Host "DONE at pass $i"; break }
}
rmdir "<폭탄경로>"; rmdir C:\TEMP_EMPTY
```

### 실패하는 방법 (사용 금지)

7z, `Remove-Item -Recurse`, `cmd /c rd /s /q`, `[System.IO.Directory]::Delete()` — 모두 MAX_PATH 한계로 실패.

### 참조

상세 이슈: Project_AIMindVaults `20260408_clone_vault_재귀복사_폭탄_이슈.md`

## 금지 사항

- 볼트 루트에 `.vtt`, `.json`, `.srt`, `.tmp`, `.log` 등 임시 파일 방치 금지.
- 임시 스크립트(`.py`, `.ps1`)를 볼트 내에 생성 후 방치 금지.
- 정리 실패 시 즉시 사용자에게 보고하고 수동 삭제 요청.

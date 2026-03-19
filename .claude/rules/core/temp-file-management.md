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

## 금지 사항

- 볼트 루트에 `.vtt`, `.json`, `.srt`, `.tmp`, `.log` 등 임시 파일 방치 금지.
- 임시 스크립트(`.py`, `.ps1`)를 볼트 내에 생성 후 방치 금지.
- 정리 실패 시 즉시 사용자에게 보고하고 수동 삭제 요청.

---
description: "Obsidian 노트 열기"
---

# open-note

지정한 Obsidian 볼트의 노트를 연다.

## 파라미터

- `vault`: Obsidian에 등록된 볼트명 (필수)
- `file`: 볼트 기준 상대 파일 경로 (필수)

## 실행

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$vault,
    [Parameter(Mandatory=$true)]
    [string]$file
)

$encodedVault = [System.Uri]::EscapeDataString($vault)
$normalizedFile = $file -replace '\\','/'
$encodedFile = [System.Uri]::EscapeDataString($normalizedFile)

$uri = "obsidian://open?vault=$encodedVault&file=$encodedFile"
Start-Process $uri
```

## 사용 예시

```powershell
# open-note "Project_AIMindVaults" "Contents/Project/plan/AIMindVaults_plan/20260321_인덱싱_트리거_설계.md"
```

## 주의사항

- 한국어 파일명/공백/특수문자는 반드시 URI 인코딩한다.
- 파일 경로는 볼트 루트 기준 상대경로를 사용한다.
- 볼트명 또는 경로가 틀리면 해당 노트를 열지 못한다.

---
description: "Obsidian 볼트 열기"
---

# open-vault

지정한 Obsidian 볼트를 연다.

## 파라미터

- `vault`: Obsidian에 등록된 볼트명 (필수)

## 실행

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$vault
)

$encodedVault = [System.Uri]::EscapeDataString($vault)
$uri = "obsidian://open?vault=$encodedVault"
Start-Process $uri
```

## 사용 예시

```powershell
# open-vault "Project_AIMindVaults"
```

## 주의사항

- 볼트명은 Obsidian에 등록된 이름과 정확히 일치해야 한다.
- 실패 시 볼트명 오탈자 또는 Obsidian 미실행/미설치 가능성을 점검한다.

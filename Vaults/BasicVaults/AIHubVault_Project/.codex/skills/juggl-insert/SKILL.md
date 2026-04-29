---
name: juggl-insert
description: 기존 노트에 Juggl 블록이 없을 때 H1 아래에 삽입하는 절차
---

# Juggl 블록 삽입

> 사용 시점: 기존 노트에 Juggl 블록이 없을 때 추가
> 규칙: `.codex/rules/never-do.md`, `.codex/rules/bulk-edit-safety.md`

## 단일 파일 삽입

```powershell
# 1. 파일 읽기 (UTF-8 고정)
$text = [System.IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)

# 2. 이미 juggl 블록 있으면 스킵
if ($text -match '```juggl') { Write-Host "SKIP: juggl already exists"; return }

# 3. H1 위치 찾기
$lines = $text -split "`n"
$h1Index = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^# ') { $h1Index = $i; break }
}
if ($h1Index -eq -1) { Write-Host "ERROR: H1 not found"; return }

# 4. 파일명에서 확장자 제거
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($path)

# 5. juggl 블록 삽입 (H1 다음 줄)
$jugglBlock = "``````juggl`nlocal: $baseName`n``````"
$newLines = @($lines[0..$h1Index]) + @("", $jugglBlock, "") + @($lines[($h1Index+1)..($lines.Count-1)])
$newText = $newLines -join "`n"

# 6. 쓰기 (BOM 없는 UTF-8)
[System.IO.File]::WriteAllText($path, $newText, [Text.UTF8Encoding]::new($false))
```

## 대량 삽입 (다수 파일)

반드시 5단계 프로토콜 준수 (`.codex/rules/bulk-edit-safety.md`):

```
Step 1: 인코딩 사전 검증
Step 2: Dry-run (파일 목록 출력만)
Step 3: 3개 샘플 먼저 적용
Step 4: 시각 확인 후 전체 실행
Step 5: post-review BAD_COUNT=0 확인
```

제외 대상:
```
Contents/*/temp/**
_STATUS.md
_VAULT-INDEX.md
.codex/**
.claude/**
```

## 불변 조건 확인 (전체 실행 전)

```powershell
# 파일당 juggl 블록 1개 이하인지 검사
$files = Get-ChildItem Contents/**/*.md -Recurse
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)
    $count = ([regex]::Matches($content, '```juggl')).Count
    if ($count -gt 1) { Write-Host "WARN: $($f.Name) has $count juggl blocks" }
}
```

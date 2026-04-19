<#
.SYNOPSIS
    볼트 콘텐츠 인덱서 — Contents/ 크롤링 → JSON 인덱스 생성
.DESCRIPTION
    현재 볼트의 Contents/**/*.md 파일에서 frontmatter, 제목, 헤딩, 요약,
    WikiLink를 추출하여 _tools/data/vault_index.json으로 저장한다.
    AI 에이전트가 관련 노트를 빠르게 찾을 수 있는 메타데이터 인덱스.
.PARAMETER Incremental
    증분 빌드 — mtime/hash 비교 후 변경분만 재파싱 (기본: 전체 빌드)
.PARAMETER Verbose
    상세 로그 출력
.EXAMPLE
    .\vault_index_build.ps1
    .\vault_index_build.ps1 -Incremental
#>

param(
    [switch]$Incremental,
    [switch]$VerboseLog
)

$ErrorActionPreference = "Continue"
$startTime = Get-Date

# ── 경로 자동탐지 ──
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$VaultRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$ContentsDir = Join-Path $VaultRoot "Contents"
$DataDir = Join-Path $VaultRoot "_tools\data"
$IndexPath = Join-Path $DataDir "vault_index.json"

# 볼트명 추출
$VaultName = Split-Path -Leaf $VaultRoot

if (-not (Test-Path $ContentsDir)) {
    Write-Host "[ERROR] Contents/ folder not found: $ContentsDir"
    exit 1
}

# _tools/data/ 폴더 생성
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

# ── Frontmatter 파서 ──
function Parse-Frontmatter {
    param([string]$Content)
    $frontmatter = @{}
    if ($Content -notmatch '(?ms)^---\s*$(.*?)^---\s*$') {
        return $frontmatter
    }
    $yamlBlock = $Matches[1].Trim()
    if (-not $yamlBlock) { return $frontmatter }

    $lines = $yamlBlock -split "`n"
    $currentKey = $null

    foreach ($rawLine in $lines) {
        $line = $rawLine.Trim()
        if (-not $line) { continue }

        if ($line -match '^(.*?)\s*:\s*(.*)$') {
            $key   = $Matches[1].Trim()
            $value = $Matches[2].Trim()

            if ($value -match '^\[(.+)\]$') {
                $frontmatter[$key] = @(($Matches[1] -split ',\s*') | ForEach-Object { $_.Trim('"''') })
                $currentKey = $null
            }
            elseif ($value -eq '' -or $value -eq '|' -or $value -eq '>') {
                $currentKey = $key
                $frontmatter[$key] = @()
            }
            else {
                $frontmatter[$key] = $value.Trim('"''')
                $currentKey = $null
            }
        }
        elseif ($currentKey -and $line -match '^\-\s*(.+)$') {
            $frontmatter[$currentKey] += $Matches[1].Trim('"''')
        }
        elseif ($currentKey) {
            $frontmatter[$currentKey] += $line
        }
    }

    if ($frontmatter.ContainsKey('tags')) {
        if ($frontmatter['tags'] -is [string]) {
            $frontmatter['tags'] = @($frontmatter['tags'])
        }
    }
    return $frontmatter
}

# ── 노트 파싱 ──
function Build-NoteObject {
    param(
        [string]$FilePath,
        [string]$RelativePath,
        [string]$Content,
        [string]$Hash,
        [datetime]$Mtime
    )

    $fm = Parse-Frontmatter $Content
    $lines = $Content -split "`n"

    # Title: 첫 H1
    $title = ""
    foreach ($l in $lines) {
        if ($l.Trim() -match '^#\s+(.+)$') {
            $title = $Matches[1].Trim()
            break
        }
    }

    # Headings: H2/H3
    $headings = @()
    foreach ($l in $lines) {
        if ($l.Trim() -match '^#{2,3}\s+(.+)$') {
            $headings += $Matches[1].Trim()
        }
    }

    # Summary: H1 아래 첫 텍스트 단락 (Juggl 블록, 빈줄 건너뛰기)
    $summary = ""
    $foundH1 = $false
    $inCodeBlock = $false
    foreach ($l in $lines) {
        $trimmed = $l.Trim()
        if (-not $foundH1) {
            if ($trimmed -match '^#\s+') { $foundH1 = $true }
            continue
        }
        # 코드 블록 건너뛰기
        if ($trimmed -match '^```') {
            $inCodeBlock = -not $inCodeBlock
            continue
        }
        if ($inCodeBlock) { continue }
        # 빈줄 건너뛰기
        if (-not $trimmed) { continue }
        # 텍스트 단락 발견
        $summary = $trimmed
        if ($summary.Length -gt 200) {
            $summary = $summary.Substring(0, 200) + "..."
        }
        break
    }

    # WikiLinks: [[target]] 또는 [[target|alias]]
    $linksTo = @()
    $linkMatches = [regex]::Matches($Content, '\[\[([^\]|]+)')
    foreach ($m in $linkMatches) {
        $linkTarget = $m.Groups[1].Value.Trim()
        if ($linkTarget -and ($linksTo -notcontains $linkTarget)) {
            $linksTo += $linkTarget
        }
    }

    # Type
    $noteType = ""
    if ($fm.ContainsKey('type')) { $noteType = $fm['type'] }

    # Tags
    $tags = @()
    if ($fm.ContainsKey('tags')) { $tags = @($fm['tags']) }

    return [pscustomobject]@{
        path      = $RelativePath -replace '\\', '/'
        title     = $title
        type      = $noteType
        tags      = $tags
        headings  = $headings
        summary   = $summary
        links_to  = $linksTo
        links_from = @()
        mtime     = $Mtime.ToString("yyyy-MM-ddTHH:mm:ss")
        hash      = $Hash
    }
}

# ── 제외 판정 ──
$excludeFiles = @('_STATUS.md', '_VAULT-INDEX.md', '_WORKSPACE_VERSION.md')
$excludeTypes = @('index', 'version-log', 'status-hub', 'status')

function Test-ShouldExclude {
    param([string]$RelPath, [string]$NoteType)
    $fileName = Split-Path -Leaf $RelPath
    if ($excludeFiles -contains $fileName) { return $true }
    if ($excludeTypes -contains $NoteType) { return $true }
    # Contents.md (각 폴더 인덱스) 제외
    if ($fileName -eq 'Contents.md') { return $true }
    return $false
}

# ── 기존 인덱스 로드 (증분 빌드용) ──
$existingNotes = @{}
if ($Incremental -and (Test-Path $IndexPath)) {
    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        $rawJson = [System.IO.File]::ReadAllText($IndexPath, $utf8NoBom)
        $existingIndex = $rawJson | ConvertFrom-Json
        foreach ($n in $existingIndex.notes) {
            $existingNotes[$n.path] = $n
        }
        if ($VerboseLog) { Write-Host "[INFO] Loaded existing index: $($existingNotes.Count) notes" }
    }
    catch {
        Write-Host "[WARN] Failed to load existing index, doing full build"
        $existingNotes = @{}
    }
}

# ── 파일 수집 및 파싱 ──
$mdFiles = Get-ChildItem -Path $ContentsDir -Recurse -Filter "*.md" -File
$notes = @()
$stats = @{ new = 0; updated = 0; skipped = 0; excluded = 0 }

foreach ($file in $mdFiles) {
    $relPath = $file.FullName.Substring($VaultRoot.Length + 1) -replace '\\', '/'
    $mtime = $file.LastWriteTimeUtc

    # 증분: mtime 비교
    if ($Incremental -and $existingNotes.ContainsKey($relPath)) {
        $existing = $existingNotes[$relPath]
        $existingMtime = $existing.mtime
        $currentMtime = $mtime.ToString("yyyy-MM-ddTHH:mm:ss")

        if ($existingMtime -eq $currentMtime) {
            # mtime 동일 → 스킵
            $notes += $existing
            $stats.skipped++
            continue
        }
    }

    # 파일 읽기 + 해시
    try {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        $content = [System.IO.File]::ReadAllText($file.FullName, $utf8)
        $hashFull = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
        $hash = $hashFull.Substring(0, 8)
    }
    catch {
        Write-Host "[WARN] Failed to read: $relPath"
        continue
    }

    # 증분: hash 비교 (mtime 다르지만 내용 동일)
    if ($Incremental -and $existingNotes.ContainsKey($relPath)) {
        $existing = $existingNotes[$relPath]
        if ($existing.hash -eq $hash) {
            # 내용 동일, mtime만 갱신
            $existing.mtime = $mtime.ToString("yyyy-MM-ddTHH:mm:ss")
            $notes += $existing
            $stats.skipped++
            continue
        }
    }

    # frontmatter로 타입 확인 후 제외 판정
    $fm = Parse-Frontmatter $content
    $noteType = ""
    if ($fm.ContainsKey('type')) { $noteType = $fm['type'] }

    if (Test-ShouldExclude $relPath $noteType) {
        $stats.excluded++
        if ($VerboseLog) { Write-Host "[SKIP] Excluded: $relPath ($noteType)" }
        continue
    }

    # 파싱
    $noteObj = Build-NoteObject -FilePath $file.FullName -RelativePath $relPath `
        -Content $content -Hash $hash -Mtime $mtime

    $notes += $noteObj

    if ($existingNotes.ContainsKey($relPath)) {
        $stats.updated++
        if ($VerboseLog) { Write-Host "[UPDATE] $relPath" }
    }
    else {
        $stats.new++
        if ($VerboseLog) { Write-Host "[NEW] $relPath" }
    }
}

# ── links_from 역추적 (2차 패스) ──
$linkMap = @{}
foreach ($note in $notes) {
    $noteFileName = [System.IO.Path]::GetFileNameWithoutExtension(($note.path -split '/')[-1])
    $linkMap[$noteFileName] = $note
}
foreach ($note in $notes) {
    foreach ($link in $note.links_to) {
        if ($linkMap.ContainsKey($link)) {
            $target = $linkMap[$link]
            $sourceFileName = [System.IO.Path]::GetFileNameWithoutExtension(($note.path -split '/')[-1])
            if ($target.links_from -notcontains $sourceFileName) {
                $target.links_from += $sourceFileName
            }
        }
    }
}

# ── tag_index 생성 ──
$tagIndex = @{}
foreach ($note in $notes) {
    foreach ($tag in $note.tags) {
        if (-not $tagIndex.ContainsKey($tag)) {
            $tagIndex[$tag] = @()
        }
        $tagIndex[$tag] += $note.path
    }
}

# ── link_graph 생성 ──
$linkGraph = @{}
foreach ($note in $notes) {
    $noteFileName = [System.IO.Path]::GetFileNameWithoutExtension(($note.path -split '/')[-1])
    $linkGraph[$noteFileName] = @($note.links_to)
}

# ── 인덱스 조립 및 저장 ──
$index = [pscustomobject]@{
    vault     = $VaultName
    built     = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    notes     = $notes
    tag_index = $tagIndex
    link_graph = $linkGraph
}

$json = $index | ConvertTo-Json -Depth 6
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($IndexPath, $json, $utf8NoBom)

# ── 결과 출력 ──
$elapsed = ((Get-Date) - $startTime).TotalSeconds
Write-Host ""
Write-Host "======================================"
Write-Host " Vault Index Build Complete"
Write-Host "======================================"
Write-Host " Vault    : $VaultName"
Write-Host " Notes    : $($notes.Count)"
Write-Host " New      : $($stats.new)"
Write-Host " Updated  : $($stats.updated)"
Write-Host " Skipped  : $($stats.skipped)"
Write-Host " Excluded : $($stats.excluded)"
Write-Host " Tags     : $($tagIndex.Count)"
Write-Host " Time     : $([math]::Round($elapsed, 2))s"
Write-Host " Output   : $IndexPath"
Write-Host "======================================"

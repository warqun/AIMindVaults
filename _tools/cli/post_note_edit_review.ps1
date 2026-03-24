param(
  [string]$Root,
  [string]$Scope
)

if (-not $Root) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $Root = (Resolve-Path "$ScriptDir\..\..").Path
}
if (-not $Scope) {
    if (Test-Path (Join-Path $Root "Contents"))      { $Scope = "Contents" }
    elseif (Test-Path (Join-Path $Root "Project"))  { $Scope = "Project" }
    elseif (Test-Path (Join-Path $Root "docs"))     { $Scope = "docs" }
    else { Write-Error "Content folder not found under $Root (Contents/, Project/, docs/)"; exit 1 }
}

$target = Join-Path $Root $Scope
if(-not (Test-Path $target)){
  Write-Error "Scope path not found: $target"
  exit 1
}

$strictUtf8 = [System.Text.UTF8Encoding]::new($false, $true)
$replacement = [char]0xFFFD
$bad = @()

$files = Get-ChildItem -Path $target -Recurse -File -Filter *.md
foreach($f in $files){
  $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
  $utf8Valid = $true
  try {
    $text = $strictUtf8.GetString($bytes)
  } catch {
    $utf8Valid = $false
    $text = ''
  }

  $repCount = 0
  if($utf8Valid){
    $repCount = ([regex]::Matches($text,[regex]::Escape([string]$replacement))).Count
  }

  if(-not $utf8Valid -or $repCount -gt 0){
    $bad += [pscustomobject]@{
      path = $f.FullName
      utf8_valid = $utf8Valid
      replacement_char_count = $repCount
    }
  }
}

"POST_EDIT_REVIEW_SCOPE=$target"
"POST_EDIT_REVIEW_FILES=$($files.Count)"
"POST_EDIT_REVIEW_BAD=$($bad.Count)"
if($bad.Count -gt 0){
  $bad | Sort-Object path | Format-Table -AutoSize
  exit 2
}

"POST_EDIT_REVIEW_OK=1"
exit 0

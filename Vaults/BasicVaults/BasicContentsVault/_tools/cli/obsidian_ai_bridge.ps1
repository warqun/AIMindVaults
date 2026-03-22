param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('vault-info','search','search-context','read','open','append','create','history','history-read','history-restore','diff','plugins-list','plugin-install','post-review')]
  [string]$Action,

  [string]$VaultName,
  [string]$Path,
  [string]$Query,
  [string]$Content,
  [int]$Version = 1,
  [int]$From = 2,
  [int]$To = 1,
  [int]$Limit = 50,
  [string]$PluginId,
  [string]$Scope
)

$ErrorActionPreference='Stop'

$_ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$_VaultRoot = (Resolve-Path "$_ScriptDir\..\..").Path
if (-not $VaultName) {
    $VaultName = Split-Path -Leaf $_VaultRoot
}
if (-not $Scope) {
    if (Test-Path (Join-Path $_VaultRoot "Contents"))      { $Scope = "Contents" }
    elseif (Test-Path (Join-Path $_VaultRoot "Project"))  { $Scope = "Project" }
    elseif (Test-Path (Join-Path $_VaultRoot "docs"))     { $Scope = "docs" }
    else { Write-Error "Content folder not found"; exit 1 }
}

function Invoke-Obsidian {
  param([string[]]$CliArgs)
  & obsidian @CliArgs
}

switch($Action){
  'vault-info' {
    Invoke-Obsidian -CliArgs @('vault',"vault=$VaultName")
  }
  'search' {
    if([string]::IsNullOrWhiteSpace($Query)){ throw 'Query is required for search' }
    $args=@('search',"vault=$VaultName","query=$Query","limit=$Limit")
    if(-not [string]::IsNullOrWhiteSpace($Path)){ $args += "path=$Path" }
    Invoke-Obsidian -CliArgs $args
  }
  'search-context' {
    if([string]::IsNullOrWhiteSpace($Query)){ throw 'Query is required for search-context' }
    $args=@('search:context',"vault=$VaultName","query=$Query","limit=$Limit")
    if(-not [string]::IsNullOrWhiteSpace($Path)){ $args += "path=$Path" }
    Invoke-Obsidian -CliArgs $args
  }
  'read' {
    if([string]::IsNullOrWhiteSpace($Path)){ throw 'Path is required for read' }
    Invoke-Obsidian -CliArgs @('read',"vault=$VaultName","path=$Path")
  }
  'open' {
    $openArgs=@('open',"vault=$VaultName")
    if(-not [string]::IsNullOrWhiteSpace($Path)){ $openArgs += "path=$Path" }
    elseif(-not [string]::IsNullOrWhiteSpace($Query)){ $openArgs += "file=$Query" }
    else { throw 'Path or Query(file name) is required for open' }
    Invoke-Obsidian -CliArgs $openArgs
  }
  'append' {
    if([string]::IsNullOrWhiteSpace($Path)){ throw 'Path is required for append' }
    if($null -eq $Content){ throw 'Content is required for append' }
    Invoke-Obsidian -CliArgs @('append',"vault=$VaultName","path=$Path",("content=" + $Content))
  }
  'create' {
    if([string]::IsNullOrWhiteSpace($Path)){ throw 'Path is required for create' }
    if($null -eq $Content){ $Content='' }
    Invoke-Obsidian -CliArgs @('create',"vault=$VaultName","path=$Path",("content=" + $Content), 'overwrite')
  }
  'history' {
    if([string]::IsNullOrWhiteSpace($Path)){ throw 'Path is required for history' }
    Invoke-Obsidian -CliArgs @('history',"vault=$VaultName","path=$Path")
  }
  'history-read' {
    if([string]::IsNullOrWhiteSpace($Path)){ throw 'Path is required for history-read' }
    Invoke-Obsidian -CliArgs @('history:read',"vault=$VaultName","path=$Path","version=$Version")
  }
  'history-restore' {
    if([string]::IsNullOrWhiteSpace($Path)){ throw 'Path is required for history-restore' }
    Invoke-Obsidian -CliArgs @('history:restore',"vault=$VaultName","path=$Path","version=$Version")
  }
  'diff' {
    if([string]::IsNullOrWhiteSpace($Path)){ throw 'Path is required for diff' }
    Invoke-Obsidian -CliArgs @('diff',"vault=$VaultName","path=$Path","from=$From","to=$To")
  }
  'plugins-list' {
    Invoke-Obsidian -CliArgs @('plugins',"vault=$VaultName",'filter=community','versions','format=tsv')
  }
  'plugin-install' {
    if([string]::IsNullOrWhiteSpace($PluginId)){ throw 'PluginId is required for plugin-install' }
    Invoke-Obsidian -CliArgs @('plugin:install',"vault=$VaultName","id=$PluginId",'enable')
  }
  'post-review' {
    $script = Join-Path (Split-Path -Parent $PSScriptRoot) 'cli\post_note_edit_review.ps1'
    & powershell -ExecutionPolicy Bypass -File $script -Root (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) -Scope $Scope
  }
}

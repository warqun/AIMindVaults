@echo off
rem Sync all AIMindVaults vaults from this root folder.
rem Usage: double-click, or run: "Sync All Vaults.bat" [--dry-run]
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "CLI_DIR=%ROOT%\Vaults\BasicVaults\CoreHub\.sync\_tools\cli-node"
set "CLI=%CLI_DIR%\bin\cli.js"
set "LOG=%ROOT%\sync.log"

if /I "%~1"=="--help" set "AIMV_NO_PAUSE=1"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Node.js 가 필요합니다: https://nodejs.org 1>&2
  if not defined AIMV_NO_PAUSE pause
  exit /b 1
)

if not exist "%CLI%" (
  echo AIMindVaults CLI was not found: "%CLI%" 1>&2
  if not defined AIMV_NO_PAUSE pause
  exit /b 1
)

if not exist "%CLI_DIR%\node_modules" (
  echo Installing CoreHub CLI dependencies...
  echo [%DATE% %TIME%] [CoreHub] npm install... START>> "%LOG%"
  pushd "%CLI_DIR%" >nul
  call npm install --no-audit --no-fund >> "%LOG%" 2>&1
  set "NPM_EXIT=!ERRORLEVEL!"
  popd >nul
  if not "!NPM_EXIT!"=="0" (
    echo npm install failed. See "%LOG%" 1>&2
    if not defined AIMV_NO_PAUSE pause
    exit /b !NPM_EXIT!
  )
)

node "%CLI%" sync-all --root "%ROOT%" %*
set "EXIT_CODE=!ERRORLEVEL!"

if "!EXIT_CODE!"=="0" (
  echo Sync complete. Log: "%LOG%"
) else (
  echo Sync failed with exit code !EXIT_CODE!. Log: "%LOG%" 1>&2
)

if not defined AIMV_NO_PAUSE pause
exit /b !EXIT_CODE!

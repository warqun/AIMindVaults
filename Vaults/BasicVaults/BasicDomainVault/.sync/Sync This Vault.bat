@echo off
rem Sync only this AIMindVaults vault.
rem Usage: double-click from the vault .sync folder, or run: ".sync\Sync This Vault.bat"
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

pushd "%~dp0.." >nul
set "VAULT_ROOT=%CD%"
popd >nul
set "SYNC_DIR=%VAULT_ROOT%\.sync"
set "CLI_DIR=%VAULT_ROOT%\.sync\_tools\cli-node"
set "CLI=%CLI_DIR%\bin\cli.js"
set "LOG=%SYNC_DIR%\sync.log"

if /I "%~1"=="--help" (
  echo Sync This Vault.bat runs pre-sync for the current vault.
  exit /b 0
)

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Node.js 가 필요합니다: https://nodejs.org 1>&2
  pause
  exit /b 1
)

if not exist "%CLI%" (
  echo AIMindVaults CLI was not found: "%CLI%" 1>&2
  pause
  exit /b 1
)

if not exist "%CLI_DIR%\node_modules" (
  echo Installing vault CLI dependencies...
  echo [%DATE% %TIME%] [%~n0] npm install... START>> "%LOG%"
  pushd "%CLI_DIR%" >nul
  call npm install --no-audit --no-fund >> "%LOG%" 2>&1
  set "NPM_EXIT=!ERRORLEVEL!"
  popd >nul
  if not "!NPM_EXIT!"=="0" (
    echo npm install failed. See "%LOG%" 1>&2
    pause
    exit /b !NPM_EXIT!
  )
)

echo Running pre-sync for "%VAULT_ROOT%"...
echo [%DATE% %TIME%] [%~n0] pre-sync... START>> "%LOG%"
node "%CLI%" pre-sync --vault-root "%VAULT_ROOT%" >> "%LOG%" 2>&1
set "EXIT_CODE=!ERRORLEVEL!"
echo [%DATE% %TIME%] [%~n0] pre-sync... EXIT !EXIT_CODE!>> "%LOG%"

if "!EXIT_CODE!"=="0" (
  echo Sync complete. Log: "%LOG%"
) else (
  echo Sync failed with exit code !EXIT_CODE!. Log: "%LOG%" 1>&2
)

pause
exit /b !EXIT_CODE!

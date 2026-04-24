@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

rem ====================================================================
rem  MakeCloneVault.bat — Satellite Vault Clone Launcher (Windows, no AI)
rem ====================================================================
rem  Location : Vaults/BasicVaults/MakeCloneVault.bat  (single copy)
rem  Scope    : operates on sibling folders under BasicVaults/
rem
rem  What it does:
rem    1. Scans siblings of this script for folders containing
rem       .sync/hub-marker.json (= Hub candidates).
rem    2. Displays a numbered menu; user picks a Hub.
rem    3. Prompts for parent folder + new vault name.
rem    4. Invokes Node CLI: `clone --hub <pickedHub>` — the CLI auto
rem       resolves the clone source via the Hub's hub-marker.defaultTemplate
rem       (falls back to BasicContentsVault sibling if unset).
rem    5. CLI writes .sync/hub-source.json so the new satellite is bound.
rem
rem  Paths:
rem    %~dp0              = this script's directory (BasicVaults/ with \)
rem    CLI                = CoreHub's Node CLI (single Core source of truth)
rem ====================================================================

set "BASICVAULTS_ROOT=%~dp0"
set "CLI=%BASICVAULTS_ROOT%CoreHub\.sync\_tools\cli-node\bin\cli.js"

if not exist "%CLI%" (
    echo [ERROR] CLI not found at: %CLI%
    echo         Make sure CoreHub exists next to this launcher.
    pause
    exit /b 1
)

echo.
echo ====================================================
echo  AIMindVaults — Satellite Vault Clone Launcher
echo  Location : %BASICVAULTS_ROOT%
echo ====================================================
echo.
echo  Scanning Hub candidates (folders with .sync/hub-marker.json)...
echo.

rem Build numbered list of Hubs
set /a HUB_COUNT=0
for /d %%D in ("%BASICVAULTS_ROOT%*") do (
    if exist "%%D\.sync\hub-marker.json" (
        set /a HUB_COUNT+=1
        set "HUB_!HUB_COUNT!=%%~nxD"
        echo   !HUB_COUNT!^) %%~nxD
    )
)

if %HUB_COUNT%==0 (
    echo [ERROR] No Hub folders found under %BASICVAULTS_ROOT%
    pause
    exit /b 1
)

echo.
set /p HUB_IDX="Select Hub (1-%HUB_COUNT%): "

rem Validate selection is within range
if "%HUB_IDX%"=="" goto invalid_hub
if %HUB_IDX% LSS 1 goto invalid_hub
if %HUB_IDX% GTR %HUB_COUNT% goto invalid_hub

call set "HUB_NAME=%%HUB_%HUB_IDX%%%"
set "HUB_PATH=%BASICVAULTS_ROOT%%HUB_NAME%"

echo   Selected: %HUB_NAME%
echo.

set /p PARENT_PATH="Parent folder for new vault (e.g. C:\AIMindVaults\Vaults\Domains_Infra): "
set /p VAULT_NAME="New vault name: "

if "%VAULT_NAME%"=="" (
    echo [ERROR] Vault name is required.
    pause
    exit /b 1
)

set "TARGET_PATH=%PARENT_PATH%\%VAULT_NAME%"

echo.
echo  Hub    : %HUB_PATH%
echo  Target : %TARGET_PATH%
echo  Source : resolved by CLI from Hub's hub-marker.defaultTemplate
echo.

node "%CLI%" clone --target-path "%TARGET_PATH%" --project-name "%VAULT_NAME%" --hub "%HUB_PATH%"

if errorlevel 1 (
    echo.
    echo [FAILED] Clone failed. See error above.
) else (
    echo.
    echo [DONE] Vault cloned and bound to Hub.
    echo  Next: Open Obsidian -^> Vault manager -^> Open folder as vault
    echo        Select: %TARGET_PATH%
)
echo.
pause
exit /b 0

:invalid_hub
echo [ERROR] Invalid Hub selection: %HUB_IDX%
pause
exit /b 1

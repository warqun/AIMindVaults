@echo off
chcp 65001 >nul
echo.
echo ====================================================
echo  Obsidian Vault Clone Launcher
echo ====================================================
echo.

set /p PARENT_PATH="Parent folder (e.g. C:\AIMindVaults\Vaults): "
set /p VAULT_NAME="New vault name (e.g. MyDomainVault): "

if "%VAULT_NAME%"=="" (
    echo [ERROR] Vault name is required.
    pause
    exit /b 1
)

set "TARGET_PATH=%PARENT_PATH%\%VAULT_NAME%"

echo.
echo  Will clone to: %TARGET_PATH%
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0..\Vaults\BasicVaults\BasicContentsVault\.sync\clone_vault.ps1" -TargetPath "%TARGET_PATH%" -ProjectName "%VAULT_NAME%"

echo.
pause

@echo off
setlocal

where codex >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 'codex' command not found in PATH.
  echo Install or add Codex CLI to PATH, then retry.
  exit /b 1
)

echo Launching Codex CLI...
start "Codex CLI" cmd /k "codex"
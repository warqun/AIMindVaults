@echo off
setlocal

where claude >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 'claude' command not found in PATH.
  echo Install or add Claude CLI to PATH, then retry.
  exit /b 1
)

echo Launching Claude CLI...
start "Claude CLI" cmd /k "claude"
@echo off
setlocal

where gemini >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 'gemini' command not found in PATH.
  echo Install or add Gemini CLI to PATH, then retry.
  exit /b 1
)

echo Launching Gemini CLI...
start "Gemini CLI" cmd /k "gemini"
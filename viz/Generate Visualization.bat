@echo off
REM AIMindVaults Visualization — Windows .bat 진입 (콘솔 표시 모드, .vbs 가 콘솔 숨김 wrapper)
REM Chrome/Edge --app 백그라운드 + node server.js foreground. 영문화: 매니페스트 § 6.16.
chcp 65001 >nul
title AIMindVaults Visualization
cd /d "%~dp0"
set "URL=http://localhost:8765"

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

echo [AIMindVaults] 시각화 서버 시작 중...
echo 이 창을 닫으면 시각화가 종료됩니다.
echo.

if defined BROWSER (
    start "" /B powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process -FilePath '%BROWSER%' -ArgumentList '--app=%URL%'"
) else (
    start "" /B powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process '%URL%'"
)

node "%~dp0server.js"

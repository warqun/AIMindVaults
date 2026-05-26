#!/bin/bash
cd "$(dirname "$0")"
URL="http://localhost:8765"

echo "[AIMindVaults] 시각화 서버 시작 중..."
echo "이 창을 닫으면 시각화가 종료됩니다."
echo

(
  sleep 4
  if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app="$URL" >/dev/null 2>&1 &
  elif command -v chromium >/dev/null 2>&1; then
    chromium --app="$URL" >/dev/null 2>&1 &
  elif command -v microsoft-edge >/dev/null 2>&1; then
    microsoft-edge --app="$URL" >/dev/null 2>&1 &
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  fi
) &

node "$(dirname "$0")/server.js"

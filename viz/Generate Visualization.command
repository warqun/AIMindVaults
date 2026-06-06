#!/bin/bash
# AIMindVaults Visualization — macOS .command 진입 (Finder 더블클릭)
# Chrome/Edge --app 백그라운드 (4s 후) + node server.js foreground. 영문화: 매니페스트 § 6.16.
cd "$(dirname "$0")"
URL="http://localhost:8765"

echo "[AIMindVaults] 시각화 서버 시작 중..."
echo "이 창을 닫으면 시각화가 종료됩니다."
echo

(
  sleep 4
  if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$URL"
  elif [ -d "/Applications/Microsoft Edge.app" ]; then
    open -na "Microsoft Edge" --args --app="$URL"
  else
    open "$URL"
  fi
) &

node "$(dirname "$0")/server.js"

#!/bin/bash

echo "________Start of x86.sh________"

rm /tmp/.X0-lock &>/dev/null || true

startx -- -nocursor &
sleep 10

#unclutter -display :0 -idle 0.1 &

xrandr -o left

amixer sset Speaker off
amixer sset Master 100% on


python -u -m app.cache
python -u -m app.main &

sleep 5

chromium http://localhost:8081 \
  --kiosk \
  --no-sandbox \
  --ignore-gpu-blacklist \
  --window-position=0,0 --window-size=1080,1920 --test-type \
  --enable-native-gpu-memory-buffers --force-gpu-rasterization --enable-oop-rasterization --enable-zero-copy \
  --autoplay-policy=no-user-gesture-required \
  --disable-pinch \
  --disable-dev-shm-usage \
  --check-for-update-interval=31449600 --simulate-outdated-no-au='Tue, 31 Dec 2099 23:59:59 GMT'


echo "________End of x86.sh________"

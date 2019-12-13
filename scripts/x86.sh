#!/bin/bash

echo "________Start of x86.sh________"

rm /tmp/.X0-lock &>/dev/null || true

startx &
sleep 10

unclutter -display :0 -idle 0.1 &

xrandr -o left
#TODO: Use touch input name from `xinput list`
#xinput set-prop "eGalax Inc. eGalaxTouch EXC3000-1990-46.00.00" --type=float "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1
xinput set-prop "TSD Touchsystems TSD USB Touchscreen" --type=float "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1

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
  --autoplay-policy=no-user-gesture-required

echo "________End of x86.sh________"

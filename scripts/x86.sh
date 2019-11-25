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


python -u -m app.cache
python -u -m app.main &

sleep 5

chromium http://localhost:8081 \
  --kiosk \
  --no-sandbox \
  --ignore-gpu-blacklist \
  --window-position=0,0 --window-size=1080,1920 --test-type
  --enable-native-gpu-memory-buffers --force-gpu-rasterization --enable-oop-rasterization --enable-zero-copy


# USEFUL CHROMIUM FLAGS:

# Goes fullscreen, disables right clicks and devtools
#  --kiosk

# Running as root:
#  --no-sandbox

# https://software.intel.com/en-us/articles/software-vs-gpu-rasterization-in-chromium
# --enable-native-gpu-memory-buffers --force-gpu-rasterization --enable-oop-rasterization --enable-zero-copy

# Intel Kaby Lake Graphics are blacklisted:
# --ignore-gpu-blacklist

# All required for matching screen size:
# --window-position=0,0 --window-size=1920,1080 --test-type

# Logging:
# --enable-logging=stderr --v=1


# Use this for remote debug:
# chromium --no-sandbox --disable-gpu --remote-debugging-address=0.0.0.0 --remote-debugging-port=9222 --headless http://localhost:8080


echo "________End of x86.sh________"

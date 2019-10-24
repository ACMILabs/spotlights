#!/bin/bash

rm /tmp/.X0-lock &>/dev/null || true

startx &
sleep 10

# Hide the cursor
unclutter -display :0 -idle 0.1 &

python -u app/cache.py
python -u app/main.py &

sleep 5

chromium --app=http://localhost:8080 --enable-accelerated-video --enable-accelerated-mjpeg-decode --ignore-gpu-blacklist --enable-gpu-rasterization --enable-zero-copy --enable-native-gpu-memory-buffers --test-type --start-fullscreen --user-data-dir --kiosk --disable-application-cache --incognito --no-sandbox

# Use this for remote debug
#chromium --no-sandbox --disable-gpu --remote-debugging-address=0.0.0.0 --remote-debugging-port=9222 --headless http://localhost:8080

# For debugging
echo "Chromium browser exited unexpectedly."
free -h
echo "End of pi.sh ..."

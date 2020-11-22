#!/bin/bash

echo "________Start of x86.sh________"

# Remove the X server lock file so ours starts cleanly
rm /tmp/.X0-lock &>/dev/null || true

# Set the display to use
export DISPLAY=:0

# Set the DBUS address for sending around system messages
export DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket

# Set XDG_RUNTIME_DIR
mkdir -pv ~/.cache/xdgr
export XDG_RUNTIME_DIR=$PATH:~/.cache/xdgr

# Create Xauthority
touch /root/.Xauthority

# Start desktop manager
echo "Starting X"
startx -- -nocursor &

# TODO: work out how to detect X has started
sleep 10

# Print all of the current displays used by running processes
echo "Displays in use after starting X"
DISPLAYS=`ps -u $(id -u) -o pid= | \
  while read pid; do
    cat /proc/$pid/environ 2>/dev/null | tr '\0' '\n' | grep '^DISPLAY=:'
  done | sort -u`
echo $DISPLAYS

# If DISPLAYS doesn't include 0.0 set the new display
if [[ $DISPLAYS == *"0.0"* ]]; then
  echo "Display includes 0.0 so let's launch..."
else
  LAST_DISPLAY=`ps -u $(id -u) -o pid= | \
    while read pid; do
      cat /proc/$pid/environ 2>/dev/null | tr '\0' '\n' | grep '^DISPLAY=:'
    done | sort -u | tail -n1`
  echo "0.0 is missing, so setting display to: ${LAST_DISPLAY}"
  export $LAST_DISPLAY
fi

# Prevent blanking and screensaver
xset s off -dpms

# Hide the cursor
unclutter -idle 0.1 &

# Rotate display if env variable is set [normal, inverted, left or right]
if [[ ! -z "$ROTATE_DISPLAY" ]]; then
  echo "Rotating display ${ROTATE_DISPLAY}"
  (sleep 3 && xrandr -o $ROTATE_DISPLAY) &
fi

# Rotate touch input to match the display rotation
if [[ "$ROTATE_DISPLAY" == "left" ]]; then
  # For Samsung PM43F-BC (detect your touch display with `xinput -list`)
  xinput set-prop "Advanced Silicon S.A. SamsungUSBTouch_CAP_043" --type=float "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1
fi

if [[ "$ROTATE_DISPLAY" == "right" ]]; then
  # For Samsung PM43F-BC (detect your touch display with `xinput -list`)
  xinput set-prop "Advanced Silicon S.A. SamsungUSBTouch_CAP_043" --type=float "Coordinate Transformation Matrix" 0 1 0 -1 0 1 0 0 1
fi

# Turn off speaker, and turn on headphone audio
amixer sset Speaker off
amixer sset Master 100% on

# Start Spotlights app
python -u -m app.cache
python -u -m app.main &

sleep 5

# Cleanup bad Chromium exits to avoid popups
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
sed -i 's/"exit_type": "Crashed"/"exit_type": "Normal"/' ~/.config/chromium/Default/Preferences

chromium \
  --app=http://localhost:8081 \
  --kiosk \
  --disable-infobars \
  --no-sandbox \
  --ignore-gpu-blacklist \
  --window-position=0,0 --window-size=1080,1920 --test-type \
  --enable-native-gpu-memory-buffers --force-gpu-rasterization --enable-oop-rasterization --enable-zero-copy \
  --autoplay-policy=no-user-gesture-required \
  --disable-pinch \
  --disable-dev-shm-usage \
  --check-for-update-interval=31449600 --simulate-outdated-no-au='Tue, 31 Dec 2099 23:59:59 GMT'

# For debugging
echo "Chromium browser exited unexpectedly."
free -h

# Restart the container
echo "Restarting container..."
curl -H "Content-Type: application/json" -d "{\"serviceName\": \"$BALENA_SERVICE_NAME\"}" "$BALENA_SUPERVISOR_ADDRESS/v2/applications/$BALENA_APP_ID/restart-service?apikey=$BALENA_SUPERVISOR_API_KEY"

echo "________End of x86.sh________"

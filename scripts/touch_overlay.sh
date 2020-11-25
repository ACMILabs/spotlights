#!/bin/bash

echo "________Start of touch_overlay.sh________"

while true; do

  # Check if "Advanced Silicon S.A. SamsungUSBTouch_CAP_043" is in xinput
  if [[ xinput -list | grep -q 'Advanced Silicon S.A. SamsungUSBTouch_CAP_043' ]]; then

    if [[ "$DEBUG" == "true" ]]; then
      echo "xinput contains 'Advanced Silicon S.A. SamsungUSBTouch_CAP_043'"
    fi

    # Check if the right touch settings are present for the display rotation
    if [[ "$ROTATE_DISPLAY" == left && xinput list-props 10 | grep -q '0.000000, -1.000000, 1.000000, 1.000000, 0.000000, 0.000000, 0.000000, 0.000000, 1.000000' ]]; then

      if [[ "$DEBUG" == "true" ]]; then
        echo "xinput for rotation $ROTATE_DISPLAY looks good, sleeping..."
      fi

    else

      echo "xinput missing the correct settings for rotation $ROTATE_DISPLAY, setting them now..."
      # For Samsung PM43F-BC (detect your touch display with `xinput -list`)
      # xinput set-prop "Advanced Silicon S.A. SamsungUSBTouch_CAP_043" --type=float "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1
      # Note: on the Samsung PM43F-BC there are two pointer devices, so set them by ID 10 & 11:
      xinput set-prop 10 --type=float "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1
      xinput set-prop 11 --type=float "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1

    fi

    if [[ "$ROTATE_DISPLAY" == right && xinput list-props 10 | grep -q '0.000000, 1.000000, 0.000000, -1.000000, 0.000000, 1.000000, 0.000000, 0.000000, 1.000000' ]]; then

      if [[ "$DEBUG" == "true" ]]; then
        echo "xinput for rotation $ROTATE_DISPLAY looks good, sleeping..."
      fi

    else

      echo "xinput missing the correct settings for rotation $ROTATE_DISPLAY, setting them now..."
      # For Samsung PM43F-BC (detect your touch display with `xinput -list`)
      # xinput set-prop "Advanced Silicon S.A. SamsungUSBTouch_CAP_043" --type=float "Coordinate Transformation Matrix" 0 1 0 -1 0 1 0 0 1
      # Note: on the Samsung PM43F-BC there are two pointer devices, so set them by ID 10 & 11:
      xinput set-prop 10 --type=float "Coordinate Transformation Matrix" 0 1 0 -1 0 1 0 0 1
      xinput set-prop 11 --type=float "Coordinate Transformation Matrix" 0 1 0 -1 0 1 0 0 1

    fi

  else

    echo "xinput doesn't contain the touch overlay for 'Advanced Silicon S.A. SamsungUSBTouch_CAP_043', rebooting this device in 5 seconds..."
    sleep 5
    # Reboot device
    echo "Rebooting device..."
    curl -H "Content-Type: application/json" "$BALENA_SUPERVISOR_ADDRESS/v1/reboot?apikey=$BALENA_SUPERVISOR_API_KEY"

  fi

  # Wait 30 seconds before checking again
  sleep 30

done

echo "________End of touch_overlay.sh________"

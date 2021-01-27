#!/bin/bash

echo "________Start of first_boot.sh________"

# TODO: If boot-count == 1, restart the container
if [[  ]]; then
  # Restart the container
    echo "This is the first boot, so restarting the spotlights container to resolve the lack of touch input..."
    curl -H "Content-Type: application/json" -d "{\"serviceName\": \"$BALENA_SERVICE_NAME\"}" "$BALENA_SUPERVISOR_ADDRESS/v2/applications/$BALENA_APP_ID/restart-service?apikey=$BALENA_SUPERVISOR_API_KEY"
fi

echo "________End of first_boot.sh________"

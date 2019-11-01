Spotlights
==========

An interactive video player that loads a playlist of videos from XOS specified by the XOS_PLAYLIST_ID.
It autoplays by default and a user is able to select from the menu of videos to begin playing them.
This is intended for use on an Optiplex 7050 with a touchscreen.

## Dev installation

- Pull museumos and run `docker-compose up --build` from its root directory
- From the spotlights root directory, run `cd development && docker-compose up --build`, then open localhost:8081 in Chrome.

## Push to Balena

`balena push s__spotlights-x86`

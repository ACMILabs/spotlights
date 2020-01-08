Spotlights
==========

An interactive video player that loads a playlist of videos from XOS specified by the XOS_PLAYLIST_ID.
It autoplays by default and a user is able to select from the menu of videos to begin playing them.
This is intended for use on an Optiplex 7050 with a touchscreen.

## Run with virtualenv for dev

```
$ virtualenv .venv
$ pip install -r requirements/prod.txt
$ cp config.tmpl.env config.env
$ mkdir .venv/data
$ echo CACHE_DIR=.venv/data >> config.env
$ env `cat config.env | xargs` python -u app/cache.py
$ env `cat config.env | xargs` python -u app/main.py
```

## Run the development container

- Pull XOS and run `docker-compose up --build` from its root directory
- From the spotlights root directory, run `cd development && docker-compose up --build`, then open localhost:8081 in Chrome.

## Run tests locally

To run the python tests:

`$ cd development` and `$ docker-compose up --build` and `$ docker exec -it spotlights make linttest`

To run the javascript tests:

`$ cd testing` and `$ docker-compose up --build` and `$ docker exec -it javascripttests make linttestjs`

## Push to Balena

`balena push s__spotlights-x86`

## Chromium flags
Goes fullscreen, disables right clicks and devtools
 --kiosk

Running as root:
 --no-sandbox

Faster but unstable: https://software.intel.com/en-us/articles/software-vs-gpu-rasterization-in-chromium 
--enable-native-gpu-memory-buffers --force-gpu-rasterization --enable-oop-rasterization --enable-zero-copy

Intel Kaby Lake Graphics are blacklisted:
--ignore-gpu-blacklist

All required for matching screen size:
--window-position=0,0 --window-size=1920,1080 --test-type

Logging:
--enable-logging=stderr --v=1

Enable html5 video autoplay without setting muted
--autoplay-policy=no-user-gesture-required

Remote debug:
chromium --no-sandbox --disable-gpu --remote-debugging-address=0.0.0.0 --remote-debugging-port=9222 --headless http://localhost:8080



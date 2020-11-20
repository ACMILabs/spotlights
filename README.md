Spotlights
==========

An interactive video player that loads a playlist of videos from XOS specified by the XOS_PLAYLIST_ID.
It autoplays by default and a user is able to select from the menu of videos to begin playing them.
This is intended for use on an Optiplex 7050 with a touchscreen.

## Features

* Takes an XOS playlist of videos and labels
* Renders and autoplays the first video, showing its label and the next couple of labels
* When a visitor selects a different label, the corresponding video is played
* Receives tap information from a lens reader and attaches the appropriate label data, before forwarding the Tap message to XOS API

## Hardware

* 1080p Touchscreen in portrait orientation
* Dell Optiplex 3070 Micro i3 small form factor PC
* [A set of lens reader hardware](https://github.com/ACMILabs/lens-reader) if lens reader integration is needed

## Screen rotation

If the screen is installed upside down, use this environment variable in `config.env` to rotate it:

* `ROTATE_DISPLAY=left`

Options are: `normal, inverted, left or right`

## Run a development server with docker

* Run `cp config.tmpl.env config.env`
* Run `cd development`
* Run `docker-compose up --build`
* Open a browser and visit: http://localhost:8081

## Run Javascript tests with docker

* Run `cd testing`
* Run `docker-compose up --build`
* In another Terminal run `docker exec -it javascripttests make linttestjs`

## Run Python tests with docker

* Run `cd development`
* Run `docker-compose up --build`
* In another Terminal run `docker exec -it spotlights make linttest`

## Installation via Balena

* Clone this repo.
* Add the Balena remote
* Git push your changes
* Push your edits to Balena `git push balena master`

## Run with virtualenv for dev

```
$ virtualenv .venv
$ pip install -r requirements/prod.txt
$ cp config.tmpl.env config.env
$ mkdir .venv/data
$ echo CACHE_DIR=`pwd`/.venv/data/ >> config.env
$ env `cat config.env | xargs` python -u app/cache.py
$ env `cat config.env | xargs` python -u app/main.py
```

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

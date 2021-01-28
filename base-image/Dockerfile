# base-image for python on any machine using a template variable,
# see more about dockerfile templates here: https://www.balena.io/docs/learn/develop/dockerfile/
FROM balenalib/intel-nuc-python:3.7-buster-run

# To rebuild:
# docker build -t acmilabs/spotlights:v2 .
# docker push acmilabs/spotlights:v2

# use `install_packages` if you need to install dependencies,
# for instance if you need git, just uncomment the line below.
RUN install_packages \
  lsb-release xserver-xorg-video-intel \
  xinit lxsession desktop-file-utils \
  matchbox-keyboard \
  unclutter \
  # Support for Accuview gTouch 21.5" touchscreen
  xserver-xorg-input-evdev \
  xinput \
  chromium \
  x11-xserver-utils \
  git \
  alsa-utils \
  zstd \
  jq



COPY . /code/

# BEGIN ARCH CHROME-VAAPI

# Chrome for Linux doesn't run the gpu video decoder.
# This uses chromium compiled with the vaapi flag, from the Arch AUR.

# TODO: Try without preinstalling and purging debian chromium
RUN apt purge chromium

RUN apt update
RUN apt install xz-utils

RUN tar -xf /code/lib/chromium-vaapi-80.0.3987.106-2-x86_64.pkg.tar.zst

RUN tar -xf /code/lib/icu-65.1-3-x86_64.pkg.tar.zst

RUN tar -xf /code/lib/libwebp-1.1.0-1-x86_64.pkg.tar.zst

RUN tar -xf /code/lib/libjpeg-turbo-2.0.4-1-x86_64.pkg.tar.zst

RUN tar -xf /code/lib/harfbuzz-2.6.4-2-x86_64.pkg.tar.xz

RUN tar -xf /code/lib/re2-1:20200101-1-x86_64.pkg.tar.zst

RUN tar -xvf /code/lib/glibc-2.31-1-x86_64.pkg.tar.zst
RUN ls -la /usr/lib/libm.so.6
RUN rm /lib/x86_64-linux-gnu/libm.so.6
RUN ln -s /usr/lib/libm.so.6 /lib/x86_64-linux-gnu/libm.so.6

RUN tar -xf /code/lib/gcc-libs-9.2.1+20200130-2-x86_64.pkg.tar.zst
RUN rm /usr/lib/x86_64-linux-gnu/libstdc++.so.6
RUN ln -s /usr/lib/libstdc++.so.6 /usr/lib/x86_64-linux-gnu/libstdc++.so.6

RUN tar -xf /code/lib/freetype2-2.10.1-2-x86_64.pkg.tar.zst
RUN rm /usr/lib/x86_64-linux-gnu/libfreetype.so.6
RUN ln -s /usr/lib/libfreetype.so.6 /usr/lib/x86_64-linux-gnu/libfreetype.so.6

RUN tar -xf /code/lib/libva-intel-driver-2.4.0-1-x86_64.pkg.tar.xz
RUN ln -s /usr/lib/dri/i965_drv_video.so /usr/lib/x86_64-linux-gnu/dri/i965_drv_video.so

RUN tar -xf /code/lib/libvpx-1.8.2-1-x86_64.pkg.tar.xz

RUN tar -xf /code/lib/libva-2.6.1-1-x86_64.pkg.tar.zst
RUN rm /usr/lib/x86_64-linux-gnu/libva-drm.so.2
RUN rm /usr/lib/x86_64-linux-gnu/libva-x11.so.2
RUN rm /usr/lib/x86_64-linux-gnu/libva.so.2
RUN ln -s /usr/lib/libva-drm.so.2.500.0 /usr/lib/x86_64-linux-gnu/libva-drm.so.2
RUN ln -s /usr/lib/libva-wayland.so.2.500.0 /usr/lib/x86_64-linux-gnu/libva-wayland.so.2
RUN ln -s /usr/lib/libva-x11.so.2.500.0 /usr/lib/x86_64-linux-gnu/libva-x11.so.2
RUN ln -s /usr/lib/libva.so.2.500.0 /usr/lib/x86_64-linux-gnu/libva.so.2

# END ARCH CHROME-VAAPI

import json.decoder
import os
import re
from urllib.parse import urlparse

import requests
import sentry_sdk

XOS_API_ENDPOINT = os.getenv('XOS_API_ENDPOINT')
XOS_PLAYLIST_ID = os.getenv('XOS_PLAYLIST_ID', '1')
SENTRY_ID = os.getenv('SENTRY_ID')

sentry_sdk.init(dsn=SENTRY_ID)

CACHE_DIR = '/data/'


def create_cache():
    """
    Fetches a playlist, saves the images and videos to the CACHE_DIR;
    Converts srt subs to vtt, inlines them as plaintext in the playlist json, which is saved in this file's directory.
    """
    print('in cache')
    try:
        playlist_json = requests.get(f'{XOS_API_ENDPOINT}playlists/{XOS_PLAYLIST_ID}/').json()

        caption_replacements = [
            (re.compile(r'(\d\d:\d\d:\d\d),(\d\d\d)'), r'\1.\2'),
            (re.compile(r'{([ibu])}'), r'<\1>'),
            (re.compile(r'{\/([ibu])}'), r'</\1>'),
            (re.compile(r'{\\[a-zA-Z0-9]+}'), ''),  # Remove SubStation Alpha tags
        ]

        old_files = os.listdir(CACHE_DIR)

        for label in playlist_json['playlist_labels']:
            # Cache video
            if 'resource' in label and label['resource']:
                name = urlparse(label['resource']).path.split('/')[-1]
                if name in old_files:
                    old_files.remove(name)

                if not os.path.isfile(CACHE_DIR+name):
                    print('Downloading: ' + label['resource'])
                    response = requests.get(label['resource'])
                    with open(CACHE_DIR + name, 'wb') as cache_file:
                        cache_file.write(response.content)
                label['resource'] = '/cache/' + name

            # Cache image
            image_url = label['label']['works'][0]['image']
            name = urlparse(image_url).path.split('/')[-1]
            if name in old_files:
                old_files.remove(name)

            if not os.path.isfile(CACHE_DIR+name):
                print('Downloading: ' + image_url)
                response = requests.get(image_url)
                with open(CACHE_DIR + name, 'wb') as cache_file:
                    cache_file.write(response.content)

            label['image'] = '/cache/' + name
            del label['label']['works']

            # Convert and save subs
            if 'subtitles' in label and label['subtitles']:
                buf = requests.get(label['subtitles']).text
                for match_expr, replace_expr in caption_replacements:
                    buf = match_expr.sub(replace_expr, buf)
                label['subtitles'] = 'WEBVTT\n\n' + buf

        for old_file in old_files:
            os.remove(CACHE_DIR + old_file)

        with open(f'playlist_{XOS_PLAYLIST_ID}.json', 'w') as outfile:
            json.dump(playlist_json, outfile)

    except (requests.exceptions.HTTPError, requests.exceptions.ConnectionError) as exception:
        sentry_sdk.capture_exception(exception)
        print(f'Error downloading playlist JSON from XOS: {exception}')
        raise exception


if __name__ == '__main__':
    create_cache()

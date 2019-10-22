import json
import os
import requests
import sentry_sdk
import re
from urllib.parse import urlparse

XOS_API_ENDPOINT = os.getenv('XOS_API_ENDPOINT')
XOS_PLAYLIST_ID = os.getenv('XOS_PLAYLIST_ID', 1)
SENTRY_ID = os.getenv('SENTRY_ID')

sentry_sdk.init(dsn=SENTRY_ID)

CACHE_DIR = '/data/'

try:
    playlist_json = requests.get(f'{XOS_API_ENDPOINT}playlists/{XOS_PLAYLIST_ID}/').json()

    caption_replacements = [
        (re.compile(r'(\d\d:\d\d:\d\d),(\d\d\d)'), r'\1.\2'),
        (re.compile(r'{([ibu])}'), r'<\1>'),
        (re.compile(r'{\/([ibu])}'), r'</\1>'),
        (re.compile(r'{\\[a-zA-Z0-9]+}'), ''),# Remove SubStation Alpha tags
    ]

    old_files = os.listdir(CACHE_DIR)

    for i, label in enumerate(playlist_json['playlist_labels']):
        if 'resource' in label and label['resource']:
            name = urlparse(label['resource']).path.split('/')[-1]
            if name in old_files:
                old_files.remove(name)

            if not os.path.isfile(CACHE_DIR+name):
                print('Downloading: '+label['resource'])
                response = requests.get(label['resource'])
                with open(CACHE_DIR+name, 'wb') as f:
                    f.write(response.content)
                label['resource'] = '/cache/'+name

        if 'subtitles' in label and label['subtitles']:
            buf = requests.get(label['subtitles']).text
            for p, r in caption_replacements:
                buf = p.sub(r, buf)
            label['subtitles'] = "WEBVTT\n\n"+buf

    for x in old_files:
        os.remove(CACHE_DIR+x)

    with open(f'playlist_{XOS_PLAYLIST_ID}.json', 'w') as outfile:
        json.dump(playlist_json, outfile)

except (requests.exceptions.HTTPError, requests.exceptions.ConnectionError) as e:
    print(f'Error downloading playlist JSON from XOS: {e}')
    sentry_sdk.capture_exception(e)



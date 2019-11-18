import datetime
import json
import os
from unittest.mock import patch

import pytest
from peewee import SqliteDatabase

from app.main import Label

from app.cache import create_cache

XOS_PLAYLIST_ID = os.environ['XOS_PLAYLIST_ID']

@pytest.fixture
def database():
    """
    Setup the test database.
    """
    test_db = SqliteDatabase(':memory:')
    test_db.bind([Label], bind_refs=False, bind_backrefs=False)
    test_db.connect()
    test_db.create_tables([Label])

    Label.create(
        datetime=datetime.datetime.now().timestamp(),
        playlist_id=10,
        label_id=10,
    )


def test_label(database):
    """
    Test the Label class initialises.
    """
    timestamp = datetime.datetime.now().timestamp()

    label = Label.create(
        datetime=timestamp,
        playlist_id=1,
        label_id=1,
    )
    assert label
    assert label.datetime is timestamp



class MockJsonResponse:
    def __init__(self, data, status_code):
        self.content = json.loads(data)
        self.status_code = status_code
    def json(self):
        return self.content

class MockBinaryResponse:
    def __init__(self, data):
        self.content = data
        self.status_code = 200

class MockTextResponse:
    def __init__(self, data):
        self.text = data
        self.status_code = 200



def mocked_requests_get(*args, **kwargs):
    if '/api/playlists/' in args[0]:
        with open('tests/data/playlist.json', 'r') as file_obj:
            return MockJsonResponse(file_obj.read(), 200)

    if '.mp4' in args[0]:
        with open('tests/data/sample.mp4', 'rb') as file_obj:
            return MockBinaryResponse(file_obj.read())

    if '.jpg' in args[0]:
        with open('tests/data/sample.jpg', 'rb') as file_obj:
            return MockBinaryResponse(file_obj.read())

    if '.srt' in args[0]:
        with open('tests/data/sample.srt', 'r') as file_obj:
            return MockTextResponse(file_obj.read())

    raise Exception("No mocked sample data for request: "+args[0])


def mocked_requests_post(*args, **kwargs):
    if 'https://' in args[0] and '/api/taps/' in args[0]:
        with open('tests/data/xos_tap.json', 'r') as f:
            return MockJsonResponse(f.read(), 201)

    raise Exception("No mocked sample data for request: "+args[0])




@patch('requests.post', side_effect=mocked_requests_post)
def test_route_collect_item(mocked_requests_post, client):
    """
    Test that the collect a tap route forwards the expected data to XOS.
    """

    with open('tests/data/lens_tap.json', 'r') as f:
        lens_tap_data = f.read()

    response = client.post('/api/taps/', data=lens_tap_data, headers={'Content-Type': 'application/json'})
    assert response.json["nfc_tag"]["short_code"] == "nbadbb"
    assert response.status_code == 201


@patch('requests.get', side_effect=mocked_requests_get)
def test_cache(capsys):
    """
    Test the cache downloads and saves subs, images and videos
    """
    # capsys.disabled forwards stdout and stderr
    with capsys.disabled():
        create_cache()
        with open('playlist_'+XOS_PLAYLIST_ID+'.json', 'r') as f:
            playlist = json.loads(f.read())['playlist_labels']
        assert len(playlist) == 2
        assert playlist[0]['label']['title'] == 'Placeholder video 1'


def test_index_renders(client):
    """
    Test that the index route renders the expected data.
    """

    response = client.get('/')

    assert response.status_code == 200
    assert b'<!doctype html>' in response.data
    assert b'<div id="root">' in response.data
    assert b'<script src="/static/index.js">' in response.data

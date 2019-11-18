import datetime
import json
import os
from unittest.mock import patch

import pytest
from peewee import SqliteDatabase

from app.main import Label

from app.cache import create_cache

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
    def __init__(self, data):
        self.content = json.loads(data)
        self.status_code = 200
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
            return MockJsonResponse(file_obj.read())

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



@patch('requests.get', side_effect=mocked_requests_get)
def test_cache(capsys):
    """
    Test the cache downloads and saves subs, images and videos
    """
    # capsys.disabled forwards stdout and stderr
    with capsys.disabled():
        create_cache()


def test_index_renders(client):
    """
    Test that the index route renders the expected data.
    """

    response = client.get('/')

    assert response.status_code == 200
    assert b'<!doctype html>' in response.data
    assert b'<div id="root">' in response.data
    assert b'<script src="/static/index.js">' in response.data

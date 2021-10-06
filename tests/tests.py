import datetime
import json
from unittest.mock import MagicMock, patch

import pytest

from app.cache import create_cache
from app.main import HasTapped, Label


@pytest.mark.usefixtures('database')
def test_label():
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
    if '/api/playlists/1/' in args[0]:
        with open('tests/data/playlist.json', 'r', encoding='utf-8') as file_obj:
            return MockJsonResponse(file_obj.read(), 200)

    if '.mp4' in args[0]:
        with open('tests/data/sample.mp4', 'rb') as file_obj:
            return MockBinaryResponse(file_obj.read())

    if '.jpg' in args[0]:
        with open('tests/data/sample.jpg', 'rb') as file_obj:
            return MockBinaryResponse(file_obj.read())

    if '.srt' in args[0]:
        with open('tests/data/sample.srt', 'r', encoding='utf-8') as file_obj:
            return MockTextResponse(file_obj.read())

    raise Exception("No mocked sample data for request: "+args[0])


def mocked_requests_post(*args, **kwargs):
    if '/api/taps/' in args[0]:
        with open('tests/data/xos_tap.json', 'r', encoding='utf-8') as taps_file:
            return MockJsonResponse(taps_file.read(), 201)
    if '/api/bad-uri/' in args[0]:
        return MockJsonResponse('{}', 404)

    raise Exception("No mocked sample data for request: "+args[0])


@patch('requests.post', MagicMock(side_effect=mocked_requests_post))
def test_route_collect_item(client):
    """
    Test that the collect a tap route forwards the expected data to XOS.
    """

    with open('tests/data/lens_tap.json', 'r', encoding='utf-8') as taps_file:
        lens_tap_data = taps_file.read()

    response = client.post('/api/taps/', data=lens_tap_data, headers={'Content-Type': 'application/json'})
    assert response.json["lens_short_code"] == "lens12"
    assert response.status_code == 201


@patch('requests.get', MagicMock(side_effect=mocked_requests_get))
def test_cache(capsys):
    """
    Test the cache downloads and saves subs, images and videos
    """
    # capsys.disabled forwards stdout and stderr
    with capsys.disabled():
        create_cache()
        with open('/data/playlist_1.json', 'r', encoding='utf-8') as playlist_cache:
            playlist = json.loads(playlist_cache.read())['playlist_labels']
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


@pytest.mark.usefixtures('database')
@patch('app.main.XOS_TAPS_ENDPOINT', 'https://xos.acmi.net.au/api/taps/')
@patch('requests.post', MagicMock(side_effect=mocked_requests_post))
def test_tap_received_xos_created(client):
    """
    Test that a tap is successfully created and has_tapped processes correctly
    """

    with open('tests/data/lens_tap.json', 'r', encoding='utf-8') as taps_file:
        lens_tap_data = taps_file.read()

    response = client.post(
        '/api/taps/',
        data=lens_tap_data,
        headers={'Content-Type': 'application/json'}
    )

    assert response.status_code == 201

    has_tapped = HasTapped.get_or_none(tap_processing=1)
    assert has_tapped.has_tapped == 1
    assert has_tapped.tap_successful == 1


@pytest.mark.usefixtures('database')
@patch('app.main.XOS_TAPS_ENDPOINT', 'https://xos.acmi.net.au/api/bad-uri/')
@patch('requests.post', MagicMock(side_effect=mocked_requests_post))
def test_tap_received_xos_error(client):
    """
    Test that a tap fails correctly for an XOS error
    """

    with open('tests/data/lens_tap.json', 'r', encoding='utf-8') as taps_file:
        lens_tap_data = taps_file.read()

    response = client.post(
        '/api/taps/',
        data=lens_tap_data,
        headers={'Content-Type': 'application/json'}
    )

    assert response.status_code == 400

    has_tapped = HasTapped.get_or_none(tap_processing=1)
    assert has_tapped.has_tapped == 1
    assert has_tapped.tap_successful == 0


@pytest.mark.usefixtures('database')
@patch('requests.post', MagicMock(side_effect=mocked_requests_post))
def test_tap_received_still_processing_error(client):
    """
    Test that if an old tap is still being processed by the UI, new taps are still created
    """
    has_tapped = HasTapped.get_or_none(tap_processing=0)
    has_tapped.tap_processing = 1
    has_tapped.save()

    with open('tests/data/lens_tap.json', 'r', encoding='utf-8') as taps_file:
        lens_tap_data = taps_file.read()

    response = client.post(
        '/api/taps/',
        data=lens_tap_data,
        headers={'Content-Type': 'application/json'}
    )

    assert response.status_code == 201

import json
import os
import time

import requests
import sentry_sdk
from flask import (Flask, Response, jsonify, render_template, request,
                   send_from_directory)
from flask_cors import CORS, cross_origin
from peewee import CharField, IntegerField, Model, SqliteDatabase
from playhouse.shortcuts import model_to_dict
from sentry_sdk.integrations.flask import FlaskIntegration

AUTH_TOKEN = os.environ['AUTH_TOKEN']
SENTRY_ID = os.environ.get('SENTRY_ID')
# print("TODO: set up a sentry ID")
XOS_API_ENDPOINT = os.environ['XOS_API_ENDPOINT']
XOS_PLAYLIST_ID = os.environ['XOS_PLAYLIST_ID']

CACHE_DIR = os.getenv('CACHE_DIR', '/data/')

sentry_sdk.init(dsn=SENTRY_ID, integrations=[FlaskIntegration()])

app = Flask(__name__)  # pylint: disable=C0103
CORS(app)
db = SqliteDatabase('label.db')  # pylint: disable=C0103


class HTTPError(Exception):
    def __init__(self, message, status_code=400, payload=None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        error = dict(self.payload or ())
        error['message'] = self.message
        return error


@app.errorhandler(HTTPError)
def handle_http_error(error):
    """
    Format error for response.
    """
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    sentry_sdk.capture_exception(error)
    return response


class Label(Model):
    datetime = CharField(primary_key=True)
    label_id = IntegerField()
    playlist_id = IntegerField()

    class Meta:
        database = db


class HasTapped(Model):
    has_tapped = IntegerField()

    class Meta:  # pylint: disable=R0903
        database = db


def render_spotlights_playlist():
    # Read in the cached JSON
    with open(f'{CACHE_DIR}playlist_{XOS_PLAYLIST_ID}.json', encoding='utf-8') as json_file:
        json_data = json.load(json_file)

    return render_template(
        'index.html',
        playlist_json=json_data
    )


def render_error_screen():
    return render_template('no_playlist.html')


@app.route('/')
def index():
    try:
        return render_spotlights_playlist()
    except FileNotFoundError:
        return render_error_screen()


@app.route('/api/labels/', methods=['POST'])
def select_label():
    """
    Save the Label ID that was selected to a local database with the Date, and Playlist ID.
    """
    label_selected = dict(request.get_json())

    # Save the label selected to the database
    label = Label.create(
        datetime=label_selected['datetime'],
        playlist_id=XOS_PLAYLIST_ID,
        label_id=label_selected.get('label_id', 0),
    )
    # Clear out other messages beyond the last 5
    delete_records = Label.delete().where(
        Label.datetime.not_in(Label.select(Label.datetime).order_by(Label.datetime.desc()).limit(5))
    )
    delete_records.execute()

    return jsonify(model_to_dict(label))


@app.route('/api/taps/', methods=['POST'])
@cross_origin()
def collect_item():
    """
    Collect a tap and forward it on to XOS with the label ID.
    """
    has_tapped = HasTapped.get_or_none(has_tapped=0)
    has_tapped.has_tapped = 1
    has_tapped.save()
    xos_tap_endpoint = f'{XOS_API_ENDPOINT}taps/'
    xos_tap = dict(request.get_json())
    record = model_to_dict(Label.select().order_by(Label.datetime.desc()).get())
    xos_tap['label'] = record.pop('label_id', None)
    xos_tap.setdefault('data', {})['playlist_info'] = record
    headers = {'Authorization': 'Token ' + AUTH_TOKEN}
    response = requests.post(xos_tap_endpoint, json=xos_tap, headers=headers)
    if response.status_code != requests.codes['created']:
        raise HTTPError('Could not save tap to XOS.')
    return response.json(), response.status_code


def event_stream():
    while True:
        time.sleep(0.1)
        has_tapped = HasTapped.get_or_none(has_tapped=1)
        if has_tapped:
            has_tapped.has_tapped = 0
            has_tapped.save()
            yield 'data: {}\n\n'


@app.route('/api/tap-source/')
def tap_source():
    return Response(event_stream(), mimetype="text/event-stream")


@app.route('/cache/<path:filename>')
def cache(filename):
    return send_from_directory(CACHE_DIR, filename)


if __name__ == '__main__':
    db.create_tables([Label, HasTapped])
    HasTapped.create(has_tapped=0)
    app.run(host='0.0.0.0', port=8081, threaded=True)

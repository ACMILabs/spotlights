import json
import os
import sqlite3
import requests
from flask import Flask, jsonify, render_template, request, send_from_directory
from peewee import CharField, IntegerField, Model, SqliteDatabase
from playhouse.shortcuts import model_to_dict
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

from errors import HTTPError

XOS_API_ENDPOINT = os.getenv('XOS_API_ENDPOINT')
AUTH_TOKEN = os.getenv('AUTH_TOKEN')
XOS_PLAYLIST_ID = os.getenv('XOS_PLAYLIST_ID', 1)
SENTRY_ID = os.getenv('SENTRY_ID')

# Setup Sentry
sentry_sdk.init(
    dsn=SENTRY_ID,
    integrations=[FlaskIntegration()]
)

app = Flask(__name__)
cached_playlist_json = f'playlist_{XOS_PLAYLIST_ID}.json'

# instantiate the peewee database
db = SqliteDatabase('label.db')


class Label(Model):
    datetime = CharField(primary_key=True)
    label_id = IntegerField()
    playlist_id = IntegerField()
    class Meta:
        database = db


@app.errorhandler(HTTPError)
def handle_http_error(error):
    """
    Format error for response.
    """
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    sentry_sdk.capture_exception(error)
    return response


@app.route('/')
def playlist():
    # Read in the cached JSON
    with open(cached_playlist_json, encoding='utf-8') as json_file:
        json_data = json.load(json_file)

    return render_template(
        'index.html',
        playlist_json=json_data
    )


@app.route('/api/playlist_json/')
def playlist_json():
    # Read in the cached JSON
    with open(cached_playlist_json, encoding='utf-8') as json_file:
        json_data = json.load(json_file)
    
    return jsonify(json_data)


@app.route('/api/labels/', methods=['POST'])
def select_label():
    """
    Save the Label ID that was selected to a local database with the Date, and Playlist ID.
    """
    label_selected = dict(request.get_json())

    # Save the label selected to the database
    label = Label.create(
        datetime = label_selected['datetime'],
        playlist_id = XOS_PLAYLIST_ID,
        label_id = label_selected.get('label_id', 0),
    )
    # Clear out other messages beyond the last 5
    delete_records = Label.delete().where(
        Label.datetime.not_in(Label.select(Label.datetime).order_by(Label.datetime.desc()).limit(5))
    )
    delete_records.execute()

    return jsonify(model_to_dict(label))


@app.route('/api/taps', methods=['POST'])
def collect_item():
    """
    Collect a tap and forward it on to XOS with the label ID.
    """
    xos_tap_endpoint = f'{XOS_API_ENDPOINT}taps/'
    xos_tap = dict(request.get_json())
    record = model_to_dict(Label.select().order_by(Label.datetime.desc()).get())
    xos_tap['label'] = record.pop('label_id', None)
    xos_tap.setdefault('data', {})['playlist_info'] = record
    headers = {'Authorization': 'Token ' + AUTH_TOKEN}
    response = requests.post(xos_tap_endpoint, json=xos_tap, headers=headers)
    if response.status_code != requests.codes['created']:
        raise HTTPError('Could not save tap to XOS.')
    return jsonify(xos_tap), response.status_code

@app.route('/cache/<path:filename>')
def cache(filename):
    return send_from_directory('/data/', filename)

if __name__ == '__main__':
    db.create_tables([Label])
    app.run(host='0.0.0.0', port=8080)

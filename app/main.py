import json
import os

import requests
import sentry_sdk
from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_cors import CORS, cross_origin
from peewee import CharField, IntegerField, Model, SqliteDatabase
from playhouse.shortcuts import model_to_dict
from sentry_sdk.integrations.flask import FlaskIntegration

AUTH_TOKEN = os.environ['AUTH_TOKEN']
SENTRY_ID = os.environ.get('SENTRY_ID')
# print("TODO: set up a sentry ID")
XOS_API_ENDPOINT = os.environ['XOS_API_ENDPOINT']
XOS_PLAYLIST_ID = os.environ['XOS_PLAYLIST_ID']

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


@app.route('/')
def index():
    # Read in the cached JSON
    with open(f'playlist_{XOS_PLAYLIST_ID}.json', encoding='utf-8') as json_file:
        json_data = json.load(json_file)

    return render_template(
        'index.html',
        playlist_json=json_data
    )


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
    xos_tap_endpoint = f'{XOS_API_ENDPOINT}taps/'
    xos_tap = dict(request.get_json())
    record = model_to_dict(Label.select().order_by(Label.datetime.desc()).get())
    xos_tap['label'] = record.pop('label_id', None)
    xos_tap.setdefault('data', {})['playlist_info'] = record
    headers = {'Authorization': 'Token ' + AUTH_TOKEN}
    response = requests.post(xos_tap_endpoint, json=xos_tap, headers=headers)
    if response.status_code != requests.codes['created']:
        raise HTTPError('Could not save tap to XOS.')
    return jsonify(response.content), response.status_code


@app.route('/cache/<path:filename>')
def cache(filename):
    return send_from_directory('/data/', filename)


if __name__ == '__main__':
    db.create_tables([Label])
    app.run(host='0.0.0.0', port=8081)

#!/bin/bash

python -u -m app.cache

export FLASK_ENV=development
python -u -m app.main

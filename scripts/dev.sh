#!/bin/bash

python -u app/cache.py

export FLASK_ENV=development
python -u app/main.py

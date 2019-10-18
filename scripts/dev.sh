#!/bin/bash

rm -f app/static/cache/*
export FLASK_ENV=development
python -u app/main.py

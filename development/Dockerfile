FROM balenalib/intel-nuc-python:3.7-buster-run

RUN install_packages apt-utils g++ build-essential

ENV PYTHONUNBUFFERED 1

COPY ./requirements.txt /code/requirements.txt
RUN pip install -Ur /code/requirements.txt
COPY . /code/
WORKDIR /code/

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential curl \
  && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3005
# Default command serves the Flask API with gunicorn (production WSGI server),
# using the app-factory. The Celery worker overrides this in docker-compose with:
#   celery -A app.celery_app worker --loglevel=info
# For local dev without gunicorn you can still run: python main.py
CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:3005", "--timeout", "120", "main:create_application()"]

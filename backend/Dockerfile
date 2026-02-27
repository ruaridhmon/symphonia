FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git tini curl \
    && rm -rf /var/lib/apt/lists/*

ARG GITHUB_TOKEN

COPY requirements.txt .
RUN set -eux; \
    if [ -n "${GITHUB_TOKEN:-}" ]; then \
      git config --global url."https://${GITHUB_TOKEN}:x-oauth-basic@github.com/".insteadOf "https://github.com/"; \
    fi; \
    pip install --no-cache-dir -r requirements.txt gunicorn "uvicorn[standard]"; \
    rm -f /root/.gitconfig

COPY . .

ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["sh", "-c", "gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:${PORT:-8000}"]

EXPOSE 8000

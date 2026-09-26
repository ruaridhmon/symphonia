FROM python:3.12-slim
WORKDIR /app
COPY evaluation/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
ENV TIKTOKEN_CACHE_DIR=/app/tokenizer-cache
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"
COPY evaluation /app/evaluation
ENV PYTHONUNBUFFERED=1 MPLBACKEND=Agg
CMD ["python", "-m", "evaluation.cloud"]

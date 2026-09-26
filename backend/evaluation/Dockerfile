FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir google-cloud-storage matplotlib numpy scipy
COPY evaluation /app/evaluation
ENV PYTHONUNBUFFERED=1 MPLBACKEND=Agg
CMD ["python", "-m", "evaluation.cloud"]

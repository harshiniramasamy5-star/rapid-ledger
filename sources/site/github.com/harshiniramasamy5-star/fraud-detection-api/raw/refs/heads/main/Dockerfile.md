# Source: https://github.com/harshiniramasamy5-star/fraud-detection-api/raw/refs/heads/main/Dockerfile

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD \["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"\]
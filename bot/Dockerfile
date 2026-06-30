# HuggingFace Spaces Dockerfile for progtype Telegram bot
# https://huggingface.co/docs/hub/spaces-sdks-docker

FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bot code
COPY bot.py .

# HuggingFace Spaces expects the app to listen on port 7860 by default,
# but our bot uses polling (no HTTP server). We'll start a minimal HTTP
# health-check server on 7860 to satisfy the platform's liveness checks,
# while the bot itself runs in background.
ENV PYTHONUNBUFFERED=1

# Health check endpoint (so HF Spaces doesn't kill the container)
RUN cat > /app/health.py <<'EOF'
from http.server import BaseHTTPRequestHandler, HTTPServer
import threading, os, subprocess

def start_health_server():
    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'progtype-bot running')
        def log_message(self, *a): pass
    HTTPServer(('0.0.0.0', 7860), H).serve_forever()

if __name__ == '__main__':
    threading.Thread(target=start_health_server, daemon=True).start()
    # Run the bot in the main thread
    subprocess.run(['python', 'bot.py'])
EOF

CMD ["python", "/app/health.py"]

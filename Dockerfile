FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Build the Flask backend and serve the application
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy built frontend assets
COPY --from=frontend-builder /app/dist ./dist

# Copy backend files
COPY backend/ ./backend/

# Set environment variables
ENV PORT=8080
ENV FLASK_APP=backend/app.py
ENV PYTHONPATH=/app:/app/backend

EXPOSE 8080

# Run Flask server via Gunicorn
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 1 --threads 8 --timeout 120 backend.app:app"]

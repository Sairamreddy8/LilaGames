#!/bin/sh

# Ensure DATABASE_URL is present
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Please provide a PostgreSQL connection string."
  exit 1
fi

echo "Running Nakama migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

echo "Starting Nakama server..."
exec /nakama/nakama \
  --config /nakama/data/nakama-config.yml \
  --database.address "$DATABASE_URL" \
  --socket.server_key "${NAKAMA_SERVER_KEY:-production-server-key}" \
  --runtime.http_key "${NAKAMA_HTTP_KEY:-production-http-key}" \
  --cors.origins "*"

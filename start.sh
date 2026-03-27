#!/bin/sh
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Use the full DATABASE_URL directly (Nakama 3.x handles postgresql:// URIs)
export NAKAMA_DATABASE_ADDRESS="$DATABASE_URL"

# Simpler masked log
echo "Connecting to database URL: ${DATABASE_URL%:*}:****@${DATABASE_URL#*@}"

export NAKAMA_CORS_ORIGINS="*"
export NAKAMA_SOCKET_SERVER_KEY="${NAKAMA_SERVER_KEY:-production-server-key}"
export NAKAMA_RUNTIME_HTTP_KEY="${NAKAMA_HTTP_KEY:-production-http-key}"

echo "Running migrations..."
/nakama/nakama migrate up

echo "Starting Nakama..."
exec /nakama/nakama --config /nakama/data/nakama-config.yml

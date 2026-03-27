#!/bin/sh

# Log startup for debugging
echo "--- NAKAMA STARTUP SCRIPT ---"
echo "Check for DATABASE_URL..."

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

echo "Applying CORS origins: *"
# We set both env var and command line flag for maximum reliability
export NAKAMA_CORS_ORIGINS="*"

echo "Starting Nakama..."
exec /nakama/nakama \
  --config /nakama/data/nakama-config.yml \
  --database.address "$DATABASE_URL" \
  --socket.server_key "${NAKAMA_SERVER_KEY:-production-server-key}" \
  --runtime.http_key "${NAKAMA_HTTP_KEY:-production-http-key}" \
  --cors.origins "*"

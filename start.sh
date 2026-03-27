#!/bin/sh
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Strip the protocol prefix 
DB_ADDR="${DATABASE_URL#*://}"

# Ensure we use the PORT provided by Railway
APP_PORT="${PORT:-7350}"

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Starting Nakama on port $APP_PORT with explicit CORS flags..."
exec /nakama/nakama \
  --config /nakama/data/nakama-config.yml \
  --database.address "$DB_ADDR" \
  --socket.port "$APP_PORT" \
  --cors.origins "*" \
  --cors.allowed_headers "Authorization,Content-Type,User-Agent" \
  --cors.exposed_headers "Authorization,Content-Type,User-Agent" \
  --socket.server_key "${NAKAMA_SERVER_KEY:-production-server-key}" \
  --runtime.http_key "${NAKAMA_HTTP_KEY:-production-http-key}"

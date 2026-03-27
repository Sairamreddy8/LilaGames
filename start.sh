#!/bin/sh
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Strip the protocol prefix (postgresql:// or postgres://) 
DB_ADDR="${DATABASE_URL#*://}"

echo "Running migrations..."
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Starting Nakama with explicit flags..."
exec /nakama/nakama \
  --config /nakama/data/nakama-config.yml \
  --database.address "$DB_ADDR" \
  --cors.origins "*" \
  --socket.server_key "${NAKAMA_SERVER_KEY:-production-server-key}" \
  --runtime.http_key "${NAKAMA_HTTP_KEY:-production-http-key}"

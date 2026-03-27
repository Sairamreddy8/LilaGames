#!/bin/sh
set -e
echo "--- NAKAMA STARTUP SCRIPT ---"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

# Strip the protocol for the migrate command
DB_ADDR="${DATABASE_URL#*://}"

# Export variables for the server process (kept as fallback)
export NAKAMA_SOCKET_PORT="${PORT:-7350}"
export NAKAMA_LOGGER_LEVEL="INFO"
export NAKAMA_CORS_ORIGINS="*"

echo "Step 1: Running migrations..."
/nakama/nakama migrate up --database.address "$DB_ADDR"

echo "Step 2: Starting Nakama server..."
# Using flags because Nakama sometimes ignores env vars when a config file is present
exec /nakama/nakama \
  --config /nakama/data/nakama-config.yml \
  --database.address "$DB_ADDR" \
  --database.dns_scan_interval_sec 60 \
  --socket.port "${PORT:-7350}" \
  --socket.server_key "${NAKAMA_SERVER_KEY:-production-server-key}" \
  --runtime.http_key "${NAKAMA_HTTP_KEY:-production-http-key}"
